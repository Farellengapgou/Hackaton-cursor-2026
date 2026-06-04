"""Stockage en mémoire par utilisateur (hackathon, sans base de données).

Chaque identifiant de connexion possède son propre jeu de transactions,
anomalies, historique et dernier résultat d'analyse.
"""

from __future__ import annotations

from typing import Any


def _empty_bucket() -> dict[str, Any]:
    return {
        "transactions": [],
        "anomalies": [],
        "history": [],
        "last_result": None,
    }


class InMemoryStore:
    def __init__(self) -> None:
        self._sessions: dict[str, dict[str, Any]] = {}

    def _bucket(self, username: str) -> dict[str, Any]:
        key = (username or "").strip() or "_anonymous"
        if key not in self._sessions:
            self._sessions[key] = _empty_bucket()
        return self._sessions[key]

    def save(
        self,
        username: str,
        transactions: list[dict[str, Any]],
        anomalies: list[dict[str, Any]],
    ) -> None:
        bucket = self._bucket(username)
        bucket["transactions"] = transactions
        bucket["anomalies"] = anomalies

    def get_transactions(self, username: str) -> list[dict[str, Any]]:
        return list(self._bucket(username)["transactions"])

    def get_anomalies(self, username: str) -> list[dict[str, Any]]:
        return list(self._bucket(username)["anomalies"])

    def record_history(self, username: str, entry: dict[str, Any]) -> None:
        self._bucket(username)["history"].append(entry)

    def get_history(self, username: str) -> list[dict[str, Any]]:
        return list(self._bucket(username)["history"])

    def set_last_result(self, username: str, payload: dict[str, Any] | None) -> None:
        self._bucket(username)["last_result"] = payload

    def get_last_result(self, username: str) -> dict[str, Any] | None:
        return self._bucket(username)["last_result"]

    def find_anomaly(self, username: str, anomaly_id: str) -> dict[str, Any] | None:
        return next(
            (a for a in self.get_anomalies(username) if a.get("id") == anomaly_id),
            None,
        )

    def find_transaction(
        self, username: str, transaction_id: Any
    ) -> dict[str, Any] | None:
        return next(
            (
                t
                for t in self.get_transactions(username)
                if str(t.get("id")) == str(transaction_id)
            ),
            None,
        )


store = InMemoryStore()
