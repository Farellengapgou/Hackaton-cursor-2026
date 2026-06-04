"""Contexte JSON structuré pour explications template et Gemini."""

from __future__ import annotations

from statistics import mean
from typing import Any


def build_audit_context(
    transaction: dict[str, Any],
    all_transactions: list[dict[str, Any]],
    schema_report: dict[str, Any] | None = None,
    dataset_alerts: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    montant = float(transaction.get("montant", 0) or 0)
    categorie = str(transaction.get("categorie", "") or "")
    fournisseur = str(transaction.get("fournisseur", "") or "")

    cat_amounts = [
        float(t.get("montant", 0) or 0)
        for t in all_transactions
        if str(t.get("categorie", "") or "") == categorie and categorie
    ]
    moy_cat = mean(cat_amounts) if cat_amounts else 0.0
    ratio_cat = (abs(montant) / moy_cat) if moy_cat else 0.0

    f_key = fournisseur.strip().lower()
    fournisseur_occ = sum(
        1 for t in all_transactions if str(t.get("fournisseur", "")).strip().lower() == f_key
    )

    all_amounts = [abs(float(t.get("montant", 0) or 0)) for t in all_transactions]
    median_file = sorted(all_amounts)[len(all_amounts) // 2] if all_amounts else 0.0

    anomalies = transaction.get("anomalies", [])
    rule_lines = [
        f"{a.get('rule_name')}: {a.get('reason')}"
        for a in anomalies
        if a.get("rule_name")
    ]
    return {
        "transaction": {
            "id": transaction.get("id"),
            "date": transaction.get("date"),
            "heure": transaction.get("heure"),
            "fournisseur": fournisseur,
            "montant_fcfa": montant,
            "categorie": categorie,
            "validateur": transaction.get("validateur", ""),
            "description": transaction.get("description", ""),
        },
        "assistant_brief": {
            "resume": (
                f"Transaction {transaction.get('id')} — {montant:,.0f} FCFA — "
                f"{fournisseur or 'fournisseur N/A'} — score {transaction.get('risk_score', 0)}/100"
            ),
            "signaux": rule_lines or ["aucun signal"],
            "comparaisons": {
                "ratio_vs_moyenne_categorie": round(ratio_cat, 2),
                "fournisseur_occurrences_dans_fichier": fournisseur_occ,
                "montant_median_fichier_fcfa": median_file,
            },
        },
        "risk_score": transaction.get("risk_score", 0),
        "severity": transaction.get("severity", "a_verifier"),
        "rules_triggered": [
            {
                "rule_name": a.get("rule_name"),
                "reason": a.get("reason"),
                "severity": a.get("severity"),
            }
            for a in anomalies
        ],
        "stats": {
            "montant_moyen_categorie": round(moy_cat, 2),
            "ratio_vs_moyenne_categorie": round(ratio_cat, 2),
            "fournisseur_occurrences": fournisseur_occ,
            "montant_median_fichier": median_file,
        },
        "ml": {
            "isolation_forest_score": transaction.get("ml_score"),
            "isolation_forest_flagged": bool(transaction.get("ml_flagged")),
        },
        "extra_fields": transaction.get("extra_fields") or {},
        "schema_hints": {
            "warnings": (schema_report or {}).get("warnings", []),
            "unmapped_columns": (schema_report or {}).get("unmapped_columns", []),
        },
        "dataset_alerts": dataset_alerts or [],
    }
