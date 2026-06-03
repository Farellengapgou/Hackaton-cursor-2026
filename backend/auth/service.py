"""Logique d'authentification : inscription, connexion, déconnexion."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from auth.store import auth_store


def register(username: str, password: str) -> dict[str, Any]:
    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="username and password are required",
        )
    if auth_store.get_user(username) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="username_already_exists",
        )
    user = auth_store.create_user(username, password)
    return {
        "user_id": user["user_id"],
        "username": username,
        "message": "user_created",
    }


def login(username: str, password: str) -> dict[str, Any]:
    user = auth_store.get_user(username)
    if user is None or user["password"] != password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_credentials",
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
