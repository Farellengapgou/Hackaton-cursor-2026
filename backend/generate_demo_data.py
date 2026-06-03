#!/usr/bin/env python3
"""Génère demo_transactions.csv — 60 transactions camerounaises avec 5 anomalies cachées."""

from __future__ import annotations

import csv
import random
from dataclasses import dataclass
from datetime import date, time, timedelta
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent / "demo_transactions.csv"
COLUMNS = ["id", "date", "heure", "fournisseur", "montant", "categorie", "validateur"]

SUPPLIERS_BY_CATEGORY: dict[str, list[str]] = {
    "telecom": ["CAMTEL", "MTN Cameroun", "Orange Cameroun"],
    "energie": ["ENEO", "CDE"],
    "fournitures": [
        "SABC Distribution",
        "ETS Mendong Fournitures",
        "Boulangerie Le Pain du Quartier",
        "Imprimerie Centrale Yaoundé",
    ],
    "transport": ["Taxi Union Douala", "Agence Voyages Cameroun Express"],
    "services": ["Cabinet Me Nkodo", "Nettoyage Propre-Tech", "Maintenance Bureautique SARL"],
    "salaires": ["Paie personnel — RH interne"],
}

VALIDATORS = [
    "M. Abena N.",
    "Mme. Fotso K.",
    "M. Tchamba P.",
    "Mme. Etoa L.",
    "M. Nguema J.",
]

# Janvier 2025 — dimanches
SUNDAY_JAN_2025 = date(2025, 1, 5)


@dataclass
class CheatEntry:
    anomaly_type: str
    row_ids: list[str]
    description: str


def random_weekday_jan_2025(rng: random.Random) -> date:
    while True:
        d = date(2025, 1, rng.randint(1, 31))
        if d.weekday() < 5:  # lun–ven
            return d


def random_business_time(rng: random.Random) -> str:
    hour = rng.randint(8, 17)
    minute = rng.choice([0, 15, 30, 45]) if hour < 18 else 0
    if hour == 17 and minute > 0:
        minute = 0
    return time(hour, minute).strftime("%H:%M")


