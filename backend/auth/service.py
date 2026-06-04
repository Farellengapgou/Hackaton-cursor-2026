"""Logique d'authentification : inscription, connexion, déconnexion."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from auth.store import auth_store
from auth.validators import validate_password, validate_username


def register(username: str, password: str) -> dict[str, Any]:
    username = validate_username(username)
    password = validate_password(password)
    if auth_store.get_user(username) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "username_exists",
                "message": f"L'identifiant « {username} » est déjà utilisé. Choisissez-en un autre.",
            },
        )
    user = auth_store.create_user(username, password)
    return {
        "user_id": user["user_id"],
        "username": username,
        "message": "user_created",
    }


def login(username: str, password: str) -> dict[str, Any]:
    username = (username or "").strip()
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_username", "message": "Identifiant requis."},
        )
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_password",
                "message": "Mot de passe requis.",
            },
        )
    user = auth_store.get_user(username)
    if user is None or user["password"] != password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "invalid_credentials",
                "message": "Identifiant ou mot de passe incorrect.",
            },
        )
    token = auth_store.issue_token(username)
    return {
        "access_token": token,
        "user_id": user["user_id"],
        "username": username,
    }


def logout(token: str) -> dict[str, str]:
    auth_store.revoke_token(token)
    return {"status": "logged_out"}
