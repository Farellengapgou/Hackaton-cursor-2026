from __future__ import annotations

import os
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from typing import Any

from prompts import (
    CHAT_GENERATION_CONFIG,
    GEMINI_MODEL,
    GENERATION_CONFIG,
    SYSTEM_PROMPT,
    build_chat_prompt,
    build_explain_prompt,
)

LLM_TIMEOUT_SECONDS = 5.0


class BaseExplainer(ABC):
    @abstractmethod
    def explain(
        self,
        transaction: dict[str, Any],
        anomalies: list[dict[str, Any]],
        context: dict[str, Any],
    ) -> dict[str, Any]:
        ...

    @abstractmethod
    def chat(
        self,
        transaction: dict[str, Any],
        anomalies: list[dict[str, Any]],
        user_message: str,
        context: dict[str, Any],
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        ...


def _causes(anomalies: list[dict[str, Any]]) -> list[str]:
    return [str(a.get("rule_name", "")) for a in anomalies if a.get("rule_name")]


class TemplateExplainer(BaseExplainer):
    """Explications déterministes — zéro réseau."""

    def explain(
        self,
        transaction: dict[str, Any],
        anomalies: list[dict[str, Any]],
        context: dict[str, Any],
    ) -> dict[str, Any]:
        score = int(transaction.get("risk_score", 0) or 0)
        tx = context.get("transaction", {})
        stats = context.get("stats", {})
        ml = context.get("ml", {})
        montant = float(tx.get("montant_fcfa", 0) or 0)
        ratio = stats.get("ratio_vs_moyenne_categorie", 0)
        extra = context.get("extra_fields") or {}

        if not anomalies:
            return {
                "text": (
                    f"Transaction {tx.get('id')} : aucune anomalie (score {score}/100)."
                ),
                "risk_level": "FAIBLE",
                "recommendation": "Aucune action urgente.",
                "source": "template",
                "causes": [],
            }

        severity = transaction.get("severity", "a_verifier")
        risk_level = str(severity).upper()

        parts = [
            f"Niveau {risk_level} ({score}/100).",
            (
                f"Montant {montant:,.0f} FCFA"
                + (f", soit {ratio:.1f}× la moyenne de la catégorie." if ratio > 1 else ".")
            ),
        ]
        if tx.get("heure"):
            parts.append(f"Heure : {tx.get('heure')}.")
        if ml.get("isolation_forest_flagged"):
            parts.append(
                f"Isolation Forest : signal multivarié (score {ml.get('isolation_forest_score')})."
            )
        if extra:
            extra_bits = ", ".join(f"{k}={v}" for k, v in list(extra.items())[:3])
            parts.append(f"Données complémentaires : {extra_bits}.")

        parts.append("Causes : " + "; ".join(_causes(anomalies)) + ".")
        rec = self._recommendation(score)
        parts.append(f"Recommandation : {rec}")

        return {
            "text": " ".join(parts),
            "risk_level": risk_level,
            "recommendation": rec,
            "source": "template",
            "causes": _causes(anomalies),
        }

    def chat(
        self,
        transaction: dict[str, Any],
        anomalies: list[dict[str, Any]],
        user_message: str,
        context: dict[str, Any],
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        msg = (user_message or "").strip().lower()
        score = int(transaction.get("risk_score", 0) or 0)
        tx = context.get("transaction", {})
        fournisseur = tx.get("fournisseur", "N/A")
        montant = float(tx.get("montant_fcfa", 0) or 0)
        extra = context.get("extra_fields") or {}

        if any(w in msg for w in ("bloquer", "suspendre", "stopper", "valider")):
            if score > 75:
                reply = (
                    f"Score {score}/100 : suspendre le paiement de {montant:,.0f} FCFA "
                    f"vers {fournisseur} et faire valider par la DAF."
                )
            elif score > 40:
                reply = "Score modéré : vérifier facture et validation hiérarchique avant paiement."
            else:
                reply = "Risque faible : pas de blocage automatique requis."
        elif any(w in msg for w in ("grave", "critique", "urgent")):
            reply = (
                f"Sévérité {transaction.get('severity')} — {len(anomalies)} signal(s). "
                + (anomalies[0].get("reason", "") if anomalies else "")
            )
        elif any(w in msg for w in ("fournisseur", "beneficiaire", "danger", "compte")):
            if any(a.get("rule_name") == "FOURNISSEUR_UNIQUE" for a in anomalies):
                reply = (
                    f"« {fournisseur} » est unique dans le fichier : alerte, pas preuve de fraude."
                )
            elif extra:
                reply = (
                    f"Fournisseur {fournisseur}. Champs extra : "
                    + ", ".join(f"{k}={v}" for k, v in list(extra.items())[:4])
                )
            else:
                reply = f"Pas de signal fournisseur fort pour « {fournisseur} »."
        elif any(w in msg for w in ("pourquoi", "expliquer", "raison", "score")):
            reply = self.explain(transaction, anomalies, context)["text"]
        else:
            reply = (
                self.explain(transaction, anomalies, context)["text"]
                + "\n\nQuestions possibles : bloquer ? gravité ? fournisseur ?"
            )

        return {"reply": reply, "source": "template"}

    def _recommendation(self, score: int) -> str:
        if score > 75:
            return "Investigation prioritaire — suspendre le paiement si possible."
        if score > 40:
            return "Contrôle des justificatifs sous 48 h."
        return "Vérification ponctuelle recommandée."


class LLMExplainer(BaseExplainer):
    """Gemini — timeout 5s, fallback template."""

    def __init__(self) -> None:
        self._template = TemplateExplainer()
        self._api_key = os.getenv("GEMINI_API_KEY", "").strip()

    def explain(
        self,
        transaction: dict[str, Any],
        anomalies: list[dict[str, Any]],
        context: dict[str, Any],
    ) -> dict[str, Any]:
        text = self._call_llm(build_explain_prompt(context), GENERATION_CONFIG)
        if text:
            return {
                "text": text,
                "risk_level": str(transaction.get("severity", "suspect")).upper(),
                "recommendation": self._template._recommendation(
                    int(transaction.get("risk_score", 0) or 0)
                ),
                "source": "llm",
                "causes": _causes(anomalies),
            }
        return self._template.explain(transaction, anomalies, context)

    def chat(
        self,
        transaction: dict[str, Any],
        anomalies: list[dict[str, Any]],
        user_message: str,
        context: dict[str, Any],
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        prompt = build_chat_prompt(context, user_message, history)
        text = self._call_llm(prompt, CHAT_GENERATION_CONFIG)
        if text:
            return {"reply": text, "source": "llm"}
        return self._template.chat(
            transaction, anomalies, user_message, context, history
        )

    def _call_llm(self, user_prompt: str, gen_config: dict[str, Any]) -> str | None:
        if not self._api_key:
            return None
        try:
            import google.generativeai as genai

            genai.configure(api_key=self._api_key)
            model = genai.GenerativeModel(
                GEMINI_MODEL,
                system_instruction=SYSTEM_PROMPT,
            )

            def _generate() -> str:
                response = model.generate_content(
                    user_prompt,
                    generation_config=gen_config,
                )
                return (response.text or "").strip()

            with ThreadPoolExecutor(max_workers=1) as pool:
                return pool.submit(_generate).result(timeout=LLM_TIMEOUT_SECONDS)
        except FuturesTimeoutError:
            return None
        except Exception as exc:
            import logging

            logging.getLogger("finaudit.explainer").warning(
                "Gemini call failed: %s", exc
            )
            return None


def get_explainer() -> BaseExplainer:
    if os.getenv("GEMINI_API_KEY", "").strip():
        return LLMExplainer()
    return TemplateExplainer()
