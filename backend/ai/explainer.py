"""Explication en langage naturel d'une anomalie via Anthropic Claude."""

from __future__ import annotations

from typing import Any

from ai.client import get_client
from ai.prompts import SYSTEM_PROMPT, build_user_content, missing_key_message
from config import settings


def explain_anomaly(
    anomaly: dict[str, Any],
    transaction: dict[str, Any] | None,
    question: str | None = None,
) -> str:
    """Renvoie une explication de l'anomalie, ou un message de repli sans clé API."""
    client = get_client()
    if client is None:
        return missing_key_message(anomaly)

    user_content = build_user_content(anomaly, transaction, question)
    message = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=settings.AI_MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )
    block = message.content[0]
    return block.text if hasattr(block, "text") else str(block)
