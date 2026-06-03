"""Prompts Gemini calibrés (Google Prompt Engineering + contexte FinAudit)."""

from __future__ import annotations

import json
import os
from typing import Any

# gemini-1.5-flash → 404 ; gemini-2.0-flash → quota free tier 0 sur certains projets
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
GENERATION_CONFIG = {
    "temperature": 0.2,
    "top_p": 0.95,
    "max_output_tokens": 512,
}
CHAT_GENERATION_CONFIG = {
    "temperature": 0.2,
    "top_p": 0.95,
    "max_output_tokens": 256,
}

SYSTEM_PROMPT = """Tu es FinAudit, auditeur forensic pour une PME camerounaise.
Devise : FCFA. Fuseau : GMT+1. Horaires bureau typiques : 08h-18h lun-ven.
Tu t'appuies UNIQUEMENT sur le JSON fourni. N'invente aucun fait absent du JSON.
Si une information manque, indique-le brièvement.
Ton : professionnel, clair, en français."""

FEW_SHOT_EXPLAIN = """
Exemple de sortie attendue :
Niveau SUSPECT (62/100). Cette transaction de 4 750 000 FCFA à 03:12 est 39 fois au-dessus
de la moyenne de sa catégorie. Le fournisseur n'apparaît qu'une fois. Recommandation :
suspendre le paiement et exiger validation DAF.
"""

EXPLAIN_USER_TEMPLATE = """Analyse le contexte d'audit JSON ci-dessous et rédige une explication pour le comptable.

Consignes :
- 3 à 5 phrases maximum
- Cite au moins 2 faits chiffrés tirés du JSON (montant FCFA, ratio, heure, score ML)
- Termine par une recommandation d'action concrète
- Indique le niveau : CRITIQUE, SUSPECT ou FAIBLE
{few_shot}

Contexte JSON :
{context_json}
"""

CHAT_USER_TEMPLATE = """Contexte d'audit JSON (transaction courante) :
{context_json}

Historique de conversation (si présent) :
{history_json}

Question de l'utilisateur :
{question}

Réponds en 2 à 4 phrases, en français, en t'appuyant uniquement sur le JSON."""


def build_explain_prompt(context: dict[str, Any]) -> str:
    return EXPLAIN_USER_TEMPLATE.format(
        few_shot=FEW_SHOT_EXPLAIN,
        context_json=json.dumps(context, ensure_ascii=False, indent=2),
    )


def build_chat_prompt(
    context: dict[str, Any],
    question: str,
    history: list[dict[str, str]] | None,
) -> str:
    hist = history[-6:] if history else []
    return CHAT_USER_TEMPLATE.format(
        context_json=json.dumps(context, ensure_ascii=False, indent=2),
        history_json=json.dumps(hist, ensure_ascii=False),
        question=question,
    )
