# Backend (FastAPI)

## Run locally
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check:
- http://localhost:8000/health

API:
- POST http://localhost:8000/api/recommendations?horizon_days=30
  - multipart form-data: file=@your.csv
