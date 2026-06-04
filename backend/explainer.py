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

LLM_TIMEOUT_SECONDS = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "12"))


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


# Libellés lisibles pour le mode règles (sans appeler Gemini).
RULE_LABELS_FR: dict[str, str] = {
    "OUTLIER_STATISTIQUE": "Montant inhabituel",
    "OUTLIER": "Montant inhabituel",
    "DOUBLON": "Doublon potentiel",
    "MONTANT_NEGATIF": "Montant négatif",
    "HEURE_NOCTURNE": "Heure atypique",
    "MONTANT_ROND": "Montant rond suspect",
    "FOURNISSEUR_UNIQUE": "Fournisseur unique dans le fichier",
    "ISOLATION_FOREST": "Profil atypique (machine learning)",
    "BENFORD_DEVIATION": "Loi de Benford (fichier entier)",
    "BENFORD": "Loi de Benford",
}


def _rule_label(rule_name: str) -> str:
    key = (rule_name or "").strip().upper().replace(" ", "_")
    return RULE_LABELS_FR.get(key, rule_name or "Signal")


def _is_why_anomaly_question(msg: str) -> bool:
    m = (msg or "").lower()
    if not any(w in m for w in ("pourquoi", "expliquer", "raison", "motif", "anomal", "signal", "détect", "detect", "alerte")):
        return False
    return any(
        w in m
        for w in (
            "pourquoi",
            "anomal",
            "signal",
            "détect",
            "detect",
            "alerte",
            "y'a",
            "y a",
            "il y a",
            "ya ",
            "quoi",
            "comment",
        )
    )


def _why_anomaly_reply(
    transaction: dict[str, Any],
    anomalies: list[dict[str, Any]],
    context: dict[str, Any],
) -> str:
    score = int(transaction.get("risk_score", 0) or 0)
    tx = context.get("transaction", {})
    stats = context.get("stats", {})
    montant = float(tx.get("montant_fcfa", 0) or 0)
    fournisseur = tx.get("fournisseur", "N/A")

    if not anomalies:
        reply = (
            f"Cette ligne ({tx.get('id')}) n'a pas de règle métier déclenchée dans l'import actuel "
            f"(score {score}/100)."
        )
        facts = (
            f"Montant {montant:,.0f} FCFA · fournisseur {fournisseur}. "
            "Le moteur n'a pas identifié de doublon, montant aberrant, heure nocturne, etc. sur cette écriture."
        )
        action = "Si vous pensiez à une autre ligne, sélectionnez-la dans la liste des transactions signalées."
        return _format_structured(reply, facts, action)

    lines = []
    for i, a in enumerate(anomalies, start=1):
        label = _rule_label(str(a.get("rule_name", "")))
        reason = str(a.get("reason", "")).strip()
        lines.append(f"{i}) **{label}** — {reason}")

    ratio = float(stats.get("ratio_vs_moyenne_categorie", 0) or 0)
    reply = (
        f"Cette transaction est signalée car {len(anomalies)} contrôle(s) automatique(s) "
        f"ont relevé un écart (score global {score}/100, niveau {transaction.get('severity', 'a_verifier')})."
    )
    facts = (
        f"Montant {montant:,.0f} FCFA chez {fournisseur}"
        + (f", soit {ratio:.1f}× la moyenne de sa catégorie." if ratio > 1.2 else ".")
        + " Détail : "
        + " | ".join(
            f"{_rule_label(str(a.get('rule_name', '')))}: {a.get('reason', '')}"
            for a in anomalies
        )
    )
    action = (
        "Vérifier la pièce justificative (facture, bon de commande), puis valider ou corriger avant paiement."
        if score > 40
        else "Contrôle léger : confirmer que l'écriture est attendue."
    )
    body = _format_structured(reply, facts, action)
    return body + "\n\n" + "\n".join(lines)


def _format_structured(reply: str, facts: str, action: str) -> str:
    return f"Réponse : {reply}\n\nFaits : {facts}\n\nAction : {action}"


