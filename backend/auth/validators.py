"""Règles de mot de passe et identifiant — messages explicites pour le front."""

from __future__ import annotations

import re

from fastapi import HTTPException, status

PASSWORD_RULES_FR = (
    "Le mot de passe doit contenir entre 8 et 64 caractères, "
    "au moins une majuscule (A-Z), une minuscule (a-z) et un chiffre (0-9). "
    "Caractères autorisés : lettres, chiffres et . _ - @"
)

USERNAME_RULES_FR = (
    "Identifiant de connexion invalide. Choisissez un nom pour vous connecter "
    "(3 à 32 caractères : lettres, chiffres, tiret ou underscore). "
    "Exemple : marie_audit. Ce n'est pas votre adresse e-mail."
)


def validate_username(username: str) -> str:
    u = (username or "").strip()
    if not u:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_username", "message": "Identifiant de connexion requis."},
        )
    if "@" in u:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_username",
                "message": "L'identifiant ne doit pas contenir @ (ce n'est pas une adresse e-mail).",
            },
        )
    if not re.fullmatch(r"^[A-Za-z0-9_-]{3,32}$", u):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_username", "message": USERNAME_RULES_FR},
        )
    return u


def validate_password(password: str) -> str:
    if not password or len(password) < 8 or len(password) > 64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_password", "message": PASSWORD_RULES_FR},
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_password", "message": PASSWORD_RULES_FR},
        )
    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_password", "message": PASSWORD_RULES_FR},
        )
    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_password", "message": PASSWORD_RULES_FR},
        )
    if not re.fullmatch(r"^[A-Za-z0-9._@-]+$", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_password", "message": PASSWORD_RULES_FR},
        )
    return password
