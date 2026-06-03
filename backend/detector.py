from __future__ import annotations

from statistics import mean, stdev
from typing import Any

import pandas as pd

# Colonnes attendues (hackathon) + alias tolérés à l'import
CANONICAL_COLUMNS = [
    "id",
    "date",
    "heure",
    "fournisseur",
    "montant",
    "categorie",
    "validateur",
]

COLUMN_ALIASES: dict[str, list[str]] = {
    "id": ["id", "ID", "transaction_id"],
    "date": ["date", "Date", "jour"],
    "heure": ["heure", "time", "Time", "hour"],
    "fournisseur": ["fournisseur", "label", "libelle", "Label", "supplier", "beneficiaire"],
    "montant": ["montant", "amount", "Amount", "valeur"],
    "categorie": ["categorie", "category", "Category", "type"],
    "validateur": ["validateur", "validator", "user", "auteur"],
}


def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Map CSV columns to canonical hackathon schema."""
    col_map: dict[str, str] = {}
    lower_cols = {str(c).strip().lower(): c for c in df.columns}
    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            key = alias.lower()
            if key in lower_cols:
                col_map[lower_cols[key]] = canonical
                break
    out = df.rename(columns=col_map)
    for col in CANONICAL_COLUMNS:
        if col not in out.columns:
            out[col] = "" if col != "montant" else 0.0
    if "montant" in out.columns:
        out["montant"] = pd.to_numeric(
            out["montant"].astype(str).str.replace(",", ".").str.replace(" ", ""),
            errors="coerce",
        ).fillna(0.0)
    return out[CANONICAL_COLUMNS].copy()


def _parse_hour(heure: Any) -> int | None:
    if heure is None or (isinstance(heure, float) and pd.isna(heure)):
        return None
    s = str(heure).strip()
    if not s:
        return None
    for fmt in ("%H:%M:%S", "%H:%M", "%H%M"):
        try:
            from datetime import datetime

            return datetime.strptime(s[:8], fmt).hour
        except ValueError:
            continue
    parts = s.split(":")
    if parts and parts[0].isdigit():
        return int(parts[0]) % 24
    return None


def _severity_from_score(score: float) -> str:
    if score >= 75:
        return "critique"
    if score >= 40:
        return "suspect"
    return "a_verifier"


class AnomalyDetector:
    """Règles métier locales — aucun appel réseau."""

    def analyze(self, df: pd.DataFrame) -> list[dict[str, Any]]:
        df = normalize_dataframe(df)
        n = len(df)
        if n == 0:
            return []

        amounts = df["montant"].astype(float).tolist()
        avg = mean(amounts) if amounts else 0.0
        spread = stdev(amounts) if len(amounts) > 1 else 0.0
        outlier_threshold = avg + (3 * spread if spread else abs(avg) * 0.5 or 100_000)

        # Doublons: même fournisseur + montant + date
        dup_keys: dict[str, list[int]] = {}
        for idx, row in df.iterrows():
            key = (
                f"{row['date']}|{str(row['fournisseur']).strip().lower()}|"
                f"{float(row['montant']):.2f}"
            )
            dup_keys.setdefault(key, []).append(int(idx))

        # Fournisseurs uniques (une seule occurrence)
        fournisseur_counts = df["fournisseur"].astype(str).str.strip().str.lower().value_counts()

        # Benford global (stub léger — flag dataset si chi² simplifié échoue)
        benford_global_flag = self._benford_dataset_flag(amounts)

        results: list[dict[str, Any]] = []
        for idx, row in df.iterrows():
            i = int(idx)
            tx_id = str(row["id"] or i + 1)
            montant = float(row["montant"] or 0)
            anomalies: list[dict[str, Any]] = []

            # Rule: OUTLIER_STATISTIQUE (ex high_amount)
            if montant > outlier_threshold and montant > 0:
                anomalies.append(
                    {
                        "rule_name": "OUTLIER_STATISTIQUE",
                        "flagged": True,
                        "reason": (
                            f"Montant {montant:,.0f} FCFA supérieur au seuil "
                            f"statistique (~{outlier_threshold:,.0f} FCFA)."
                        ),
                        "severity": "critique" if montant > outlier_threshold * 1.5 else "suspect",
                        "score_contribution": 0.35,
                    }
                )

            # Rule: DOUBLON
            key = (
                f"{row['date']}|{str(row['fournisseur']).strip().lower()}|{montant:.2f}"
            )
            if len(dup_keys.get(key, [])) > 1:
                others = [str(df.iloc[j]["id"]) for j in dup_keys[key] if j != i]
                anomalies.append(
                    {
                        "rule_name": "DOUBLON",
                        "flagged": True,
                        "reason": (
                            f"Doublon potentiel avec la même date, fournisseur et montant "
                            f"(IDs liés: {', '.join(others[:3])})."
                        ),
                        "severity": "suspect",
                        "score_contribution": 0.3,
                    }
                )

            # Rule: MONTANT_NEGATIF
            if montant < 0:
                anomalies.append(
                    {
                        "rule_name": "MONTANT_NEGATIF",
                        "flagged": True,
                        "reason": f"Montant négatif ({montant:,.2f} FCFA) — à vérifier.",
                        "severity": "a_verifier",
                        "score_contribution": 0.15,
                    }
                )

            # Rule: HEURE_NOCTURNE (22h–06h, GMT+1 context in messages)
            hour = _parse_hour(row["heure"])
            if hour is not None and (hour >= 22 or hour < 6):
                anomalies.append(
                    {
                        "rule_name": "HEURE_NOCTURNE",
                        "flagged": True,
                        "reason": (
                            f"Transaction à {row['heure']} (plage nocturne 22h–06h, "
                            "hors horaires bureau Cameroun GMT+1)."
                        ),
                        "severity": "critique",
                        "score_contribution": 0.35,
                    }
                )

            # Rule: MONTANT_ROND (FCFA)
            if montant > 0 and montant % 100_000 == 0:
                anomalies.append(
                    {
                        "rule_name": "MONTANT_ROND",
                        "flagged": True,
                        "reason": (
                            f"Montant parfaitement rond ({montant:,.0f} FCFA, "
                            "multiple de 100 000) — signal de vigilance."
                        ),
                        "severity": "a_verifier",
                        "score_contribution": 0.2,
                    }
                )

            # Rule: FOURNISSEUR_UNIQUE
            f_key = str(row["fournisseur"]).strip().lower()
            if f_key and fournisseur_counts.get(f_key, 0) == 1:
                anomalies.append(
                    {
                        "rule_name": "FOURNISSEUR_UNIQUE",
                        "flagged": True,
                        "reason": (
                            f"Fournisseur « {row['fournisseur']} » n'apparaît qu'une fois "
                            "dans l'historique importé."
                        ),
                        "severity": "suspect",
                        "score_contribution": 0.2,
                    }
                )

            if benford_global_flag:
                anomalies.append(
                    {
                        "rule_name": "BENFORD_DEVIATION",
                        "flagged": True,
                        "reason": (
                            "La distribution des premiers chiffres des montants s'écarte "
                            "de la loi de Benford (signal forensique au niveau fichier)."
                        ),
                        "severity": "suspect",
                        "score_contribution": 0.15,
                    }
                )

            risk_score = self.compute_risk_score(anomalies)
            results.append(
                {
                    "id": tx_id,
                    "date": str(row["date"] or ""),
                    "heure": str(row["heure"] or ""),
                    "fournisseur": str(row["fournisseur"] or ""),
                    "montant": montant,
                    "categorie": str(row["categorie"] or ""),
                    "validateur": str(row["validateur"] or ""),
                    "risk_score": risk_score,
                    "severity": _severity_from_score(risk_score),
                    "anomalies": anomalies,
                }
            )

        return results

    def compute_risk_score(self, anomalies: list[dict[str, Any]]) -> int:
        if not anomalies:
            return 0
        raw = sum(float(a.get("score_contribution", 0.1)) for a in anomalies if a.get("flagged"))
        return min(100, int(round(raw * 100)))

    def _benford_dataset_flag(self, amounts: list[float]) -> bool:
        """Chi-square simplifié sur 1ers chiffres — phase complète en D1."""
        positive = [abs(a) for a in amounts if a and abs(a) >= 1]
        if len(positive) < 20:
            return False
        expected = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046]
        counts = [0] * 9
        for a in positive:
            s = str(int(a))
            d = int(s[0])
            if 1 <= d <= 9:
                counts[d - 1] += 1
        total = sum(counts)
        if total == 0:
            return False
        chi = 0.0
        for i, exp in enumerate(expected):
            obs = counts[i] / total
            if exp > 0:
                chi += (obs - exp) ** 2 / exp
        return chi > 0.05  # seuil permissif pour MVP scaffold


def build_summary(transactions: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(transactions)
    flagged = sum(1 for t in transactions if t.get("anomalies"))
    pct = round((flagged / total * 100) if total else 0.0, 1)
    return {
        "total": total,
        "flagged_count": flagged,
        "pct_flagged": pct,
    }
