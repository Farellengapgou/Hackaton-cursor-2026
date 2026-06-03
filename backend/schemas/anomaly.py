"""Schémas Pydantic et énumérations pour les anomalies."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel


class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class AnomalyType(str, Enum):
    high_amount = "high_amount"
    duplicate = "duplicate"
    negative_amount = "negative_amount"


class Anomaly(BaseModel):
    id: str
    transaction_id: str
    type: str
    severity: str
    message: str
    details: dict[str, Any]
