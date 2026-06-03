"""Routes de consultation : transactions, anomalies et statistiques."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from services.analysis_service import compute_stats
from services.store import store

router = APIRouter()


@router.get("/api/transactions")
def get_transactions() -> list[dict[str, Any]]:
    return store.get_transactions()


@router.get("/api/anomalies")
def get_anomalies() -> list[dict[str, Any]]:
    return store.get_anomalies()


@router.get("/api/stats")
def get_stats() -> dict[str, Any]:
    return compute_stats()
