# CivicPluse

CivicPluse is a civic complaint management and analytics platform built as a full-stack project. Citizens can submit complaints, the system predicts complaint sentiment through an ML service, and administrators can review complaints, update workflow status, and monitor governance insights through dedicated dashboards.

## What The Project Does

The project has two main goals:

- collect and store civic complaints with city, area, and category details
- analyze complaint sentiment and present live governance insights

It also includes an admin workflow so complaints can be marked as:

- `Yet to be Solved`
- `In Progress`
- `Resolved`

## Main Features

- complaint submission form for civic issues
- live complaint feed with sentiment labels
- AI insights page with sentiment and category charts
- rankings page that updates in real time as new complaints arrive
- admin page at `http://localhost:3000/admin`
- complaint status management for negative and neutral complaints
- MongoDB storage for complaint records
- ML-based sentiment prediction for complaint text

## Project Structure

The repository is divided into three services:

- `frontend/`
  React dashboard built with Vite and Tailwind CSS
- `backend/`
  Express and MongoDB API with Socket.IO for real-time updates
- `ml-service/`
  FastAPI sentiment prediction service in Python

## Tech Stack

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

## How The System Works

1. A user submits a complaint from the frontend.
2. The backend receives the complaint and sends the complaint text to the ML service.
3. The ML service predicts sentiment as `negative`, `positive`, or `neutral`.
4. The backend stores the complaint in MongoDB with sentiment and status.
5. The backend emits live Socket.IO events to connected clients.
6. The frontend dashboards and admin page update in real time.

## ML Model Details

The ML service is a sentiment classification pipeline for civic complaint text.

Current model configuration from [metadata.json](C:\Users\harsh\OneDrive\Desktop\CivicPluse\ml-service\metadata.json):

- classifier: `LogisticRegression`
- feature mode: `counts`
- embedding model supported in training: `all-MiniLM-L6-v2`

The training script compares:

- `TF-IDF + LogisticRegression`
- `SentenceTransformer embeddings + LogisticRegression`

At the moment, the active serving mode is `counts`, which means the service is using TF-IDF style text features with Logistic Regression for prediction.

## Admin Workflow

The admin page is available at:

- `http://localhost:3000/admin`

The admin interface:

- shows complaints from the backend
- filters the list to negative and neutral complaints
- lets the admin update complaint status
- receives real-time updates when new complaints are created or statuses change

## Important API Endpoints

### Backend

- `POST /api/complaints`
  create a complaint
- `GET /api/complaints`
  fetch complaint feed data
- `GET /api/options`
  fetch city, ward, and category options
- `GET /api/admin/complaints`
  fetch admin complaint list
- `PATCH /api/admin/complaints/:id/status`
  update complaint status

### ML Service

- `POST /predict`
  predict sentiment for complaint text

## Run Instructions

### Windows

Start the ML service from `ml-service`:

```powershell
.\run.bat
```

Train the ML model from `ml-service`:

```powershell
.\train.bat
```

Start all major services from the project root:

```powershell
.\start.ps1
```

### Manual Service Start

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Backend:

```powershell
cd backend
npm install
npm run dev
```

ML service:

```powershell
cd ml-service
.\run.bat
```

## Default Local URLs

- frontend: `http://localhost:3000`
- admin page: `http://localhost:3000/admin`
- backend: `http://localhost:4000` or your configured backend port
- ML service: `http://localhost:8001`

## Dataset Files

The repository includes training and testing spreadsheets:

- `CivicPulse_Train.xlsx`
- `CivicPulse_Test.xlsx`

These are used by [train.py](C:\Users\harsh\OneDrive\Desktop\CivicPluse\ml-service\train.py) to train and evaluate the sentiment model.

## Notes

- MongoDB is expected to run locally at `mongodb://127.0.0.1:27017/civicpulse` unless changed through environment configuration.
- The frontend receives real-time complaint updates through Socket.IO.
- The rankings page merges city aliases such as `Bangalore` into `Bengaluru`.
- The admin page is intended for workflow management, not just analytics.
