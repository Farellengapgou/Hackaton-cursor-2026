from __future__ import annotations

import math
from statistics import mean, stdev
from typing import Any

import numpy as np
import pandas as pd

from schema_mapper import CANONICAL_COLUMNS

_IsolationForest: type | None = None
_sklearn_unavailable: str | None = None


def _get_isolation_forest() -> type | None:
    """Import paresseux — évite l'échec au démarrage si sklearn/pyarrow est cassé."""
    global _IsolationForest, _sklearn_unavailable
    if _IsolationForest is not None:
        return _IsolationForest
    if _sklearn_unavailable is not None:
        return None
    try:
        from sklearn.ensemble import IsolationForest

        _IsolationForest = IsolationForest
        return _IsolationForest
    except ImportError as exc:
        _sklearn_unavailable = str(exc)
        return None

# Réexport pour compatibilité
__all__ = [
    "AnomalyDetector",
    "build_summary",
    "benford_dataset_alert",
    "CANONICAL_COLUMNS",
]

# Loi de Benford : proportions théoriques des 1ers chiffres 1–9
BENFORD_EXPECTED = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046]
BENFORD_CHI2_THRESHOLD = 15.507  # χ², α=5 %, 8 ddl
BENFORD_MIN_AMOUNTS = 30


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


def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Compatibilité : délégué à schema_mapper.detect_and_normalize."""
    from schema_mapper import detect_and_normalize

    canonical, _ = detect_and_normalize(df)
    return canonical


class AnomalyDetector:
    """Règles métier + Isolation Forest — aucun appel réseau."""

    def analyze(
        self, df: pd.DataFrame
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Retourne (transactions, alertes niveau fichier — ex. Benford)."""
        if "_extra_fields" not in df.columns:
            extras = [{}] * len(df)
        else:
            extras = list(df["_extra_fields"])

        work = df[CANONICAL_COLUMNS].copy() if all(c in df.columns for c in CANONICAL_COLUMNS) else df
        n = len(work)
        if n == 0:
            return [], []

        amounts = work["montant"].astype(float).tolist()
        abs_amounts = [abs(a) for a in amounts]
        avg = mean(abs_amounts) if abs_amounts else 0.0
        spread = stdev(abs_amounts) if len(abs_amounts) > 1 else 0.0
        outlier_threshold = avg + (3 * spread if spread else abs(avg) * 0.5 or 100_000)

        dup_keys: dict[str, list[int]] = {}
        for idx, row in work.iterrows():
            key = (
                f"{row['date']}|{str(row['fournisseur']).strip().lower()}|"
                f"{float(row['montant']):.2f}"
            )
            dup_keys.setdefault(key, []).append(int(idx))

        fournisseur_counts = (
            work["fournisseur"].astype(str).str.strip().str.lower().value_counts()
        )
        benford_analysis = self._benford_dataset_analysis(amounts)
        dataset_alerts: list[dict[str, Any]] = []
        benford_alert = benford_dataset_alert(benford_analysis)
        if benford_alert:
            dataset_alerts.append(benford_alert)

        ml_scores, ml_flags = self._run_isolation_forest(work, extras)

        results: list[dict[str, Any]] = []
        for pos, (idx, row) in enumerate(work.iterrows()):
            i = int(idx)
            tx_id = str(row["id"] or pos + 1)
            montant = float(row["montant"] or 0)
            extra = extras[pos] if pos < len(extras) else {}
            if isinstance(extra, str):
                extra = {}
            anomalies: list[dict[str, Any]] = []

            if abs(montant) > outlier_threshold and montant != 0:
                anomalies.append(
                    {
                        "rule_name": "OUTLIER_STATISTIQUE",
                        "flagged": True,
                        "reason": (
                            f"Montant {montant:,.0f} FCFA supérieur au seuil "
                            f"statistique (~{outlier_threshold:,.0f} FCFA)."
                        ),
                        "severity": "critique" if abs(montant) > outlier_threshold * 1.5 else "suspect",
                        "score_contribution": 0.35,
                    }
                )

            key = f"{row['date']}|{str(row['fournisseur']).strip().lower()}|{montant:.2f}"
            if len(dup_keys.get(key, [])) > 1:
                others = [str(work.iloc[j]["id"]) for j in dup_keys[key] if j != i]
                anomalies.append(
                    {
                        "rule_name": "DOUBLON",
                        "flagged": True,
                        "reason": (
                            f"Doublon potentiel (même date, fournisseur, montant). "
                            f"IDs liés: {', '.join(others[:3])}."
                        ),
                        "severity": "suspect",
                        "score_contribution": 0.3,
                    }
                )

            if montant < 0:
                anomalies.append(
                    {
                        "rule_name": "MONTANT_NEGATIF",
                        "flagged": True,
                        "reason": f"Montant négatif ({montant:,.2f} FCFA) — écriture comptable atypique.",
                        "severity": "a_verifier",
                        "score_contribution": 0.15,
                    }
                )

            hour = _parse_hour(row["heure"])
            if hour is not None and (hour >= 22 or hour < 6):
                anomalies.append(
                    {
                        "rule_name": "HEURE_NOCTURNE",
                        "flagged": True,
                        "reason": (
                            f"Transaction à {row['heure']} (22h–06h, hors bureau GMT+1)."
                        ),
                        "severity": "critique",
                        "score_contribution": 0.35,
                    }
                )

            if montant > 0 and montant % 100_000 == 0:
                anomalies.append(
                    {
                        "rule_name": "MONTANT_ROND",
                        "flagged": True,
                        "reason": (
                            f"Montant rond {montant:,.0f} FCFA (multiple de 100 000)."
                        ),
                        "severity": "a_verifier",
                        "score_contribution": 0.2,
                    }
                )

            f_key = str(row["fournisseur"]).strip().lower()
            if f_key and fournisseur_counts.get(f_key, 0) == 1:
                anomalies.append(
                    {
                        "rule_name": "FOURNISSEUR_UNIQUE",
                        "flagged": True,
                        "reason": f"Fournisseur « {row['fournisseur']} » unique dans l'import.",
                        "severity": "suspect",
                        "score_contribution": 0.2,
                    }
                )

            ml_flag = ml_flags[pos] if pos < len(ml_flags) else False
            ml_score = ml_scores[pos] if pos < len(ml_scores) else 0.0
            if ml_flag:
                anomalies.append(
                    {
                        "rule_name": "ISOLATION_FOREST",
                        "flagged": True,
                        "reason": (
                            f"Transaction atypique (apprentissage non supervisé, "
                            f"score {ml_score:.2f}) — combinaison montant/heure/catégorie."
                        ),
                        "severity": "suspect",
                        "score_contribution": 0.25,
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
                    "extra_fields": extra,
                    "ml_score": round(ml_score, 4),
                    "ml_flagged": bool(ml_flag),
                    "risk_score": risk_score,
                    "severity": _severity_from_score(risk_score),
                    "anomalies": anomalies,
                }
            )

        return results, dataset_alerts

    def _run_isolation_forest(
        self, df: pd.DataFrame, extras: list[dict[str, Any]]
    ) -> tuple[list[float], list[bool]]:
        n = len(df)
        if n < 8:
            return [0.0] * n, [False] * n

        hours = []
        for h in df["heure"]:
            parsed = _parse_hour(h)
            hours.append(float(parsed if parsed is not None else 12))

        days = pd.to_datetime(df["date"], errors="coerce").dt.dayofweek.fillna(0).astype(float)
        cats = pd.Categorical(df["categorie"].astype(str)).codes.astype(float)
        montants = np.log1p(df["montant"].astype(float).abs().values)

        features = np.column_stack([montants, hours, days.values, cats])

        for i, ex in enumerate(extras):
            if i >= n:
                break
            for key in ("Account_key", "account_key", "Territory_key", "territory_key"):
                if key in ex:
                    try:
                        features[i, 0] = features[i, 0]  # keep montant primary
                        break
                    except Exception:
                        pass

        IsolationForestCls = _get_isolation_forest()
        if IsolationForestCls is None:
            return [0.0] * n, [False] * n

        try:
            clf = IsolationForestCls(
                contamination=0.1,
                random_state=42,
                n_estimators=100,
            )
            clf.fit(features)
            raw_scores = clf.decision_function(features)
            preds = clf.predict(features)
            min_s, max_s = float(raw_scores.min()), float(raw_scores.max())
            span = max_s - min_s if max_s != min_s else 1.0
            norm = [float((max_s - s) / span) for s in raw_scores]
            flags = [bool(p == -1) for p in preds]
            return norm, flags
        except Exception:
            return [0.0] * n, [False] * n

    def compute_risk_score(self, anomalies: list[dict[str, Any]]) -> int:
        if not anomalies:
            return 0
        raw = sum(
            float(a.get("score_contribution", 0.1)) for a in anomalies if a.get("flagged")
        )
        return min(100, int(round(raw * 100)))

    def _benford_dataset_analysis(self, amounts: list[float]) -> dict[str, Any]:
        """Test χ² sur effectifs (8 ddl) — signal fichier, pas par ligne."""
        positive = [abs(a) for a in amounts if a is not None and abs(a) >= 1]
        n_valid = len(positive)
        base = {
            "threshold": BENFORD_CHI2_THRESHOLD,
            "min_amounts": BENFORD_MIN_AMOUNTS,
        }
        if n_valid < BENFORD_MIN_AMOUNTS:
            return {
                **base,
                "triggered": False,
                "chi2": None,
                "n": n_valid,
                "top_digit": None,
                "message": (
                    f"Benford non évalué : {n_valid} montants "
                    f"(minimum {BENFORD_MIN_AMOUNTS} requis)."
                ),
            }

        counts = [0] * 9
        for a in positive:
            s = str(int(abs(a)))
            d = int(s[0])
            if 1 <= d <= 9:
                counts[d - 1] += 1

        total = sum(counts)
        if total == 0:
            return {
                **base,
                "triggered": False,
                "chi2": None,
                "n": 0,
                "top_digit": None,
                "message": "Benford non évalué : aucun premier chiffre valide.",
            }

        chi2 = 0.0
        for i, exp_prop in enumerate(BENFORD_EXPECTED):
            expected_count = total * exp_prop
            observed = counts[i]
            if expected_count > 0:
                chi2 += (observed - expected_count) ** 2 / expected_count

        triggered = chi2 > BENFORD_CHI2_THRESHOLD

        top_digit: int | None = None
        max_dev = -1.0
        for i in range(9):
            obs_prop = counts[i] / total
            dev = abs(obs_prop - BENFORD_EXPECTED[i])
            if dev > max_dev:
                max_dev = dev
                top_digit = i + 1

        if triggered:
            message = (
                "Distribution des premiers chiffres anormale sur tout le fichier "
                f"(pas une ligne en particulier). χ²={chi2:.2f} > seuil "
                f"{BENFORD_CHI2_THRESHOLD} (n={total} montants"
                + (
                    f", chiffre le plus dévié : {top_digit})."
                    if top_digit
                    else ")."
                )
            )
        else:
            message = (
                f"Benford : pas d'écart significatif au niveau fichier "
                f"(χ²={chi2:.2f}, n={total})."
            )

        return {
            **base,
            "triggered": triggered,
            "chi2": round(chi2, 3),
            "n": total,
            "top_digit": top_digit,
            "message": message,
        }


def benford_dataset_alert(analysis: dict[str, Any]) -> dict[str, Any] | None:
    """Convertit l'analyse Benford en alerte `summary.dataset_alerts`."""
    if not analysis.get("triggered"):
        return None
    return {
        "type": "BENFORD_DEVIATION",
        "scope": "file",
        "chi2": analysis.get("chi2"),
        "threshold": analysis.get("threshold", BENFORD_CHI2_THRESHOLD),
        "n_amounts": analysis.get("n"),
        "top_digit": analysis.get("top_digit"),
        "message": analysis.get("message", ""),
    }


def build_summary(
    transactions: list[dict[str, Any]],
    dataset_alerts: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    total = len(transactions)
    flagged = sum(1 for t in transactions if t.get("anomalies"))
    pct = round((flagged / total * 100) if total else 0.0, 1)
    alerts = dataset_alerts or []
    return {
        "total": total,
        "flagged_count": flagged,
        "pct_flagged": pct,
        "dataset_alerts": alerts,
        "dataset_alerts_count": len(alerts),
    }
