# CivicPulse

CivicPulse is a full-stack civic complaint analytics platform. It allows users to submit public service complaints, stores them in a backend service, classifies the sentiment of each complaint through a machine learning API, and visualizes complaint trends and regional rankings in a React dashboard.

The project is organized as three services:

- `frontend`: React dashboard built with Vite and Tailwind CSS
- `backend`: Node.js and Express API with MongoDB and Socket.IO
- `ml-service`: FastAPI sentiment analysis service built in Python

## Core Features

- Submit civic complaints with city, area, and category details
- Predict complaint sentiment as `positive`, `negative`, or `neutral`
- Store complaint records in MongoDB
- Stream new complaints in real time using Socket.IO
- Visualize complaints, rankings, and governance indicators in the frontend
- Train and compare two text-feature pipelines for sentiment classification

## Project Architecture

1. A user submits a complaint from the frontend.
2. The backend receives the request and forwards the complaint text to the ML service.
3. The ML service predicts the sentiment label.
4. The backend stores the complaint and predicted sentiment in MongoDB.
5. The backend emits a real-time event through Socket.IO.
6. The frontend updates dashboards, rankings, and complaint views.

## Tools And Technologies Used

### Frontend

- React 18
- Vite
- Tailwind CSS
- Axios
- Recharts
- Socket.IO Client

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- Axios
- dotenv
- cors

### ML Service

- Python
- FastAPI
- Uvicorn
- scikit-learn
- SentenceTransformers
- Transformers
- PyTorch
- pandas
- joblib
- openpyxl

## Machine Learning Model

The ML service performs sentiment classification on complaint text.

Models used:

- `TF-IDF + LogisticRegression`
- `SentenceTransformer embeddings + LogisticRegression`

Current training logic compares both pipelines and selects the better one using macro F1 score. The current metadata indicates that the active serving mode is embedding-based sentiment classification using:

- `all-MiniLM-L6-v2` for sentence embeddings
- `LogisticRegression` as the final classifier

The service also includes a fallback mechanism:

- If the embedding stack fails at runtime, the API can fall back to the TF-IDF pipeline when fallback artifacts are available.

## Folder Structure

```text
CivicPluse/
|-- frontend/
|-- backend/
|-- ml-service/
|   |-- app/
|   |-- train.py
|   |-- metadata.json
|   |-- run.bat
|   |-- train.bat
|-- CivicPulse_Train.xlsx
|-- CivicPulse_Test.xlsx
|-- run-ml.ps1
|-- start.ps1
|-- start.sh
|-- stop.sh
```

## How To Run

### ML Service

From `ml-service`:

```powershell
.\run.bat
```

### Train The ML Model

From `ml-service`:

```powershell
.\train.bat
```

### Start All Services On Windows

From the project root:

```powershell
.\start.ps1
```

This starts:

- Frontend on `http://localhost:3000`
- Backend on its configured port
- ML service on `http://localhost:8001`

## Backend API Overview

Main endpoints:

- `POST /api/complaints` to create a complaint
- `GET /api/complaints` to fetch stored and dataset complaints
- `GET /api/options` to fetch city, ward, and category options
- `POST /predict` in the ML service to classify complaint sentiment

## Data Used

The project includes Excel datasets for model development:

- `CivicPulse_Train.xlsx`
- `CivicPulse_Test.xlsx`

These datasets are used by `ml-service/train.py` to train, validate, and test the sentiment model.

## Real-Time Communication

The backend uses Socket.IO to broadcast newly created complaints. This allows the frontend dashboard to update without requiring manual refresh.

## Use Case

CivicPulse is designed for civic governance monitoring. It can help identify complaint-heavy regions, understand public sentiment toward services, and provide a live dashboard for administrators or citizens tracking issue patterns.

## Notes

- The project currently uses local files and a local MongoDB instance.
- The ML service is designed to be resilient to embedding dependency issues through fallback logic.
- For stable execution, use the provided runner scripts instead of relying on a global Python installation.
