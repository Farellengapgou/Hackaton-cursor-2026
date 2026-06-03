from __future__ import annotations

import csv
import io
import uuid
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_explainer import explain_anomaly
from detector import anomalies_to_dict, detect_anomalies

app = FastAPI(title="FinAudit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store
transactions: list[dict[str, Any]] = []
anomalies: list[dict[str, Any]] = []


class ChatRequest(BaseModel):
    anomaly_id: str
    question: str | None = None


def parse_csv(content: bytes) -> list[dict[str, Any]]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows: list[dict[str, Any]] = []
    for i, row in enumerate(reader):
        amount_raw = row.get("amount") or row.get("montant") or row.get("Amount") or "0"
        try:
            amount = float(str(amount_raw).replace(",", ".").replace(" ", ""))
        except ValueError:
            amount = 0.0
        rows.append(
            {
                "id": row.get("id") or str(uuid.uuid4())[:8],
                "date": row.get("date") or row.get("Date") or "",
                "label": row.get("label") or row.get("libelle") or row.get("Label") or "",
                "amount": amount,
                "category": row.get("category") or row.get("categorie") or "",
            }
        )
        if i > 5000:
            break
    return rows


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)) -> dict[str, Any]:
    global transactions, anomalies
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Fichier CSV requis")
    content = await file.read()
    transactions = parse_csv(content)
    detected = detect_anomalies(transactions)
    anomalies = anomalies_to_dict(detected)
    return {
        "transactions_count": len(transactions),
        "anomalies_count": len(anomalies),
        "transactions": transactions,
        "anomalies": anomalies,
    }


@app.get("/api/transactions")
def get_transactions() -> list[dict[str, Any]]:
    return transactions


@app.get("/api/anomalies")
def get_anomalies() -> list[dict[str, Any]]:
    return anomalies


@app.get("/api/stats")
def get_stats() -> dict[str, Any]:
    total = len(transactions)
    total_amount = sum(float(t.get("amount", 0) or 0) for t in transactions)
    by_severity: dict[str, int] = {}
    for a in anomalies:
        sev = a.get("severity", "unknown")
        by_severity[sev] = by_severity.get(sev, 0) + 1
    return {
        "transactions_count": total,
        "anomalies_count": len(anomalies),
        "total_amount": round(total_amount, 2),
        "anomalies_by_severity": by_severity,
    }


@app.post("/api/chat")
def chat(body: ChatRequest) -> dict[str, str]:
    anomaly = next((a for a in anomalies if a["id"] == body.anomaly_id), None)
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomalie introuvable")
    tx = next(
        (t for t in transactions if str(t.get("id")) == str(anomaly.get("transaction_id"))),
        None,
    )
    reply = explain_anomaly(anomaly, tx, body.question)
    return {"reply": reply}
