"""Orchestration : parsing CSV -> détection -> persistance -> statistiques."""

from __future__ import annotations

from typing import Any

from detection.pipeline import run_detection
from detection.serializers import anomalies_to_dict
from services.csv_parser import parse_csv
from services.store import store


def analyze_upload(content: bytes) -> dict[str, Any]:
    """Parse le CSV, détecte les anomalies, persiste, et renvoie le payload d'upload."""
    transactions = parse_csv(content)
    detected = run_detection(transactions)
    anomalies = anomalies_to_dict(detected)
    store.save(transactions, anomalies)
    return {
        "transactions_count": len(transactions),
        "anomalies_count": len(anomalies),
        "transactions": transactions,
        "anomalies": anomalies,
    }


def compute_stats() -> dict[str, Any]:
    """Statistiques agrégées sur l'état courant du store."""
    transactions = store.get_transactions()
    anomalies = store.get_anomalies()
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
