"""Schéma Pydantic pour la réponse de statistiques."""

from __future__ import annotations

from pydantic import BaseModel


class StatsResponse(BaseModel):
    transactions_count: int
    anomalies_count: int
    total_amount: float
    anomalies_by_severity: dict[str, int]
