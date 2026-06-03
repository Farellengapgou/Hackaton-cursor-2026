"""Schémas Pydantic pour les transactions et la réponse d'upload.

Ces modèles décrivent la forme figée par le contrat d'API. Les routes
renvoient les dictionnaires natifs produits par les services afin de garantir
une sortie strictement identique ; ces schémas servent de contrat typé et de
documentation.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from schemas.anomaly import Anomaly


class Transaction(BaseModel):
    id: str
    date: str
    label: str
    amount: float
    category: str


class UploadResponse(BaseModel):
    transactions_count: int
    anomalies_count: int
    transactions: list[Transaction]
    anomalies: list[Anomaly]
