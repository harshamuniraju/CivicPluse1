import os
import argparse
import logging
import json
import pandas as pd
import joblib
import numpy as np
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ---------------- Utility functions ----------------

def guess_columns(df):
    text_col, label_col = None, None
    for c in df.columns:
        cl = c.lower()
        if any(k in cl for k in ["text", "complaint", "comment", "message", "body"]):
            text_col = c
        if any(k in cl for k in ["label", "sentiment", "target", "class"]):
            label_col = c
    return text_col, label_col


def normalize_labels(y):
    y = y.astype(str).str.lower()
    mapping = {
        "negative": 0, "neg": 0, "-1": 0,
        "positive": 1, "pos": 1, "+1": 1,
        "neutral": 2, "neu": 2
    }
    y = y.map(mapping)
    y = y.astype(int)

    if not set(y.unique()).issubset({0, 1, 2}):
        raise ValueError("Labels must be 0,1,2 only")

    return y


def clean_text_series(s):
    def clean_one(text):
        text = str(text).lower()
        text = re.sub(r"http\S+|www\.\S+", " ", text)
        text = re.sub(r"[^a-z0-9\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    return s.fillna("").apply(clean_one)


def evaluate(name, y_true, y_pred):
    acc = accuracy_score(y_true, y_pred)
    macro_f1 = f1_score(y_true, y_pred, average="macro")
    logging.info("%s accuracy=%.4f macro_f1=%.4f", name, acc, macro_f1)
    logging.info("\n%s", classification_report(y_true, y_pred))
    return {"accuracy": float(acc), "macro_f1": float(macro_f1)}

# ---------------- Main training ----------------

def main(args):
    workdir = os.path.dirname(__file__)
    train_path = args.train
    test_path = args.test

    train_df = pd.read_excel(train_path)
    text_col, label_col = guess_columns(train_df)

    if text_col is None or label_col is None:
        raise RuntimeError("Could not detect text/label columns")

    X = clean_text_series(train_df[text_col])
    y = normalize_labels(train_df[label_col])

    X_tr, X_val, y_tr, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # ---------- TF-IDF ----------
    vect = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        min_df=2,
        max_features=30000,
        sublinear_tf=True,
    )
    Xtr_tfidf = vect.fit_transform(X_tr)
    Xv_tfidf = vect.transform(X_val)

    tfidf_lr = LogisticRegression(max_iter=2000, class_weight="balanced")
    tfidf_lr.fit(Xtr_tfidf, y_tr)
    tfidf_metrics = evaluate("TFIDF", y_val, tfidf_lr.predict(Xv_tfidf))

    # ---------- Embeddings ----------
    emb_model = SentenceTransformer(args.embedding_model)
    Xtr_emb = emb_model.encode(X_tr.tolist(), convert_to_numpy=True)
    Xv_emb = emb_model.encode(X_val.tolist(), convert_to_numpy=True)

    emb_lr = LogisticRegression(max_iter=3000, class_weight="balanced")
    emb_lr.fit(Xtr_emb, y_tr)
    emb_metrics = evaluate("Embedding", y_val, emb_lr.predict(Xv_emb))

    # ---------- Refit both models on full data ----------
    X_all_counts = vect.fit_transform(X)
    tfidf_lr.fit(X_all_counts, y)
    joblib.dump(vect, os.path.join(workdir, "vectorizer.joblib"))
    joblib.dump(tfidf_lr, os.path.join(workdir, "model_counts.joblib"))

    X_all_emb = emb_model.encode(X.tolist(), convert_to_numpy=True)
    emb_lr.fit(X_all_emb, y)
    emb_model.save(os.path.join(workdir, "emb_model"))
    joblib.dump(emb_lr, os.path.join(workdir, "model_embedding.joblib"))

    # ---------- Select default serving model ----------
    if emb_metrics["macro_f1"] > tfidf_metrics["macro_f1"]:
        feature_mode = "embedding"
        final_model = emb_lr
    else:
        feature_mode = "counts"
        final_model = tfidf_lr

    joblib.dump(final_model, os.path.join(workdir, "model.joblib"))

    # ---------- Test ----------
    test_metrics = None
    if test_path:
        test_df = pd.read_excel(test_path)
        Xt = clean_text_series(test_df[text_col])
        yt = normalize_labels(test_df[label_col])

        if feature_mode == "embedding":
            Xt_f = emb_model.encode(Xt.tolist(), convert_to_numpy=True)
        else:
            Xt_f = vect.transform(Xt)

        test_metrics = evaluate("TEST", yt, final_model.predict(Xt_f))

    # ---------- Metadata ----------
    metadata = {
        "best_model": "LogisticRegression",
        "feature_mode": feature_mode,
        "embedding_model": args.embedding_model,
        "label_map": {
            "0": "negative",
            "1": "positive",
            "2": "neutral"
        },
        "selection_metric": "macro_f1",
        "artifacts": {
            "counts_model": "model_counts.joblib",
            "embedding_model": "model_embedding.joblib",
            "vectorizer": "vectorizer.joblib",
            "embedding_dir": "emb_model"
        },
        "validation": {
            "counts": tfidf_metrics,
            "embedding": emb_metrics
        },
        "test": test_metrics
    }

    with open(os.path.join(workdir, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    logging.info("Training complete. Artifacts saved.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", required=True)
    parser.add_argument("--test")
    parser.add_argument("--embedding-model", default="all-MiniLM-L6-v2")
    main(parser.parse_args())

