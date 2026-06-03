"""Routes de consultation : transactions, anomalies, statistiques, historique.

Toutes ces routes sont protégées : un jeton Bearer valide est requis.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from services.analysis_service import compute_stats
from services.store import store

router = APIRouter()


@router.get("/api/transactions")
def get_transactions(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return store.get_transactions()


@router.get("/api/anomalies")
def get_anomalies(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return store.get_anomalies()


@router.get("/api/stats")
def get_stats(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return compute_stats()


@router.get("/api/history")
def get_history(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return store.get_history()
