from __future__ import annotations

import os
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from typing import Any

LLM_TIMEOUT_SECONDS = 3.0


class BaseExplainer(ABC):
    @abstractmethod
    def explain(
        self, transaction: dict[str, Any], anomalies: list[dict[str, Any]]
    ) -> dict[str, Any]:
        ...

    @abstractmethod
    def chat(
        self,
        transaction: dict[str, Any],
        anomalies: list[dict[str, Any]],
        user_message: str,
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        ...


class TemplateExplainer(BaseExplainer):
    """Explications déterministes — toujours disponibles, zéro réseau."""

    def explain(
        self, transaction: dict[str, Any], anomalies: list[dict[str, Any]]
    ) -> dict[str, Any]:
        score = transaction.get("risk_score", 0)
        severity = transaction.get("severity", "a_verifier")
        risk_level = severity.upper() if isinstance(severity, str) else "A_VERIFIER"

        if not anomalies:
            text = (
                f"Transaction {transaction.get('id')} : aucune anomalie détectée "
                f"(score {score}/100)."
            )
            return {
                "text": text,
                "risk_level": "FAIBLE",
                "recommendation": "Aucune action urgente requise.",
                "source": "template",
            }

        lines = [f"Niveau de risque : {risk_level} ({score}/100)", "", "Causes détectées :"]
        for a in anomalies:
            lines.append(f"• {a.get('rule_name', 'REGLE')} : {a.get('reason', '')}")

        rec = self._recommendation(score, anomalies)
        lines.extend(["", f"Recommandation : {rec}"])
        return {
            "text": "\n".join(lines),
            "risk_level": risk_level,
            "recommendation": rec,
            "source": "template",
        }

    def chat(
        self,
        transaction: dict[str, Any],
        anomalies: list[dict[str, Any]],
        user_message: str,
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        msg = (user_message or "").strip().lower()
        score = int(transaction.get("risk_score", 0) or 0)
        fournisseur = transaction.get("fournisseur", "N/A")
        montant = transaction.get("montant", 0)

        if any(w in msg for w in ("bloquer", "suspendre", "stopper", "valider")):
            if score > 75:
                reply = (
                    f"Compte tenu du score {score}/100, je recommande de suspendre ce "
                    f"paiement ({montant:,.0f} FCFA vers {fournisseur}) et de faire valider "
                    "par la direction financière avant exécution."
                )
            elif score > 40:
                reply = (
                    f"Score modéré ({score}/100) : vérifiez les pièces justificatives "
                    "avant de débloquer le paiement."
                )
            else:
                reply = (
                    "Risque faible : pas de blocage automatique nécessaire, "
                    "contrôle ponctuel suffisant."
                )
        elif any(w in msg for w in ("grave", "critique", "urgent")):
            reply = (
                f"Sévérité actuelle : {transaction.get('severity', 'a_verifier')}. "
                f"{len(anomalies)} signal(s) actif(s). "
                + (anomalies[0].get("reason", "") if anomalies else "")
            )
        elif any(w in msg for w in ("fournisseur", "beneficiaire", "danger")):
            has_unique = any(a.get("rule_name") == "FOURNISSEUR_UNIQUE" for a in anomalies)
            if has_unique:
                reply = (
                    f"« {fournisseur} » n'apparaît qu'une fois : signal d'alerte, "
                    "pas une preuve de fraude. Vérifiez l'existence légale du tiers."
                )
            else:
                reply = (
                    f"Le fournisseur « {fournisseur} » ne présente pas de signal "
                    "d'inhabitualité fort dans cet import."
                )
        elif any(w in msg for w in ("pourquoi", "expliquer", "raison", "score")):
            exp = self.explain(transaction, anomalies)
            reply = exp["text"]
        else:
            exp = self.explain(transaction, anomalies)
            reply = (
                f"{exp['text']}\n\n"
                "Vous pouvez demander : « Dois-je bloquer ? », « C'est grave ? », "
                "« Ce fournisseur est-il dangereux ? »"
            )

        return {"reply": reply, "source": "template"}

    def _recommendation(self, score: int, anomalies: list[dict[str, Any]]) -> str:
        if score > 75:
            return "Investigation prioritaire — suspendre le paiement si possible."
        if score > 40:
            return "Contrôle manuel des justificatifs sous 48 h."
        if anomalies:
            return "Vérification ponctuelle recommandée."
        return "Aucune action urgente."


class LLMExplainer(BaseExplainer):
    """Gemini optionnel — timeout 3s, fallback template sur toute erreur."""

    def __init__(self) -> None:
        self._template = TemplateExplainer()
        self._api_key = os.getenv("GEMINI_API_KEY", "").strip()

    def explain(
        self, transaction: dict[str, Any], anomalies: list[dict[str, Any]]
    ) -> dict[str, Any]:
        text = self._call_llm(
            "Tu es un auditeur forensic pour une PME camerounaise (FCFA, GMT+1). "
            "Réponds en français en 2-3 phrases : pourquoi cette transaction est suspecte, "
            "niveau CRITIQUE/SUSPECT/FAIBLE, une action concrète.",
            transaction,
            anomalies,
            None,
        )
        if text:
            return {
                "text": text,
                "risk_level": str(transaction.get("severity", "suspect")).upper(),
                "recommendation": self._template._recommendation(
                    int(transaction.get("risk_score", 0) or 0), anomalies
                ),
                "source": "llm",
            }
        return self._template.explain(transaction, anomalies)

    def chat(
        self,
        transaction: dict[str, Any],
        anomalies: list[dict[str, Any]],
        user_message: str,
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        text = self._call_llm(
            "Tu es un copilote d'audit financier (Cameroun, FCFA). Réponds brièvement en français.",
            transaction,
            anomalies,
            user_message,
            history,
        )
        if text:
            return {"reply": text, "source": "llm"}
        return self._template.chat(transaction, anomalies, user_message, history)

    def _call_llm(
        self,
        system: str,
        transaction: dict[str, Any],
        anomalies: list[dict[str, Any]],
        user_message: str | None,
        history: list[dict[str, str]] | None = None,
    ) -> str | None:
        if not self._api_key:
            return None
        try:
            import google.generativeai as genai

            genai.configure(api_key=self._api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = (
                f"{system}\n\nTransaction: {transaction}\n"
                f"Anomalies: {anomalies}\n"
            )
            if user_message:
                prompt += f"Question: {user_message}\n"
            if history:
                prompt += f"Historique: {history}\n"

            def _generate() -> str:
                response = model.generate_content(prompt)
                return (response.text or "").strip()

            with ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(_generate)
                return future.result(timeout=LLM_TIMEOUT_SECONDS)
        except (FuturesTimeoutError, Exception):
            return None


def get_explainer() -> BaseExplainer:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if key:
        return LLMExplainer()
    return TemplateExplainer()
