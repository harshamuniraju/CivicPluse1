from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import os
import json
import re

# ---------------- Request schema ----------------

class Item(BaseModel):
    text: str

# ---------------- Heuristic rules ----------------

POSITIVE_WORDS = {
    "good", "great", "nice", "clean", "smooth", "proper", "timely", "stable", "reliable",
    "safe", "working", "improved", "improvement", "maintained", "excellent", "better"
}

NEGATIVE_WORDS = {
    "bad", "poor", "worse", "worst", "dirty", "unsafe", "broken", "damaged", "pothole", "potholes",
    "delay", "delayed", "irregular", "blocked", "overflowing", "smell", "smelly", "issue", "problem",
    "complaint", "cut", "cuts", "pollution", "traffic", "congestion", "slow", "failure"
}

NEUTRAL_WORDS = {
    "okay", "ok", "average", "manageable", "acceptable", "occasionally", "moderate", "normal"
}


def rule_based_label(text: str):
    t = text.lower().strip()
    tokens = re.findall(r"[a-z0-9']+", t)
    if not tokens:
        return None

    pos_count = sum(1 for tok in tokens if tok in POSITIVE_WORDS)
    neg_count = sum(1 for tok in tokens if tok in NEGATIVE_WORDS)
    neu_count = sum(1 for tok in tokens if tok in NEUTRAL_WORDS)

    # Negation handling for positive words (e.g., "not good").
    if re.search(r"\bnot\s+(good|great|nice|clean|safe|working|reliable|stable)\b", t):
        neg_count += 2

    if pos_count > 0 and neg_count == 0 and neu_count == 0:
        return "positive"
    if neg_count > 0 and pos_count == 0 and neu_count == 0:
        return "negative"
    if neu_count > 0 and pos_count == 0 and neg_count == 0:
        return "neutral"

    if pos_count >= neg_count + 2:
        return "positive"
    if neg_count >= pos_count + 2:
        return "negative"
    if neu_count > 0:
        return "neutral"

    return None


def has_strong_rule_signal(text: str, rule_label: str | None):
    if rule_label is None:
        return False

    t = text.lower().strip()
    positive_patterns = [
        r"\bis\s+good\b",
        r"\bare\s+good\b",
        r"\bworks?\s+well\b",
        r"\bworking\s+well\b",
        r"\bvery\s+good\b",
        r"\bexcellent\b",
        r"\breliable\b",
        r"\bclean\b",
    ]
    negative_patterns = [
        r"\bis\s+bad\b",
        r"\bare\s+bad\b",
        r"\bis\s+poor\b",
        r"\bare\s+poor\b",
        r"\bnot\s+good\b",
        r"\bbroken\b",
        r"\bunsafe\b",
        r"\bdirty\b",
        r"\bpotholes?\b",
    ]
    neutral_patterns = [
        r"\bokay\b",
        r"\baverage\b",
        r"\bacceptable\b",
        r"\bmanageable\b",
    ]

    patterns_by_label = {
        "positive": positive_patterns,
        "negative": negative_patterns,
        "neutral": neutral_patterns,
    }
    return any(re.search(pattern, t) for pattern in patterns_by_label.get(rule_label, []))


def resolve_prediction_label(pred, label_map):
    pred_str = str(pred)
    if pred_str in label_map:
        return label_map[pred_str]

    normalized = pred_str.strip().lower()
    direct_labels = {
        "negative": "negative",
        "positive": "positive",
        "neutral": "neutral",
    }
    if normalized in direct_labels:
        return direct_labels[normalized]

    raise ValueError(f"Unknown model output: {pred}")


# ---------------- App ----------------

