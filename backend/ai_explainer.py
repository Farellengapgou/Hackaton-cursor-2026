from __future__ import annotations

import os
from typing import Any

from anthropic import Anthropic


def explain_anomaly(
    anomaly: dict[str, Any],
    transaction: dict[str, Any] | None,
    question: str | None = None,
) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return (
            "Clé API non configurée. Définissez ANTHROPIC_API_KEY pour activer "
            "les explications IA. Anomalie: "
            f"{anomaly.get('message', 'inconnue')}"
        )

    client = Anthropic(api_key=api_key)
    user_content = (
        f"Anomalie: {anomaly}\n"
        f"Transaction: {transaction or {}}\n"
        f"Question utilisateur: {question or 'Explique cette anomalie en français, brièvement.'}"
    )

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[
            {
                "role": "user",
                "content": user_content,
            }
        ],
    )
    block = message.content[0]
    return block.text if hasattr(block, "text") else str(block)
