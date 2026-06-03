from __future__ import annotations

import io
from typing import Any

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from detector import AnomalyDetector, build_summary
from explainer import get_explainer

app = FastAPI(title="FinAudit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)) -> dict[str, Any]:
    """
    Import CSV + détection — aucun appel API externe.
    """
    global last_result
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
    last_result = {"summary": summary, "transactions": transactions}
    return last_result


@app.post("/explain")
def explain(body: ExplainRequest) -> dict[str, Any]:
    tx = _get_transaction(body.transaction_id)
    explainer = get_explainer()
    return explainer.explain(tx, tx.get("anomalies", []))


@app.post("/chat")
def chat(body: ChatRequest) -> dict[str, Any]:
    tx = _get_transaction(body.transaction_id)
    explainer = get_explainer()
    return explainer.chat(tx, tx.get("anomalies", []), body.message, body.history)


# Alias deprecated pour compatibilité temporaire
@app.get("/api/health")
def api_health() -> dict[str, str]:
    return health()


@app.post("/api/upload")
async def api_upload_deprecated(file: UploadFile = File(...)) -> dict[str, Any]:
    return await analyze(file)
