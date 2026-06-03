"""Stockage en mémoire de la session courante (mono-session, sans base).

Cette interface minimale isole l'état mutable du reste de l'application ;
remplacer ce module par une base de données ultérieurement n'impacterait pas
les routes ni les services.
"""

from __future__ import annotations

from typing import Any


class InMemoryStore:
    def __init__(self) -> None:
        self._transactions: list[dict[str, Any]] = []
        self._anomalies: list[dict[str, Any]] = []

    def save(
        self,
        transactions: list[dict[str, Any]],
        anomalies: list[dict[str, Any]],
    ) -> None:
        self._transactions = transactions
        self._anomalies = anomalies

    def get_transactions(self) -> list[dict[str, Any]]:
        return self._transactions

    def get_anomalies(self) -> list[dict[str, Any]]:
        return self._anomalies

    def find_anomaly(self, anomaly_id: str) -> dict[str, Any] | None:
        return next((a for a in self._anomalies if a["id"] == anomaly_id), None)

    def find_transaction(self, transaction_id: Any) -> dict[str, Any] | None:
        return next(
            (t for t in self._transactions if str(t.get("id")) == str(transaction_id)),
            None,
        )


# Instance unique partagée par l'application.
store = InMemoryStore()
