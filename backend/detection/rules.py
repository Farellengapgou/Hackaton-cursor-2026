"""Détecteurs déterministes d'anomalies.

Chaque détecteur est indépendant et sans état propre (l'état partagé transite
par ``context``), ce qui rend l'ajout d'une nouvelle règle local à ce fichier.
La logique reproduit fidèlement le comportement historique afin que les
réponses de l'API restent identiques.
"""

from __future__ import annotations

from statistics import mean, stdev
from typing import Any

from detection.base import Anomaly


def _amount(transaction: dict[str, Any]) -> float:
    return float(transaction.get("amount", 0) or 0)


class HighAmountDetector:
    """Montant anormalement élevé par rapport à la distribution globale."""

    def prepare(self, transactions: list[dict[str, Any]], context: dict[str, Any]) -> None:
        amounts = [_amount(t) for t in transactions]
        avg = mean(amounts) if amounts else 0
        spread = stdev(amounts) if len(amounts) > 1 else 0
        context["threshold"] = avg + (2 * spread if spread else abs(avg) * 0.5 or 100)

    def inspect(self, transaction: dict[str, Any], context: dict[str, Any]) -> list[Anomaly]:
        threshold = context["threshold"]
        amount = _amount(transaction)
        tx_id = str(transaction.get("id", ""))
        if amount > threshold and amount > 0:
            return [
                Anomaly(
                    id=f"high-{tx_id}",
                    transaction_id=tx_id,
                    type="high_amount",
                    severity="high" if amount > threshold * 1.5 else "medium",
                    message=f"Montant inhabituel: {amount:.2f} (seuil ~{threshold:.2f})",
                    details={"amount": amount, "threshold": threshold},
                )
            ]
        return []


class DuplicateDetector:
    """Transaction potentiellement dupliquée (même date, libellé et montant)."""

    def prepare(self, transactions: list[dict[str, Any]], context: dict[str, Any]) -> None:
        context["seen_keys"] = {}

    def inspect(self, transaction: dict[str, Any], context: dict[str, Any]) -> list[Anomaly]:
        seen_keys: dict[str, str] = context["seen_keys"]
        tx_id = str(transaction.get("id", ""))
        amount = _amount(transaction)
        date = str(transaction.get("date", ""))
        label = str(transaction.get("label", "")).strip().lower()
        key = f"{date}|{label}|{amount}"

        if key in seen_keys:
            return [
                Anomaly(
                    id=f"dup-{tx_id}",
                    transaction_id=tx_id,
                    type="duplicate",
                    severity="medium",
                    message="Transaction potentiellement dupliquée",
                    details={"duplicate_of": seen_keys[key]},
                )
            ]
        seen_keys[key] = tx_id
        return []


class NegativeAmountDetector:
    """Montant négatif."""

    def prepare(self, transactions: list[dict[str, Any]], context: dict[str, Any]) -> None:
        return None

    def inspect(self, transaction: dict[str, Any], context: dict[str, Any]) -> list[Anomaly]:
        amount = _amount(transaction)
        tx_id = str(transaction.get("id", ""))
        if amount < 0:
            return [
                Anomaly(
                    id=f"neg-{tx_id}",
                    transaction_id=tx_id,
                    type="negative_amount",
                    severity="low",
                    message="Montant négatif détecté",
                    details={"amount": amount},
                )
            ]
        return []
