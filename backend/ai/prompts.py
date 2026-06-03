"""Gabarits de prompts pour l'explication d'anomalies."""

from __future__ import annotations

from typing import Any

SYSTEM_PROMPT = (
    "Tu es un auditeur financier. Tu expliques des anomalies détectées sur "
    "des relevés bancaires de manière claire, concise et en français."
)

DEFAULT_QUESTION = "Explique cette anomalie en français, brièvement."


def build_user_content(
    anomaly: dict[str, Any],
    transaction: dict[str, Any] | None,
    question: str | None,
) -> str:
    """Construit le message utilisateur injectant anomalie, transaction et question."""
    return (
        f"Anomalie: {anomaly}\n"
        f"Transaction: {transaction or {}}\n"
        f"Question utilisateur: {question or DEFAULT_QUESTION}"
    )


def missing_key_message(anomaly: dict[str, Any]) -> str:
    """Message de repli lorsque la clé API n'est pas configurée."""
    return (
        "Clé API non configurée. Définissez ANTHROPIC_API_KEY pour activer "
        "les explications IA. Anomalie: "
        f"{anomaly.get('message', 'inconnue')}"
    )
