from fastapi import FastAPI, UploadFile, File, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import math
from datetime import timedelta, date
import os
import jwt
from jwt import PyJWKClient
from cachetools import TTLCache

REQUIRED_COLS = ["SKU", "Date", "UnitsSold", "OnHand", "LeadTimeDays"]

# ===== Clerk JWT settings (set these in Render Environment Variables) =====
CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL", "")
CLERK_ISSUER = os.environ.get("CLERK_ISSUER", "")

# Cache the JWKS client so we don't refetch keys constantly
_jwks_client_cache = TTLCache(maxsize=2, ttl=3600)


def _get_jwks_client() -> PyJWKClient:
    if "client" not in _jwks_client_cache:
        if not CLERK_JWKS_URL:
            raise HTTPException(status_code=500, detail="Server misconfigured: CLERK_JWKS_URL missing")
        _jwks_client_cache["client"] = PyJWKClient(CLERK_JWKS_URL)
    return _jwks_client_cache["client"]


def verify_clerk_token(
    authorization: str = Header(None),
    x_org_id: str = Header(None),
):
    """
    Requires:
      Authorization: Bearer <Clerk session token>
      X-Org-Id: <Clerk Organization ID>
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty token")

    if not CLERK_ISSUER:
        raise HTTPException(status_code=500, detail="Server misconfigured: CLERK_ISSUER missing")

    if not x_org_id:
        raise HTTPException(status_code=400, detail="Missing X-Org-Id header (select a Company/Organization)")

    try:
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token).key

        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
            options={"require": ["exp", "iat", "iss", "sub"], "verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return {"user_id": user_id, "org_id": x_org_id, "claims": payload}


# ===== FastAPI app =====
app = FastAPI(title="SMB Supply Chain AI MVP (Secure)", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for MVP; tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Recommendation(BaseModel):
    sku: str
    current_stock: float
    avg_daily_sales: float
    forecast_30d: float
    reorder_qty: float
    reorder_by: str | None
    lead_time_days: int
    moq: int | None
    unit_cost: float | None
    status: str
    reason: str


def _ceil_to_moq(qty: float, moq: int | None) -> float:
    if moq is None or moq <= 0:
        return float(max(0, qty))
    if qty <= 0:
        return 0.0
    return float(int(math.ceil(qty / moq) * moq))


def _parse_date_series(s: pd.Series) -> pd.Series:
    return pd.to_datetime(s, errors="coerce", dayfirst=True)


def compute_recommendations(df: pd.DataFrame, horizon_days: int = 30) -> list[Recommendation]:
    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = df.copy()
    df["Date"] = _parse_date_series(df["Date"])
    df = df.dropna(subset=["Date"])

    for col in ["UnitsSold", "OnHand", "LeadTimeDays", "MOQ", "Cost"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    today = date.today()
    recs: list[Recommendation] = []

    for sku, g in df.groupby("SKU"):
        g = g.sort_values("Date")
        last = g.iloc[-1]

        on_hand = float(last.get("OnHand", 0) or 0)
        lead_time = int(last.get("LeadTimeDays", 0) or 0)

        moq_val = last.get("MOQ", None)
        moq = int(moq_val) if pd.notna(moq_val) and moq_val is not None else None

        cost_val = last.get("Cost", None)
        unit_cost = float(cost_val) if pd.notna(cost_val) and cost_val is not None else None

        recent_cutoff = g["Date"].max() - pd.Timedelta(days=28)
        recent = g[g["Date"] >= recent_cutoff]
        if recent.empty:
            recent = g

        daily = recent.groupby(recent["Date"].dt.date)["UnitsSold"].sum().reset_index()
        avg_daily = float(daily["UnitsSold"].mean()) if not daily.empty else 0.0

        forecast_30d = avg_daily * horizon_days
        target_stock = avg_daily * (horizon_days + max(lead_time, 0))

        reorder_qty_raw = max(0.0, target_stock - on_hand)
        reorder_qty = _ceil_to_moq(reorder_qty_raw, moq)

        days_until_stockout = (on_hand / avg_daily) if avg_daily > 0 else float("inf")

        if math.isfinite(days_until_stockout):
            days_to_order = max(0, int(math.floor(days_until_stockout - lead_time)))
            reorder_by = (today + timedelta(days=days_to_order)).isoformat()
        else:
            reorder_by = None

        if avg_daily == 0:
            status = "GREEN"
            reason = "No recent sales detected; no reorder recommendation."
        else:
            if days_until_stockout <= lead_time:
                status = "RED"
            elif days_until_stockout <= lead_time + 7:
                status = "AMBER"
            else:
                status = "GREEN"

            trend_note = ""
            recent14 = g[g["Date"] >= (g["Date"].max() - pd.Timedelta(days=14))]
            prev14 = g[
                (g["Date"] < (g["Date"].max() - pd.Timedelta(days=14)))
                & (g["Date"] >= (g["Date"].max() - pd.Timedelta(days=28)))
            ]
            if not recent14.empty and not prev14.empty:
                r = recent14["UnitsSold"].mean()
                p = prev14["UnitsSold"].mean()
                if p > 0:
                    pct = (r - p) / p * 100
                    if abs(pct) >= 10:
                        trend_note = f" Demand changed ~{pct:.0f}% vs prior 2 weeks."

            reason = (
                f"Avg daily sales {avg_daily:.1f}. Lead time {lead_time}d. "
                f"Forecast next {horizon_days}d {forecast_30d:.0f}. "
                f"Recommend reorder {reorder_qty:.0f} to cover horizon + lead time."
                + trend_note
            )

        recs.append(
            Recommendation(
                sku=str(sku),
                current_stock=on_hand,
                avg_daily_sales=avg_daily,
                forecast_30d=forecast_30d,
                reorder_qty=reorder_qty,
                reorder_by=reorder_by,
                lead_time_days=lead_time,
                moq=moq,
                unit_cost=unit_cost,
                status=status,
                reason=reason,
            )
        )

    order = {"RED": 0, "AMBER": 1, "GREEN": 2}
    recs.sort(key=lambda r: (order.get(r.status, 9), -r.reorder_qty))
    return recs


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/recommendations", response_model=list[Recommendation])
async def recommendations(
    file: UploadFile = File(...),
    horizon_days: int = 30,
    auth=Depends(verify_clerk_token),  # ✅ SECURED
):
    # auth includes: user_id + org_id
    # For next step: store results under auth["org_id"]
    content = await file.read()
    df = pd.read_csv(pd.io.common.BytesIO(content))
    recs = compute_recommendations(df, horizon_days=horizon_days)
    return recs
