"""Prompts Gemini calibrés (Google Prompt Engineering + contexte FinAudit)."""

from __future__ import annotations

import json
import os
from typing import Any

# gemini-1.5-flash → 404 ; gemini-2.0-flash → quota free tier 0 sur certains projets
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
GENERATION_CONFIG = {
    "temperature": 0.15,
    "top_p": 0.9,
    "max_output_tokens": 600,
}
CHAT_GENERATION_CONFIG = {
    "temperature": 0.15,
    "top_p": 0.9,
    "max_output_tokens": 450,
}

SYSTEM_PROMPT = """Tu es FinAudit, auditeur forensic pour une PME camerounaise.
Devise : FCFA. Fuseau : GMT+1. Horaires bureau typiques : 08h-18h lun-ven.

Règles strictes :
- Utilise UNIQUEMENT les faits du JSON (montants, règles, ratios, heures, fournisseur).
- Réponds d'abord à la question posée, sans généralités vagues.
- Cite au moins 2 chiffres ou libellés précis du JSON (montant FCFA, ratio, score, nom de règle).
- Termine toujours par une action concrète pour l'auditeur (vérifier, suspendre, demander pièce…).
- Si l'information manque dans le JSON, dis « non disponible dans le fichier » en une phrase.
- Interdit : « il serait bon de vérifier » sans dire quoi, qui, ou quel document.

Format de réponse (chat) :
Réponse : (1-2 phrases, directe)
Faits : (puces ou phrases avec chiffres du JSON)
Action : (1 phrase impérative)

Ton : professionnel, français clair."""

FEW_SHOT_EXPLAIN = """
Exemple de sortie attendue :
Niveau SUSPECT (62/100). Transaction TX-0048 : 4 750 000 FCFA chez Global Import SARL à 03h12,
soit 39× la moyenne de la catégorie « import ». Signaux : Outlier, FOURNISSEUR_UNIQUE.
Recommandation : suspendre le paiement et faire valider par la DAF sous 48 h.
"""

EXPLAIN_USER_TEMPLATE = """Analyse le contexte d'audit JSON et rédige une explication pour le comptable.

Consignes :
- 4 à 6 phrases
- Commence par le niveau CRITIQUE / SUSPECT / FAIBLE et le score /100
- Cite : id transaction, montant FCFA, fournisseur, heure si présente, ratio vs catégorie
- Liste chaque règle déclenchée avec sa raison telle qu'indiquée dans rules_triggered
- Termine par une recommandation d'action unique et vérifiable
{few_shot}

Contexte JSON :
{context_json}
"""

CHAT_USER_TEMPLATE = """Contexte d'audit JSON (transaction courante) :
{context_json}

Historique récent :
{history_json}

Question de l'utilisateur :
{question}

Consignes :
- Réponds UNIQUEMENT à cette question, en t'appuyant sur le JSON.
- Utilise le format : Réponse / Faits / Action
- Si la question demande « pourquoi » une anomalie : explique chaque entrée de rules_triggered en français simple (pas de jargon sans traduction).
- Ne répète pas l'historique sauf si la question y fait référence."""


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
        question=question.strip(),
    )