def random_amount_fcfa(rng: random.Random, low: int = 15_000, high: int = 2_500_000) -> int:
    base = rng.randint(low // 1000, high // 1000) * 1000
    noise = rng.randint(-500, 500) * 10
    amount = base + noise
    return max(low, min(high, amount))


def build_normal_pool(rng: random.Random, count: int) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    categories = list(SUPPLIERS_BY_CATEGORY.keys())
    for i in range(count):
        cat = rng.choice(categories)
        supplier = rng.choice(SUPPLIERS_BY_CATEGORY[cat])
        d = random_weekday_jan_2025(rng)
        rows.append(
            {
                "id": f"T{i+1:03d}",
                "date": d.isoformat(),
                "heure": random_business_time(rng),
                "fournisseur": supplier,
                "montant": str(random_amount_fcfa(rng)),
                "categorie": cat,
                "validateur": rng.choice(VALIDATORS),
            }
        )
    return rows


def main() -> None:
    rng = random.Random(42)
    rows: list[dict[str, str]] = []
    cheat: list[CheatEntry] = []

    # --- 47 transactions normales de base ---
    rows.extend(build_normal_pool(rng, 47))

    # --- Anomalie 1 : doublon exact (2 lignes, 2 h d'écart) ---
    dup_date = date(2025, 1, 14)
    dup_supplier = "MTN Cameroun"
    dup_amount = 185_000
    dup_cat = "telecom"
    dup_validator = "M. Tchamba P."
    rows.append(
        {
            "id": "T048",
            "date": dup_date.isoformat(),
            "heure": "10:15",
            "fournisseur": dup_supplier,
            "montant": str(dup_amount),
            "categorie": dup_cat,
            "validateur": dup_validator,
        }
    )
    rows.append(
        {
            "id": "T049",
            "date": dup_date.isoformat(),
            "heure": "12:15",
            "fournisseur": dup_supplier,
            "montant": str(dup_amount),
            "categorie": dup_cat,
            "validateur": dup_validator,
        }
    )
    cheat.append(
        CheatEntry(
            "1. Doublon exact",
            ["T048", "T049"],
            f"Même jour ({dup_date}), {dup_supplier}, {dup_amount:,} FCFA, écart 2 h (10:15 / 12:15).".replace(",", " "),
        )
    )

    # --- Anomalie 2 : transaction de nuit (dimanche 02:34) ---
    rows.append(
        {
            "id": "T050",
            "date": SUNDAY_JAN_2025.isoformat(),
            "heure": "02:34",
            "fournisseur": "GLOBAL INVEST LTD",
            "montant": "4750000",
            "categorie": "investissement",
            "validateur": "—",
        }
    )
    cheat.append(
        CheatEntry(
            "2. Transaction de nuit",
            ["T050"],
            f"Dimanche {SUNDAY_JAN_2025} 02:34, GLOBAL INVEST LTD, 4 750 000 FCFA.",
        )
    )

    # --- Anomalie 3 : outlier 40× moyenne catégorie « energie » ---
    energie_amounts = [
        int(r["montant"])
        for r in rows
        if r["categorie"] == "energie"
    ]
    if not energie_amounts:
        energie_amounts = [120_000, 95_000, 210_000]
    avg_energie = sum(energie_amounts) / len(energie_amounts)
    outlier_amount = int(round(40 * avg_energie))
    rows.append(
        {
            "id": "T051",
            "date": date(2025, 1, 22).isoformat(),
            "heure": "14:30",
            "fournisseur": "ENEO",
            "montant": str(outlier_amount),
            "categorie": "energie",
            "validateur": "Mme. Fotso K.",
        }
    )
    cheat.append(
        CheatEntry(
            "3. Outlier extrême (×40)",
            ["T051"],
            f"ENEO / energie : {outlier_amount:,} FCFA ≈ 40× moyenne catégorie ({avg_energie:,.0f} FCFA).".replace(",", " "),
        )
    )

    # --- Anomalie 4 : montant rond 10 000 000, fournisseur unique ---
    rows.append(
        {
            "id": "T052",
            "date": date(2025, 1, 17).isoformat(),
            "heure": "11:00",
            "fournisseur": "Société Equipements Premium CM",
            "montant": "10000000",
            "categorie": "immobilier",
            "validateur": "M. Abena N.",
        }
    )
    cheat.append(
        CheatEntry(
            "4. Montant rond unique",
            ["T052"],
            "10 000 000 FCFA exact, « Société Equipements Premium CM » n'apparaît qu'une fois.",
        )
    )

    # --- Anomalie 5 : cluster Benford (chiffre 7 sur-représenté) — 8 lignes ---
    benford_ids: list[str] = []
    benford_amounts = [
        71_500,
        78_200,
        725_000,
        74_800,
        712_340,
        79_050,
        756_000,
        73_100,
    ]
    for idx, amount in enumerate(benford_amounts, start=53):
        row_id = f"T{idx:03d}"
        benford_ids.append(row_id)
        rows.append(
            {
                "id": row_id,
                "date": random_weekday_jan_2025(rng).isoformat(),
                "heure": random_business_time(rng),
                "fournisseur": rng.choice(SUPPLIERS_BY_CATEGORY["fournitures"]),
                "montant": str(amount),
                "categorie": "fournitures",
                "validateur": rng.choice(VALIDATORS),
            }
        )
    cheat.append(
        CheatEntry(
            "5. Déviation Benford (digit 7)",
            benford_ids,
            f"{len(benford_ids)} montants commençant par 7 (sur {len(rows)} lignes) — surreprésentation.",
        )
    )

    assert len(rows) == 60, f"Attendu 60 lignes, obtenu {len(rows)}"

    with OUTPUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Fichier créé : {OUTPUT}")
    print(f"Transactions : {len(rows)}\n")
    print("=" * 60)
    print("CHEAT SHEET — DÉMO UNIQUEMENT (ne pas partager en prod)")
    print("=" * 60)
    for entry in cheat:
        print(f"\n[{entry.anomaly_type}]")
        print(f"  IDs : {', '.join(entry.row_ids)}")
        print(f"  → {entry.description}")
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
