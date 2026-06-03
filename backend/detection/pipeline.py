"""Orchestration des détecteurs d'anomalies.

Les détecteurs sont appliqués transaction par transaction, dans l'ordre
d'enregistrement, ce qui reproduit exactement l'ordre des anomalies attendu
par le contrat d'API (pour chaque transaction : montant élevé, doublon, puis
montant négatif).
"""

from __future__ import annotations

from typing import Any

from detection.base import Anomaly
from detection.rules import (
    DuplicateDetector,
    HighAmountDetector,
    NegativeAmountDetector,
)

# L'ordre de cette liste définit l'ordre des anomalies par transaction.
DETECTORS = (
    HighAmountDetector(),
    DuplicateDetector(),
    NegativeAmountDetector(),
)


def run_detection(transactions: list[dict[str, Any]]) -> list[Anomaly]:
    """Exécute tous les détecteurs et renvoie les anomalies détectées."""
    if not transactions:
        return []

    context: dict[str, Any] = {}
    for detector in DETECTORS:
        detector.prepare(transactions, context)

    anomalies: list[Anomaly] = []
    for transaction in transactions:
        for detector in DETECTORS:
            anomalies.extend(detector.inspect(transaction, context))
    return anomalies
