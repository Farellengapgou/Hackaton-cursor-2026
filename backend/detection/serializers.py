"""Sérialisation des anomalies vers la forme JSON figée par le contrat d'API."""

from __future__ import annotations

from typing import Any

from detection.base import Anomaly


def anomalies_to_dict(anomalies: list[Anomaly]) -> list[dict[str, Any]]:
    return [
        {
            "id": a.id,
            "transaction_id": a.transaction_id,
            "type": a.type,
            "severity": a.severity,
            "message": a.message,
            "details": a.details,
        }
        for a in anomalies
    ]
