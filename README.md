# SMB Supply Chain AI (CSV MVP)

This MVP takes a single CSV with columns:

Required:
- SKU
- Date (supports `1/12/2025` day-first or ISO)
- UnitsSold
- OnHand
- LeadTimeDays

Optional:
- MOQ
- Cost

It returns reorder recommendations + a simple dashboard UI.

## Quick start
### 1) Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2) Frontend
```bash
cd ../frontend
npm install
npm run dev
```

Then open http://localhost:3000 and upload your CSV.

## Sample CSV
See `sample.csv` in this repo.