def _tx_facts(tx: dict[str, Any], stats: dict[str, Any], anomalies: list[dict[str, Any]]) -> str:
    montant = float(tx.get("montant_fcfa", 0) or 0)
    parts = [
        f"ID {tx.get('id')}",
        f"{montant:,.0f} FCFA",
        f"fournisseur « {tx.get('fournisseur', 'N/A')} »",
        f"score {tx.get('risk_score', 'N/A')}/100",
    ]
    if tx.get("heure"):
        parts.append(f"heure {tx['heure']}")
    ratio = stats.get("ratio_vs_moyenne_categorie")
    if ratio and float(ratio) > 1.2:
        parts.append(f"{float(ratio):.1f}× la moyenne catégorie")
    if anomalies:
        parts.append(
            "signaux : "
            + "; ".join(
                f"{a.get('rule_name')} ({a.get('reason', '')[:80]})" for a in anomalies[:4]
            )
        )
    return " · ".join(parts)


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
        stats = context.get("stats", {})
        brief = context.get("assistant_brief", {})
        fournisseur = tx.get("fournisseur", "N/A")
        montant = float(tx.get("montant_fcfa", 0) or 0)
        extra = context.get("extra_fields") or {}
        facts = _tx_facts(
            {**tx, "risk_score": transaction.get("risk_score", 0)},
            stats,
            anomalies,
        )
        severity = str(transaction.get("severity", "a_verifier"))

        if any(w in msg for w in ("bloquer", "suspendre", "stopper", "geler", "paiement")):
            if score > 75:
                reply = (
                    f"Oui, suspension recommandée avant paiement de {montant:,.0f} FCFA "
                    f"vers {fournisseur}."
                )
                action = "Bloquer le virement et obtenir double validation DAF + responsable achats."
            elif score > 40:
                reply = "Suspension non obligatoire, mais contrôle renforcé avant règlement."
                action = "Exiger facture, bon de commande et visa hiérarchique sous 48 h."
            else:
                reply = "Non, le score ne justifie pas un blocage automatique."
                action = "Poursuivre le circuit normal avec contrôle ponctuel."
        elif any(w in msg for w in ("grave", "critique", "urgent", "risque", "sévérité", "severite")):
            reply = (
                f"Niveau {severity.upper()} ({score}/100) avec {len(anomalies)} signal(s) actif(s)."
            )
            action = (
                "Traiter en priorité cette ligne dans le rapport d'audit et documenter la décision."
                if score > 40
                else "Inscrire au contrôle de second niveau sans urgence immédiate."
            )
        elif any(w in msg for w in ("fournisseur", "beneficiaire", "bénéficiaire", "compte", "tiers")):
            occ = stats.get("fournisseur_occurrences", 0)
            if any(a.get("rule_name") == "FOURNISSEUR_UNIQUE" for a in anomalies):
                reply = (
                    f"« {fournisseur} » n'apparaît qu'une fois dans le fichier ({occ} occurrence) : "
                    "tiers à risque de contournement."
                )
                action = "Vérifier KYC, RCCM et historique des paiements hors fichier."
            else:
                reply = f"Pas d'alerte « fournisseur unique » pour « {fournisseur} » ({occ} occurrence(s))."
                action = "Contrôler quand même l'identité du tiers si montant élevé."
        elif any(w in msg for w in ("doublon", "duplicate", "dupli")):
            dup = next((a for a in anomalies if "DOUBLON" in str(a.get("rule_name", "")).upper()), None)
            if dup:
                reply = f"Doublon signalé : {dup.get('reason', '')}"
                action = "Comparer les pièces des deux écritures et annuler le doublon si confirmé."
            else:
                reply = "Aucune règle doublon sur cette ligne dans l'import actuel."
                action = "Rechercher manuellement même date / montant / fournisseur dans le GL."
        elif any(w in msg for w in ("benford", "chiffre", "distribution")):
            alert = next(
                (
                    a
                    for a in (context.get("dataset_alerts") or [])
                    if "benford" in str(a).lower()
                ),
                None,
            )
            if alert or any("BENFORD" in str(a.get("rule_name", "")).upper() for a in anomalies):
                reply = "Le fichier ou la ligne présente un signal lié à la loi de Benford (montants suspects)."
                action = "Étendre l'échantillon sur le journal des achats du trimestre."
            else:
                reply = "Pas de signal Benford spécifique sur cette transaction."
                action = "Conserver Benford comme contrôle global si alerte fichier active."
        elif any(w in msg for w in ("montant", "combien", "fcfa", "somme", "cher", "élevé", "eleve")):
            ratio = float(stats.get("ratio_vs_moyenne_categorie", 0) or 0)
            reply = (
                f"Montant {montant:,.0f} FCFA"
                + (f", soit {ratio:.1f}× la moyenne de la catégorie." if ratio > 1 else ".")
            )
            action = (
                "Comparer à la dernière facture du même fournisseur et au budget catégorie."
                if ratio > 2
                else "Valider le montant avec la pièce justificative."
            )
        elif any(w in msg for w in ("heure", "nuit", "week-end", "weekend", "horaire", "03h", "22h")):
            h = tx.get("heure") or "non renseignée"
            night = next((a for a in anomalies if "HEURE" in str(a.get("rule_name", "")).upper()), None)
            reply = f"Heure enregistrée : {h}." + (
                f" Signal : {night.get('reason')}" if night else " Pas d'anomalie horaire détectée."
            )
            action = "Croiser avec logs d'accès ERP et présence du validateur."
        elif any(w in msg for w in ("faire", "action", "recommand", "conseil", "suite", "étape", "etape")):
            reply = self._recommendation(score)
            action = reply
        elif _is_why_anomaly_question(msg):
            return {
                "reply": _why_anomaly_reply(transaction, anomalies, context),
                "source": "template",
            }
        elif any(w in msg for w in ("score",)) and "pourquoi" not in msg:
            body = self.explain(transaction, anomalies, context)["text"]
            return {"reply": body, "source": "template"}
        elif any(w in msg for w in ("règle", "regle", "règles", "regles", "type")):
            if anomalies:
                reply = "Règles déclenchées sur cette ligne :"
                facts = " · ".join(
                    f"{a.get('rule_name')}: {a.get('reason')}" for a in anomalies
                )
                action = "Traiter chaque signal dans l'ordre gravité décroissante."
            else:
                reply = "Aucune règle métier déclenchée ; score basé sur agrégats uniquement."
                action = "Aucune action spécifique requise."
            return {
                "reply": _format_structured(reply, facts, action),
                "source": "template",
            }
        else:
            reply = (
                f"Analyse de la transaction {tx.get('id')} : {brief.get('resume', facts)}."
            )
            action = self._recommendation(score)

        return {
            "reply": _format_structured(reply, facts, action),
            "source": "template",
        }

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
