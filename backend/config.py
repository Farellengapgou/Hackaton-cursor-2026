"""Configuration centrale de l'API FinAudit.

Toutes les valeurs sont surchargeables via variables d'environnement afin de
ne jamais committer de secrets (notamment ``ANTHROPIC_API_KEY``).
"""

from __future__ import annotations

import os


class Settings:
    """Paramètres applicatifs, lus depuis l'environnement avec valeurs par défaut."""

    APP_TITLE: str = "FinAudit API"

    # Origines CORS (séparées par des virgules). Ex. https://mon-site.com,http://localhost:8080
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv(
            "FINAUDIT_CORS_ORIGIN",
            "http://localhost:5173,http://localhost:8080",
        ).split(",")
        if o.strip()
    ]

    # Limite de lignes traitées par upload (garde-fou de performance).
    MAX_ROWS: int = int(os.getenv("FINAUDIT_MAX_ROWS", "5000"))

    # Configuration du modèle d'explication IA (Anthropic Claude).
    ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY")
    AI_MODEL: str = os.getenv("FINAUDIT_AI_MODEL", "claude-sonnet-4-20250514")
    AI_MAX_TOKENS: int = int(os.getenv("FINAUDIT_AI_MAX_TOKENS", "512"))


settings = Settings()
