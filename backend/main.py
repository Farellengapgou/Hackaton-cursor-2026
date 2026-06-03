"""Point d'entrée unifié FinAudit.

Combine le backend hackathon (``/analyze``, détecteur riche, démo) et la
structure modulaire ``origin/backend`` (``/api/transactions``, store, config),
le tout protégé par l'authentification par jeton Bearer (voir ``auth``).
"""

from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any

import pandas as pd
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from api.routes_auth import router as auth_router
from api.routes_transactions import router as transactions_router
from auth.dependencies import get_current_user
from config import settings
from detector import AnomalyDetector, build_summary
from explainer import get_explainer
from services.store import store

detector = AnomalyDetector()
last_result: dict[str, Any] | None = None


class ExplainRequest(BaseModel):
    transaction_id: str


class ChatRequest(BaseModel):
    transaction_id: str
    message: str = Field(..., min_length=1)
    history: list[dict[str, str]] | None = None


def _index_by_id(transactions: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(t["id"]): t for t in transactions}


def _flatten_anomalies(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    flat: list[dict[str, Any]] = []
    for tx in transactions:
        for anomaly in tx.get("anomalies", []):
            entry = dict(anomaly)
            entry.setdefault("transaction_id", tx.get("id"))
            flat.append(entry)
    return flat


def _persist_result(
    transactions: list[dict[str, Any]],
    summary: dict[str, Any],
    username: str | None = None,
) -> dict[str, Any]:
    global last_result
    payload = {"summary": summary, "transactions": transactions}
    last_result = payload
    flat = _flatten_anomalies(transactions)
    store.save(transactions, flat)
    store.record_history(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "username": username,
            "transactions_count": len(transactions),
            "anomalies_count": len(flat),
        }
    )
    return payload


async def _analyze_file(file: UploadFile, username: str | None) -> dict[str, Any]:
    """Import CSV + détection — aucun appel API externe."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Fichier CSV requis")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content), encoding="utf-8-sig")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"CSV invalide: {exc}") from exc

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV vide")

    transactions = detector.analyze(df)
    summary = build_summary(transactions)
    return _persist_result(transactions, summary, username)


def _get_transaction(transaction_id: str) -> dict[str, Any]:
    if not last_result:
        raise HTTPException(
            status_code=400,
            detail="Aucune analyse en mémoire. Envoyez d'abord POST /analyze avec un CSV.",
        )
    tx_map = _index_by_id(last_result.get("transactions", []))
    tx = tx_map.get(str(transaction_id))
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction introuvable")
    return tx


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_TITLE)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.CORS_ORIGIN],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth_router)
    app.include_router(transactions_router)
    return app


app = create_app()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return await _analyze_file(file, current_user.get("username"))


@app.post("/explain")
def explain(
    body: ExplainRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    tx = _get_transaction(body.transaction_id)
    explainer = get_explainer()
    return explainer.explain(tx, tx.get("anomalies", []))


@app.post("/chat")
def chat(
    body: ChatRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    tx = _get_transaction(body.transaction_id)
    explainer = get_explainer()
    return explainer.chat(tx, tx.get("anomalies", []), body.message, body.history)


@app.get("/api/health")
def api_health() -> dict[str, str]:
    return health()


@app.post("/api/upload")
async def api_upload(
    file: UploadFile = File(...),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Alias de ``/analyze`` (compatibilité branche ``origin/backend``)."""
    return await _analyze_file(file, current_user.get("username"))
