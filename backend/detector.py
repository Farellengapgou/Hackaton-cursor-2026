from __future__ import annotations

from dataclasses import dataclass
from statistics import mean, stdev
from typing import Any


@dataclass
class Anomaly:
    id: str
    transaction_id: str
    type: str
    severity: str
    message: str
    details: dict[str, Any]


def detect_anomalies(transactions: list[dict[str, Any]]) -> list[Anomaly]:
    if not transactions:
        return []

    anomalies: list[Anomaly] = []
    amounts = [float(t.get("amount", 0) or 0) for t in transactions]
    avg = mean(amounts) if amounts else 0
    spread = stdev(amounts) if len(amounts) > 1 else 0
    threshold = avg + (2 * spread if spread else abs(avg) * 0.5 or 100)

    seen_keys: dict[str, str] = {}
    for tx in transactions:
        tx_id = str(tx.get("id", ""))
        amount = float(tx.get("amount", 0) or 0)
        date = str(tx.get("date", ""))
        label = str(tx.get("label", "")).strip().lower()
        key = f"{date}|{label}|{amount}"

        if amount > threshold and amount > 0:
            anomalies.append(
                Anomaly(
                    id=f"high-{tx_id}",
                    transaction_id=tx_id,
                    type="high_amount",
                    severity="high" if amount > threshold * 1.5 else "medium",
                    message=f"Montant inhabituel: {amount:.2f} (seuil ~{threshold:.2f})",
                    details={"amount": amount, "threshold": threshold},
                )
            )

        if key in seen_keys:
            anomalies.append(
                Anomaly(
                    id=f"dup-{tx_id}",
                    transaction_id=tx_id,
                    type="duplicate",
                    severity="medium",
                    message="Transaction potentiellement dupliquée",
                    details={"duplicate_of": seen_keys[key]},
                )
            )
        else:
            seen_keys[key] = tx_id

        if amount < 0:
            anomalies.append(
                Anomaly(
                    id=f"neg-{tx_id}",
                    transaction_id=tx_id,
                    type="negative_amount",
                    severity="low",
                    message="Montant négatif détecté",
                    details={"amount": amount},
                )
            )

    return anomalies


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
