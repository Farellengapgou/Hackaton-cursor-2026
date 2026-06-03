"""Dépendances FastAPI pour protéger les routes par jeton Bearer.

On privilégie une dépendance (``Depends``) plutôt qu'un middleware lourd :
elle extrait l'en-tête ``Authorization: Bearer <token>``, valide le jeton
contre le store en mémoire, renvoie 401 si invalide, et fournit le contexte
utilisateur (``user_id``, ``username``) aux handlers.
"""

from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth.store import auth_store

# auto_error=False : on gère nous-mêmes la réponse 401 (jeton absent ou invalide).
bearer_scheme = HTTPBearer(auto_error=False)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="invalid_or_missing_token",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Renvoie le jeton Bearer brut, ou 401 s'il est absent/mal formé."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _UNAUTHORIZED
    return credentials.credentials


def get_current_user(token: str = Depends(get_token)) -> dict[str, Any]:
    """Valide le jeton et renvoie le contexte utilisateur, ou 401."""
    user = auth_store.get_user_by_token(token)
    if user is None:
        raise _UNAUTHORIZED
    return user
