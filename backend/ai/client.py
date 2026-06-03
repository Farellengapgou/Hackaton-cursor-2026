"""Initialisation paresseuse du client Anthropic.

Le client n'est créé que lorsqu'une clé API est disponible. L'import du SDK
est lui aussi différé pour que le backend démarre même si la dépendance n'est
pas installée dans un environnement de développement minimal.
"""

from __future__ import annotations

from typing import Any

from config import settings


def get_client() -> Any | None:
    """Renvoie un client Anthropic configuré, ou ``None`` si pas de clé API."""
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        return None

    from anthropic import Anthropic

    return Anthropic(api_key=api_key)