def create_app():
    base_dir = os.path.join(os.path.dirname(__file__), "..")

    with open(os.path.join(base_dir, "metadata.json"), "r") as f:
        metadata = json.load(f)

    feature_mode = metadata.get("feature_mode", "counts")
    active_feature_mode = feature_mode
    label_map = metadata.get("label_map", {})
    artifacts = metadata.get("artifacts", {})

    vect = None
    emb_model = None
    model = None
    vectorizer_name = artifacts.get("vectorizer", "vectorizer.joblib")
    counts_model_name = artifacts.get("counts_model")
    embedding_model_name = artifacts.get("embedding_model")
    embedding_dir_name = artifacts.get("embedding_dir", "emb_model")

    vectorizer_path = os.path.join(base_dir, vectorizer_name)
    embedding_dir_path = os.path.join(base_dir, embedding_dir_name)

    legacy_counts_candidates = ["model_counts.joblib", "model.joblib"]
    legacy_embedding_candidates = ["model_embedding.joblib", "emb_model.joblib"]
    counts_model_candidates = [counts_model_name] if counts_model_name else []
    embedding_model_candidates = [embedding_model_name] if embedding_model_name else []
    counts_model_candidates.extend(legacy_counts_candidates)
    embedding_model_candidates.extend(legacy_embedding_candidates)

    def first_existing_path(candidates):
        seen = set()
        for name in candidates:
            if not name or name in seen:
                continue
            seen.add(name)
            path = os.path.join(base_dir, name)
            if os.path.exists(path):
                return path
        return None

    counts_model_path = first_existing_path(counts_model_candidates)
    embedding_model_path = first_existing_path(embedding_model_candidates)

    counts_available = os.path.exists(vectorizer_path) and counts_model_path is not None
    embedding_available = os.path.isdir(embedding_dir_path) and embedding_model_path is not None

    if feature_mode == "embedding" and not embedding_available and counts_available:
        active_feature_mode = "counts"
    elif feature_mode == "counts" and not counts_available and embedding_available:
        active_feature_mode = "embedding"

    if active_feature_mode == "counts":
        vect = joblib.load(vectorizer_path)
        model = joblib.load(counts_model_path)
    elif active_feature_mode == "embedding":
        try:
            from sentence_transformers import SentenceTransformer

            emb_model = SentenceTransformer(embedding_dir_path)
            model = joblib.load(embedding_model_path)
        except Exception:
            # Fallback to TF-IDF mode if embedding stack is unavailable.
            if counts_available:
                vect = joblib.load(vectorizer_path)
                model = joblib.load(counts_model_path)
                active_feature_mode = "counts"
            else:
                raise RuntimeError(
                    "Embedding stack failed and counts fallback artifacts are missing. "
                    "Run training again to generate compatible serving artifacts."
                )
    else:
        raise RuntimeError("Invalid feature_mode")

    app = FastAPI(title="Sentiment API")

    @app.post("/predict")
    def predict(item: Item):
        if not item.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        if active_feature_mode == "embedding":
            X = emb_model.encode([item.text], convert_to_numpy=True)
        else:
            X = vect.transform([item.text])

        try:
            pred = model.predict(X)[0]
        except ValueError as exc:
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Model/artifact feature mismatch for '{active_feature_mode}' mode: {exc}. "
                    "Retrain the service artifacts or align metadata.json with the available model files."
                ),
            ) from exc

        try:
            predicted_label = resolve_prediction_label(pred, label_map)
        except ValueError as exc:
            raise HTTPException(
                status_code=500,
                detail=str(exc)
            ) from exc

        proba = None
        confidence = None
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X)[0]
            classes = [str(cls) for cls in model.classes_]
            proba = {
                resolve_prediction_label(cls, label_map): prob
                for cls, prob in zip(classes, probs.tolist())
            }
            confidence = proba.get(predicted_label)

        rule_label = rule_based_label(item.text)
        if rule_label is not None and rule_label != predicted_label:
            if has_strong_rule_signal(item.text, rule_label) or confidence is None or confidence < 0.90:
                predicted_label = rule_label

        return {
            "prediction": predicted_label,
            "probability": proba,
            "feature_mode": active_feature_mode,
        }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
