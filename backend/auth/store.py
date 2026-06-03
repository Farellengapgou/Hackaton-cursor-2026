"""Stockage en mémoire des utilisateurs et des jetons (portée hackathon).

Structure des utilisateurs (conforme à la spécification) ::

    {
        username: {
            "user_id": str,
            "password": str,   # texte clair (simplification hackathon)
            "token": str | None,
        }
    }

Un index inverse ``token -> username`` est maintenu pour valider les jetons en
O(1). Aucune base de données : tout est volatile et réinitialisé au démarrage.
"""

from __future__ import annotations

import uuid
from typing import Any


class AuthStore:
    def __init__(self) -> None:
        self._users: dict[str, dict[str, Any]] = {}
        self._tokens: dict[str, str] = {}

    def get_user(self, username: str) -> dict[str, Any] | None:
        return self._users.get(username)

    def create_user(self, username: str, password: str) -> dict[str, Any]:
        user = {
            "user_id": uuid.uuid4().hex,
            "password": password,
            "token": None,
        }
        self._users[username] = user
        return user

    def issue_token(self, username: str) -> str:
        """Réutilise le jeton existant de l'utilisateur, ou en génère un nouveau."""
        user = self._users[username]
        token = user.get("token")
        if not token:
            token = uuid.uuid4().hex
            user["token"] = token
        self._tokens[token] = username
        return token

    def get_user_by_token(self, token: str) -> dict[str, Any] | None:
        username = self._tokens.get(token)
        if username is None:
            return None
        user = self._users.get(username)
        if user is None:
            return None
        return {"user_id": user["user_id"], "username": username}

    def revoke_token(self, token: str) -> None:
        username = self._tokens.pop(token, None)
        if username is not None:
            user = self._users.get(username)
            if user is not None and user.get("token") == token:
                user["token"] = None


# Instance unique partagée par l'application.
auth_store = AuthStore()
