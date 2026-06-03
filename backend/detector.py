"""Détection d'anomalies financières pour FinAudit.

Ce module expose UNIQUEMENT la classe :class:`AnomalyDetector`, qui applique
cinq règles de détection sur un :class:`pandas.DataFrame` dont les colonnes
attendues sont :

    id, date, heure, fournisseur, montant, categorie, validateur

Contraintes respectées :
    * dépendances limitées à ``pandas`` et ``numpy`` (aucune lib ML externe) ;
    * exécution déterministe et reproductible ;
    * sorties strictement JSON sérialisables (types Python natifs) ;
    * mapping cohérent des identifiants de transaction (colonne ``id``).
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd


class AnomalyDetector:
    """Applique cinq règles de détection d'anomalies sur des transactions.

    Chaque règle renvoie un dictionnaire au format strict suivant ::

        {
            "rule_name": str,
            "flagged": bool,
            "reason": str,
            "severity": "critique" | "suspect" | "a_verifier",
            "score_contribution": float,  # entre 0 et 1
        }

    Des clés additionnelles spécifiques à chaque règle (identifiants
    concernés, horaires, z-score, distribution de Benford, ...) sont ajoutées
    sans modifier ces clés obligatoires.
    """

    REQUIRED_COLUMNS: tuple[str, ...] = (
        "id",
        "date",
        "heure",
        "fournisseur",
        "montant",
        "categorie",
        "validateur",
    )

    SEVERITY_WEIGHTS: dict[str, float] = {
        "critique": 1.0,
        "suspect": 0.65,
        "a_verifier": 0.35,
    }

    DUPLICATE_WINDOW = pd.Timedelta(hours=24)
    NIGHT_START_HOUR = 22
    NIGHT_END_HOUR = 6
    ROUND_DIVISOR = 100_000
    OUTLIER_SIGMA = 3.0
    BENFORD_Z_THRESHOLD = 1.96
    # Valeur critique du chi-deux à 8 degrés de liberté, seuil 0.05.
    BENFORD_CHI2_CRITICAL = 15.507

    def __init__(self, df: pd.DataFrame) -> None:
        self.df = self._prepare(df)

    # ------------------------------------------------------------------
    # Préparation / utilitaires
    # ------------------------------------------------------------------
    def _prepare(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalise le DataFrame et précalcule les colonnes internes."""
        work = df.copy()

        for column in self.REQUIRED_COLUMNS:
            if column not in work.columns:
                work[column] = np.nan

        work["montant"] = pd.to_numeric(work["montant"], errors="coerce")

        date_str = work["date"].astype(str).str.strip()
        heure_str = work["heure"].astype(str).str.strip()
        combined = (date_str + " " + heure_str).str.strip()
        work["_dt"] = pd.to_datetime(combined, errors="coerce")

        # Heure indépendante de la date (robuste aux dates manquantes).
        work["_hour"] = pd.to_numeric(
            heure_str.str.extract(r"^(\d{1,2})", expand=False),
            errors="coerce",
        )

        return work

    @staticmethod
    def _native(value: Any) -> Any:
        """Convertit une valeur numpy/pandas en type Python JSON sérialisable."""
        if value is None:
            return None
        if isinstance(value, (np.integer,)):
            return int(value)
        if isinstance(value, (np.floating,)):
            number = float(value)
            return None if math.isnan(number) else number
        if isinstance(value, float) and math.isnan(value):
            return None
        if isinstance(value, np.bool_):
            return bool(value)
        return value

    def _id_list(self, mask: "pd.Series[bool]") -> list[Any]:
        """Retourne les identifiants uniques et triés correspondant au masque."""
        if mask is None or not bool(mask.any()):
            return []
        ids = [self._native(value) for value in self.df.loc[mask, "id"].tolist()]
        unique = {value for value in ids if value is not None}
        return sorted(unique, key=lambda item: str(item))

    @staticmethod
    def _clamp(value: float) -> float:
        return float(max(0.0, min(1.0, value)))

    @staticmethod
    def _first_digit(value: Any) -> int | None:
        """Renvoie le premier chiffre significatif (1-9) d'un montant."""
        try:
            number = abs(float(value))
        except (TypeError, ValueError):
            return None
        if number == 0 or math.isnan(number) or math.isinf(number):
            return None
        while number >= 10:
            number /= 10.0
        while number < 1:
            number *= 10.0
        digit = int(number)
        if digit < 1:
            return None
        if digit > 9:
            return 9
        return digit

    @staticmethod
    def _empty_rule(rule_name: str) -> dict[str, Any]:
        return {
            "rule_name": rule_name,
            "flagged": False,
            "reason": "Aucune transaction exploitable pour cette règle.",
            "severity": "a_verifier",
            "score_contribution": 0.0,
            "transaction_ids": [],
        }

    # ------------------------------------------------------------------
    # RULE 1 - DOUBLON
    # ------------------------------------------------------------------
    def rule_doublon(self) -> dict[str, Any]:
        """Même montant + même fournisseur dans une fenêtre de 24 heures."""
        rule_name = "DOUBLON"
        if self.df.empty:
            return self._empty_rule(rule_name)

        flagged_ids: set[Any] = set()
        duplicate_groups = 0

        grouped = self.df.dropna(subset=["_dt", "montant"]).groupby(
            ["fournisseur", "montant"], dropna=False, sort=False
        )
        for _, group in grouped:
            if len(group) < 2:
                continue
            ordered = group.sort_values("_dt")
            times = ordered["_dt"].tolist()
            ids = ordered["id"].tolist()
            count = len(ordered)
            group_hit = False
            for a in range(count):
                for b in range(a + 1, count):
                    if times[b] - times[a] <= self.DUPLICATE_WINDOW:
                        flagged_ids.add(self._native(ids[a]))
                        flagged_ids.add(self._native(ids[b]))
                        group_hit = True
                    else:
                        break
            if group_hit:
                duplicate_groups += 1

        flagged_ids.discard(None)
        flagged = len(flagged_ids) > 0
        total = max(len(self.df), 1)
        ratio = len(flagged_ids) / total

        if flagged:
            reason = (
                f"{len(flagged_ids)} transaction(s) en doublon "
                f"(même fournisseur et même montant sous 24h), "
                f"réparties sur {duplicate_groups} groupe(s)."
            )
            score = self._clamp(0.5 + 0.5 * ratio)
        else:
            reason = "Aucun doublon (fournisseur + montant) détecté sous 24h."
            score = 0.0

        return {
            "rule_name": rule_name,
            "flagged": flagged,
            "reason": reason,
            "severity": "suspect",
            "score_contribution": round(score, 4),
            "transaction_ids": sorted(flagged_ids, key=lambda item: str(item)),
            "duplicate_groups": int(duplicate_groups),
        }

    # ------------------------------------------------------------------
    # RULE 2 - HEURE_NOCTURNE
    # ------------------------------------------------------------------
    def rule_heure_nocturne(self) -> dict[str, Any]:
        """Transactions effectuées entre 22:00 et 06:00."""
        rule_name = "HEURE_NOCTURNE"
        if self.df.empty:
            return self._empty_rule(rule_name)

        hour = self.df["_hour"]
        mask = hour.notna() & ((hour >= self.NIGHT_START_HOUR) | (hour < self.NIGHT_END_HOUR))

        flagged = bool(mask.any())
        ids = self._id_list(mask)
        times_found = self.df.loc[mask, "heure"].astype(str).str.strip().tolist()
        total = max(len(self.df), 1)
        ratio = len(ids) / total

        if flagged:
            reason = (
                f"{len(ids)} transaction(s) en heure nocturne "
                f"(entre {self.NIGHT_START_HOUR}h et {self.NIGHT_END_HOUR}h)."
            )
            score = self._clamp(0.3 + 0.4 * ratio)
        else:
            reason = "Aucune transaction en plage horaire nocturne (22h-6h)."
            score = 0.0

        return {
            "rule_name": rule_name,
            "flagged": flagged,
            "reason": reason,
            "severity": "a_verifier",
            "score_contribution": round(score, 4),
            "transaction_ids": ids,
            "times_found": times_found,
        }

    # ------------------------------------------------------------------
    # RULE 3 - MONTANT_ROND
    # ------------------------------------------------------------------
    def rule_montant_rond(self) -> dict[str, Any]:
        """Montant divisible par 100 000 (contexte FCFA)."""
        rule_name = "MONTANT_ROND"
        if self.df.empty:
            return self._empty_rule(rule_name)

        montant = self.df["montant"]
        rounded = montant.round(0)
        mask = montant.notna() & (rounded != 0) & (np.mod(rounded, self.ROUND_DIVISOR) == 0)

        flagged = bool(mask.any())
        ids = self._id_list(mask)
        total = max(len(self.df), 1)
        ratio = len(ids) / total

        if flagged:
            reason = (
                f"{len(ids)} transaction(s) avec un montant rond "
                f"divisible par {self.ROUND_DIVISOR:,} FCFA.".replace(",", " ")
            )
            score = self._clamp(0.25 + 0.4 * ratio)
        else:
            reason = f"Aucun montant divisible par {self.ROUND_DIVISOR}."
            score = 0.0

        return {
            "rule_name": rule_name,
            "flagged": flagged,
            "reason": reason,
            "severity": "a_verifier",
            "score_contribution": round(score, 4),
            "transaction_ids": ids,
        }

    # ------------------------------------------------------------------
    # RULE 4 - OUTLIER_STATISTIQUE
    # ------------------------------------------------------------------
    def rule_outlier_statistique(self) -> dict[str, Any]:
        """Montant supérieur à moyenne + 3 * écart-type."""
        rule_name = "OUTLIER_STATISTIQUE"
        montant = self.df["montant"].dropna()
        if montant.empty:
            return self._empty_rule(rule_name)

        mean = float(montant.mean())
        std = float(montant.std(ddof=0))
        threshold = mean + self.OUTLIER_SIGMA * std

        if std == 0:
            return {
                "rule_name": rule_name,
                "flagged": False,
                "reason": "Écart-type nul : aucun outlier statistique possible.",
                "severity": "critique",
                "score_contribution": 0.0,
                "transaction_ids": [],
                "zscore": 0.0,
                "mean": round(mean, 4),
                "std": 0.0,
                "threshold": round(threshold, 4),
            }

        mask = self.df["montant"].notna() & (self.df["montant"] > threshold)
        flagged = bool(mask.any())
        ids = self._id_list(mask)

        if flagged:
            flagged_amounts = self.df.loc[mask, "montant"]
            max_z = float(((flagged_amounts - mean) / std).max())
            reason = (
                f"{len(ids)} transaction(s) au-delà du seuil "
                f"moyenne + 3σ ({threshold:.2f}); z-score max = {max_z:.2f}."
            )
            score = self._clamp(0.6 + 0.1 * (max_z - self.OUTLIER_SIGMA))
        else:
            max_z = 0.0
            reason = "Aucun montant au-delà de moyenne + 3 écarts-types."
            score = 0.0

        return {
            "rule_name": rule_name,
            "flagged": flagged,
            "reason": reason,
            "severity": "critique",
            "score_contribution": round(score, 4),
            "transaction_ids": ids,
            "zscore": round(max_z, 4),
            "mean": round(mean, 4),
            "std": round(std, 4),
            "threshold": round(threshold, 4),
        }

    # ------------------------------------------------------------------
    # RULE 5 - BENFORD_DEVIATION
    # ------------------------------------------------------------------
    def rule_benford_deviation(self) -> dict[str, Any]:
        """Analyse la distribution du premier chiffre via la loi de Benford."""
        rule_name = "BENFORD_DEVIATION"
        montant = self.df["montant"].dropna()
        montant = montant[montant != 0].abs()
        if montant.empty:
            return self._empty_rule(rule_name)

        first_digits = montant.map(self._first_digit).dropna().astype(int)
        sample_size = int(first_digits.shape[0])
        if sample_size == 0:
            return self._empty_rule(rule_name)

        counts = first_digits.value_counts().reindex(range(1, 10), fill_value=0)
        expected_prob = {digit: math.log10(1 + 1 / digit) for digit in range(1, 10)}

        distribution: dict[str, dict[str, float]] = {}
        chi_square = 0.0
        max_abs_z = 0.0
        flagged_digits: list[int] = []

        for digit in range(1, 10):
            observed = int(counts[digit])
            p_exp = expected_prob[digit]
            expected_count = p_exp * sample_size
            p_obs = observed / sample_size
            standard_error = math.sqrt(p_exp * (1 - p_exp) / sample_size)
            z_score = (p_obs - p_exp) / standard_error if standard_error > 0 else 0.0

            if expected_count > 0:
                chi_square += (observed - expected_count) ** 2 / expected_count

            max_abs_z = max(max_abs_z, abs(z_score))
            if z_score > self.BENFORD_Z_THRESHOLD:
                flagged_digits.append(digit)

            distribution[str(digit)] = {
                "observed": observed,
                "expected": round(expected_count, 4),
                "observed_ratio": round(p_obs, 4),
                "expected_ratio": round(p_exp, 4),
                "z_score": round(z_score, 4),
            }

        flagged = len(flagged_digits) > 0
        if flagged:
            digit_mask = self.df["montant"].map(self._first_digit).isin(flagged_digits)
            ids = self._id_list(digit_mask)
            severity = "critique" if chi_square > self.BENFORD_CHI2_CRITICAL else "suspect"
            reason = (
                f"Déviation Benford significative (z > {self.BENFORD_Z_THRESHOLD}) "
                f"pour le(s) chiffre(s) {flagged_digits}; "
                f"chi-deux = {chi_square:.2f}."
            )
            score = self._clamp(0.4 + 0.1 * (max_abs_z - self.BENFORD_Z_THRESHOLD))
        else:
            ids = []
            severity = "a_verifier"
            reason = (
                f"Distribution du premier chiffre conforme à la loi de Benford "
                f"(chi-deux = {chi_square:.2f})."
            )
            score = 0.0

        return {
            "rule_name": rule_name,
            "flagged": flagged,
            "reason": reason,
            "severity": severity,
            "score_contribution": round(score, 4),
            "transaction_ids": ids,
            "flagged_digits": flagged_digits,
            "chi_square": round(chi_square, 4),
            "max_zscore": round(max_abs_z, 4),
            "sample_size": sample_size,
            "distribution": distribution,
        }

    # ------------------------------------------------------------------
    # Orchestration
    # ------------------------------------------------------------------
    def run_all_rules(self) -> list[dict[str, Any]]:
        """Exécute les 5 règles et renvoie la liste de leurs dictionnaires."""
        return [
            self.rule_doublon(),
            self.rule_heure_nocturne(),
            self.rule_montant_rond(),
            self.rule_outlier_statistique(),
            self.rule_benford_deviation(),
        ]

    def analyze(self) -> dict[str, Any]:
        """Rapport complet : règles, anomalies déclenchées et score de risque."""
        rules = self.run_all_rules()
        anomalies = [rule for rule in rules if rule["flagged"]]
        risk_score = self.compute_risk_score(anomalies)
        return {
            "transactions_count": int(len(self.df)),
            "rules": rules,
            "anomalies": anomalies,
            "risk_score": risk_score,
            "risk_level": self._risk_level(risk_score),
        }

    @staticmethod
    def _risk_level(score: float) -> str:
        if score >= 70:
            return "critique"
        if score >= 40:
            return "suspect"
        return "faible"

    # ------------------------------------------------------------------
    # GLOBAL METHOD - compute_risk_score
    # ------------------------------------------------------------------
    @staticmethod
    def compute_risk_score(anomalies: list[dict[str, Any]]) -> float:
        """Combine les anomalies en un score de risque global de 0 à 100.

        Combinaison de type « OU probabiliste » : chaque contribution est
        pondérée par la gravité de la règle, puis agrégée de façon bornée afin
        de rester dans l'intervalle [0, 100] et de croître de manière monotone
        avec le nombre et l'intensité des anomalies.
        """
        if not anomalies:
            return 0.0

        complement = 1.0
        for anomaly in anomalies:
            if not anomaly.get("flagged", False):
                continue
            severity = str(anomaly.get("severity", "a_verifier"))
            weight = AnomalyDetector.SEVERITY_WEIGHTS.get(severity, 0.35)
            try:
                contribution = float(anomaly.get("score_contribution", 0.0))
            except (TypeError, ValueError):
                contribution = 0.0
            effective = max(0.0, min(1.0, contribution * weight))
            complement *= 1.0 - effective

        risk = (1.0 - complement) * 100.0
        return round(float(max(0.0, min(100.0, risk))), 2)
