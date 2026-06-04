#!/usr/bin/env python3
"""Génère des fichiers de démo CSV/XLSX (60 lignes par défaut, jusqu'à 5000).

Usage :
  python3 generate_demo_data.py
  python3 generate_demo_data.py --count 1500 --basename demo_transactions_large
"""

from __future__ import annotations

import argparse
import csv
import random
from dataclasses import dataclass
from datetime import date, time, timedelta
from pathlib import Path

COLUMNS = ["id", "date", "heure", "fournisseur", "montant", "categorie", "validateur"]

SUPPLIERS_BY_CATEGORY: dict[str, list[str]] = {
    "telecom": ["CAMTEL", "MTN Cameroun", "Orange Cameroun"],
    "energie": ["ENEO", "CDE", "SNH Cameroun"],
    "fournitures": [
        "SABC Distribution",
        "ETS Mendong Fournitures",
        "Boulangerie Le Pain du Quartier",
        "Imprimerie Centrale Yaoundé",
        "Papeterie du Centre",
    ],
    "transport": ["Taxi Union Douala", "Agence Voyages Cameroun Express", "Total Energies CM"],
    "services": ["Cabinet Me Nkodo", "Nettoyage Propre-Tech", "Maintenance Bureautique SARL"],
    "salaires": ["Paie personnel — RH interne"],
    "immobilier": ["Promoteur Immobilier Littoral", "Agence Foncière du Centre"],
    "investissement": ["GLOBAL INVEST LTD", "Holdings Afrique Centrale"],
}

VALIDATORS = [
    "M. Abena N.",
    "Mme. Fotso K.",
    "M. Tchamba P.",
    "Mme. Etoa L.",
    "M. Nguema J.",
    "Mme. Bekolo A.",
]

SUNDAY_JAN_2025 = date(2025, 1, 5)


@dataclass
class CheatEntry:
    anomaly_type: str
    row_ids: list[str]
    description: str


def random_weekday_2025(rng: random.Random) -> date:
    start = date(2025, 1, 1)
    end = date(2025, 12, 31)
    for _ in range(50):
        delta = rng.randint(0, (end - start).days)
        d = start + timedelta(days=delta)
        if d.weekday() < 5:
            return d
    return date(2025, 6, 15)


def random_business_time(rng: random.Random) -> str:
    hour = rng.randint(8, 17)
    minute = rng.choice([0, 15, 30, 45])
    return time(hour, minute).strftime("%H:%M")


