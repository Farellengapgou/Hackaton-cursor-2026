"""Orchestration : parsing CSV -> détection (AnomalyDetector) -> store -> stats."""

from __future__ import annotations

import io
from typing import Any

import pandas as pd

from detector import AnomalyDetector, build_summary
from services.store import store

_detector = AnomalyDetector()


def _flatten_anomalies(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    flat: list[dict[str, Any]] = []
    for tx in transactions:
        for anomaly in tx.get("anomalies", []):
            entry = dict(anomaly)
            entry.setdefault("transaction_id", tx.get("id"))
            flat.append(entry)
    return flat


def analyze_upload(content: bytes) -> dict[str, Any]:
    df = pd.read_csv(io.BytesIO(content), encoding="utf-8-sig")
    transactions = _detector.analyze(df)
    summary = build_summary(transactions)
    anomalies = _flatten_anomalies(transactions)
    store.save(transactions, anomalies)
    return {
        "summary": summary,
        "transactions_count": len(transactions),
        "anomalies_count": len(anomalies),
        "transactions": transactions,
        "anomalies": anomalies,
    }


def compute_stats() -> dict[str, Any]:
    transactions = store.get_transactions()
    anomalies = store.get_anomalies()
    total = len(transactions)
    total_amount = sum(float(t.get("amount", 0) or t.get("montant", 0) or 0) for t in transactions)
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
