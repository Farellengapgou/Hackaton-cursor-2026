"""Point d'entrée unifié FinAudit.

Combine le backend hackathon (``/analyze``, détecteur riche, démo) et la
structure modulaire ``origin/backend`` (``/api/transactions``, store, config),
le tout protégé par l'authentification par jeton Bearer (voir ``auth``).
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _BACKEND_DIR.parent
# Racine (Docker compose) puis backend/.env (dev local, peut surcharger)
load_dotenv(_PROJECT_ROOT / ".env")
load_dotenv(_BACKEND_DIR / ".env", override=True)

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from api.routes_auth import router as auth_router
from api.routes_transactions import router as transactions_router
from auth.dependencies import get_current_user
from config import settings
from context_builder import build_audit_context
from detector import AnomalyDetector, build_summary
from explainer import get_explainer
from schema_mapper import read_upload
from services.store import store

detector = AnomalyDetector()


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
    schema_report: dict[str, Any],
    username: str | None = None,
) -> dict[str, Any]:
    user_key = (username or "").strip() or "_anonymous"
    payload = {
        "summary": summary,
        "transactions": transactions,
        "schema_report": schema_report,
    }
    flat = _flatten_anomalies(transactions)
    store.save(user_key, transactions, flat)
    store.set_last_result(user_key, payload)
    store.record_history(
        user_key,
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "username": user_key,
            "transactions_count": len(transactions),
            "anomalies_count": len(flat),
        },
    )
    return payload


async def _analyze_file(file: UploadFile, username: str | None) -> dict[str, Any]:
    """Import CSV/XLSX + détection — aucun appel API externe."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nom de fichier requis")
    lower = file.filename.lower()
    if not lower.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Formats acceptés : .csv, .xlsx, .xls",
        )

    content = await file.read()
    try:
        df, schema_report = read_upload(content, file.filename)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Fichier invalide: {exc}") from exc

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail=(
                "Fichier vide ou sans ligne de transaction lisible. "
                "Vérifiez l'en-tête (id, date, fournisseur, montant…) et au moins une ligne de données."
            ),
        )

    min_rows = int(os.getenv("FINAUDIT_MIN_ROWS", "2"))
    if len(df) < min_rows:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Fichier trop court : {len(df)} ligne(s) détectée(s), "
                f"minimum {min_rows} transaction(s) requises (hors en-tête). "
                "Utilisez demo_transactions_large.csv pour un jeu de test volumineux."
            ),
        )

    transactions, dataset_alerts = detector.analyze(df)
    summary = build_summary(transactions, dataset_alerts)
    return _persist_result(transactions, summary, schema_report, username)


def _get_transaction(transaction_id: str, username: str) -> dict[str, Any]:
    last_result = store.get_last_result(username)
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
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth_router)
    app.include_router(transactions_router)
    return app


app = create_app()


@app.get("/health")
def health() -> dict[str, Any]:
    import os

    from prompts import GEMINI_MODEL

    gemini = bool(os.getenv("GEMINI_API_KEY", "").strip())
    return {
        "status": "ok",
        "llm_configured": gemini,
        "explainer_mode": "gemini" if gemini else "template",
        "gemini_model": GEMINI_MODEL if gemini else None,
    }


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
    username = current_user["username"]
    tx = _get_transaction(body.transaction_id, username)
    last_result = store.get_last_result(username) or {}
    summary = last_result.get("summary", {})
    ctx = build_audit_context(
        tx,
        last_result.get("transactions", []),
        last_result.get("schema_report"),
        summary.get("dataset_alerts"),
    )
    return get_explainer().explain(tx, tx.get("anomalies", []), ctx)


@app.post("/chat")
def chat(
    body: ChatRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    username = current_user["username"]
    tx = _get_transaction(body.transaction_id, username)
    last_result = store.get_last_result(username) or {}
    summary = last_result.get("summary", {})
    ctx = build_audit_context(
        tx,
        last_result.get("transactions", []),
        last_result.get("schema_report"),
        summary.get("dataset_alerts"),
    )
    return get_explainer().chat(
        tx, tx.get("anomalies", []), body.message, ctx, body.history
    )


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