def random_amount_fcfa(rng: random.Random, low: int = 15_000, high: int = 2_500_000) -> int:
    base = rng.randint(max(1, low // 1000), high // 1000) * 1000
    noise = rng.randint(-500, 500) * 10
    return max(low, min(high, base + noise))


def row_id(index: int) -> str:
    return f"T{index:04d}"


def build_normal_pool(rng: random.Random, start_index: int, count: int) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    categories = list(SUPPLIERS_BY_CATEGORY.keys())
    for i in range(count):
        cat = rng.choice(categories)
        supplier = rng.choice(SUPPLIERS_BY_CATEGORY[cat])
        d = random_weekday_2025(rng)
        rows.append(
            {
                "id": row_id(start_index + i),
                "date": d.isoformat(),
                "heure": random_business_time(rng),
                "fournisseur": supplier,
                "montant": str(random_amount_fcfa(rng)),
                "categorie": cat,
                "validateur": rng.choice(VALIDATORS),
            }
        )
    return rows


def plant_anomalies(rng: random.Random, rows: list[dict[str, str]], cheat: list[CheatEntry]) -> None:
    """Insère des anomalies connues (IDs renumérotés T0001… à la fin)."""
    next_idx = len(rows) + 1

    def append(row: dict[str, str], cheat_entry: CheatEntry) -> None:
        nonlocal next_idx
        rows.append(row)
        cheat.append(cheat_entry)
        next_idx += 1

    # Doublon exact
    dup_date = date(2025, 3, 14)
    dup_amount = 185_000
    ids_dup = [row_id(next_idx), row_id(next_idx + 1)]
    for h in ("10:15", "12:15"):
        append(
            {
                "id": ids_dup[0] if h == "10:15" else ids_dup[1],
                "date": dup_date.isoformat(),
                "heure": h,
                "fournisseur": "MTN Cameroun",
                "montant": str(dup_amount),
                "categorie": "telecom",
                "validateur": "M. Tchamba P.",
            },
            CheatEntry(
                "Doublon exact",
                ids_dup,
                f"Même jour, MTN, {dup_amount:,} FCFA, 2 h d'écart.".replace(",", " "),
            )
        )
    cheat[-1] = CheatEntry("Doublon exact", ids_dup, cheat[-1].description)

    # Nuit / dimanche
    append(
        {
            "id": row_id(next_idx),
            "date": SUNDAY_JAN_2025.isoformat(),
            "heure": "02:34",
            "fournisseur": "GLOBAL INVEST LTD",
            "montant": "4750000",
            "categorie": "investissement",
            "validateur": "—",
        },
        CheatEntry("Transaction de nuit", [row_id(next_idx - 1)], "Dimanche 02:34, 4 750 000 FCFA."),
    )

    # Outlier énergie
    energie_amounts = [int(r["montant"]) for r in rows if r["categorie"] == "energie"]
    avg_energie = sum(energie_amounts) / max(len(energie_amounts), 1)
    outlier_amount = int(round(35 * avg_energie))
    oid = row_id(next_idx)
    append(
        {
            "id": oid,
            "date": date(2025, 8, 22).isoformat(),
            "heure": "14:30",
            "fournisseur": "ENEO",
            "montant": str(outlier_amount),
            "categorie": "energie",
            "validateur": "Mme. Fotso K.",
        },
        CheatEntry("Outlier extrême", [oid], f"ENEO ≈ 35× moyenne énergie ({avg_energie:,.0f} FCFA).".replace(",", " ")),
    )

    # Montant rond + fournisseur unique
    uid = row_id(next_idx)
    append(
        {
            "id": uid,
            "date": date(2025, 5, 17).isoformat(),
            "heure": "11:00",
            "fournisseur": "Société Equipements Premium CM",
            "montant": "10000000",
            "categorie": "immobilier",
            "validateur": "M. Abena N.",
        },
        CheatEntry("Montant rond unique", [uid], "10 000 000 FCFA, fournisseur unique."),
    )

    # Cluster Benford (chiffre 7)
    benford_ids: list[str] = []
    for amount in (71_500, 78_200, 725_000, 74_800, 712_340, 79_050, 756_000, 73_100, 770_000, 71_900):
        bid = row_id(next_idx)
        benford_ids.append(bid)
        append(
            {
                "id": bid,
                "date": random_weekday_2025(rng).isoformat(),
                "heure": random_business_time(rng),
                "fournisseur": rng.choice(SUPPLIERS_BY_CATEGORY["fournitures"]),
                "montant": str(amount),
                "categorie": "fournitures",
                "validateur": rng.choice(VALIDATORS),
            },
            CheatEntry("", [], ""),
        )
        cheat.pop()
    cheat.append(
        CheatEntry(
            "Déviation Benford (digit 7)",
            benford_ids,
            f"{len(benford_ids)} montants commençant par 7.",
        )
    )

def generate_rows(count: int, seed: int = 42) -> tuple[list[dict[str, str]], list[CheatEntry]]:
    rng = random.Random(seed)
    cheat: list[CheatEntry] = []
    anomaly_slots = min(25, max(13, count // 60))
    normal_count = max(0, count - anomaly_slots)
    rows = build_normal_pool(rng, 1, normal_count)
    plant_anomalies(rng, rows, cheat)
    rng.shuffle(rows)
    while len(rows) < count:
        extra = build_normal_pool(rng, len(rows) + 1, 1)[0]
        rows.append(extra)
    if len(rows) > count:
        rows = rows[:count]
    for i, row in enumerate(rows, start=1):
        row["id"] = row_id(i)
    return rows, cheat


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def write_xls(path: Path, rows: list[dict[str, str]]) -> None:
    """Excel 97-2003 (.xls) via xlwt (pandas 2.x n'expose plus engine=xlwt)."""
    import xlwt

    wb = xlwt.Workbook()
    sheet = wb.add_sheet("Transactions")
    for col, name in enumerate(COLUMNS):
        sheet.write(0, col, name)
    for row_idx, row in enumerate(rows, start=1):
        for col, name in enumerate(COLUMNS):
            sheet.write(row_idx, col, row[name])
    wb.save(str(path))


def write_excel(path: Path, rows: list[dict[str, str]]) -> None:
    import pandas as pd

    suffix = path.suffix.lower()
    if suffix == ".xls":
        write_xls(path, rows)
        return
    df = pd.DataFrame(rows, columns=COLUMNS)
    df.to_excel(path, index=False, sheet_name="Transactions")


def main() -> None:
    parser = argparse.ArgumentParser(description="Génère des fichiers démo FinAudit")
    parser.add_argument("--count", type=int, default=60, help="Nombre de transactions (défaut 60)")
    parser.add_argument(
        "--basename",
        type=str,
        default="demo_transactions",
        help="Nom de base sans extension (défaut demo_transactions)",
    )
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if args.count < 1:
        raise SystemExit("--count doit être >= 1")
    if args.count > 5000:
        raise SystemExit("--count max 5000 (limite FINAUDIT_MAX_ROWS)")

    backend_dir = Path(__file__).resolve().parent
    base = backend_dir / args.basename
    rows, cheat = generate_rows(args.count, seed=args.seed)

    csv_path = base.with_suffix(".csv")
    xlsx_path = base.with_suffix(".xlsx")
    xls_path = base.with_suffix(".xls")

    write_csv(csv_path, rows)
    write_excel(xlsx_path, rows)
    try:
        write_excel(xls_path, rows)
        xls_msg = str(xls_path)
    except Exception as exc:
        xls_msg = f"non généré ({exc}) — utilisez le .xlsx"

    print(f"CSV  : {csv_path} ({len(rows)} lignes)")
    print(f"XLSX : {xlsx_path}")
    print(f"XLS  : {xls_msg}")
    print("\n" + "=" * 60)
    print("CHEAT SHEET — DÉMO (ne pas partager en production)")
    print("=" * 60)
    for entry in cheat:
        if not entry.anomaly_type:
            continue
        print(f"\n[{entry.anomaly_type}]")
        print(f"  IDs : {', '.join(entry.row_ids[:8])}{'…' if len(entry.row_ids) > 8 else ''}")
        print(f"  → {entry.description}")
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
