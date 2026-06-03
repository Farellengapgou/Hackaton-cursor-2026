#!/usr/bin/env python3
"""Tests Benford + pipeline analyze (sans réseau)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from detector import (
    BENFORD_CHI2_THRESHOLD,
    BENFORD_MIN_AMOUNTS,
    AnomalyDetector,
    build_summary,
)
from schema_mapper import read_upload


def _benford_on_lines(transactions: list) -> int:
    return sum(
        1
        for t in transactions
        for a in t.get("anomalies", [])
        if a.get("rule_name") == "BENFORD_DEVIATION"
    )


def test_file(name: str, expect_benford_alert: bool | None) -> bool:
    path = ROOT / name
    df, _ = read_upload(path.read_bytes(), path.name)
    txs, alerts = AnomalyDetector().analyze(df)
    summary = build_summary(txs, alerts)
    line_benford = _benford_on_lines(txs)
    has_alert = any(a.get("type") == "BENFORD_DEVIATION" for a in summary["dataset_alerts"])

    ok = True
    print(f"\n--- {name} ---")
    print(f"  lignes: {summary['total']}, signalées: {summary['flagged_count']}")
    print(f"  dataset_alerts: {summary['dataset_alerts_count']}")
    for a in summary["dataset_alerts"]:
        print(f"    {a['type']} chi2={a.get('chi2')} seuil={a.get('threshold')} n={a.get('n_amounts')}")

    if line_benford != 0:
        print(f"  FAIL: Benford sur {line_benford} ligne(s) (attendu 0)")
        ok = False
    else:
        print("  OK: aucun BENFORD par ligne")

    if expect_benford_alert is True and not has_alert:
        print("  FAIL: alerte fichier Benford attendue")
        ok = False
    elif expect_benford_alert is False and has_alert:
        print("  FAIL: alerte Benford inattendue")
        ok = False
    elif expect_benford_alert is True:
        a = summary["dataset_alerts"][0]
        if a.get("chi2", 0) <= BENFORD_CHI2_THRESHOLD:
            print(f"  FAIL: chi2 {a.get('chi2')} <= {BENFORD_CHI2_THRESHOLD}")
            ok = False
        else:
            print("  OK: alerte fichier Benford (chi2 > seuil)")
    elif expect_benford_alert is False:
        print("  OK: pas d'alerte Benford (échantillon trop petit ou normal)")

    # JSON serializable
    try:
        json.dumps({"summary": summary, "transactions": txs[:1]})
        print("  OK: JSON sérialisable")
    except TypeError as e:
        print(f"  FAIL: JSON {e}")
        ok = False

    return ok


def test_benford_min_amounts() -> bool:
    det = AnomalyDetector()
    small = [1000.0] * (BENFORD_MIN_AMOUNTS - 1)
    r = det._benford_dataset_analysis(small)
    if r["triggered"]:
        print("\n--- benford min amounts --- FAIL: triggered avec n<30")
        return False
    print("\n--- benford min amounts --- OK: non déclenché si n<30")
    return True


def main() -> int:
    print(f"Seuil χ²={BENFORD_CHI2_THRESHOLD}, min montants={BENFORD_MIN_AMOUNTS}")
    results = [
        test_file("sample_transactions.csv", expect_benford_alert=False),
        test_file("demo_transactions.csv", expect_benford_alert=True),
        test_benford_min_amounts(),
    ]
    if all(results):
        print("\n=== TOUS LES TESTS OK ===")
        return 0
    print("\n=== ÉCHECS ===")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
