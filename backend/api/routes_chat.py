"""Route de chat : explication d'une anomalie via l'IA."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ai.explainer import explain_anomaly
from schemas.chat import ChatRequest
from services.store import store

router = APIRouter()


@router.post("/api/chat")
def chat(body: ChatRequest) -> dict[str, str]:
    anomaly = store.find_anomaly(body.anomaly_id)
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomalie introuvable")
    transaction = store.find_transaction(anomaly.get("transaction_id"))
    reply = explain_anomaly(anomaly, transaction, body.question)
    return {"reply": reply}
