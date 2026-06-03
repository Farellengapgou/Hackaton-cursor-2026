"""Import CSV/XLSX : mapping canonique, colonnes extra, rapport de schéma."""

from __future__ import annotations

import io
import re
from typing import Any

import pandas as pd

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
    "id": [
        "id",
        "transaction_id",
        "entryno",
        "entry_no",
        "numero_ecriture",
        "n°",
        "numero",
    ],
    "date": ["date", "date_comptable", "booking_date", "jour", "datum"],
    "heure": ["heure", "time", "hour", "heure_saisie"],
    "fournisseur": [
        "fournisseur",
        "label",
        "libelle",
        "libellé",
        "supplier",
        "beneficiaire",
        "details",
        "description",
        "intitule",
        "intitulé",
        "intitule_compte",
    ],
    "montant": ["montant", "amount", "valeur", "debit", "crédit", "credit"],
    "categorie": [
        "categorie",
        "category",
        "type",
        "account_key",
        "compte",
        "type_operation",
    ],
    "validateur": ["validateur", "validator", "user", "auteur", "saisi_par"],
}


def _is_empty_column(series: pd.Series) -> bool:
    return series.isna().all() or (series.astype(str).str.strip() == "").all()


def _parse_amount_value(val: Any) -> float:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return 0.0
    s = str(val).strip().replace("\u00a0", " ").replace(" ", "")
    s = s.replace(",", ".")
    if s.count(".") > 1:
        s = s.replace(".", "", s.count(".") - 1)
    try:
        return float(s)
    except ValueError:
        return 0.0


def _resolve_montant_column(df: pd.DataFrame, col_map: dict[str, str]) -> None:
    """Gère montant unique ou paires débit/crédit."""
    lower = {str(c).strip().lower(): c for c in df.columns}
    if "montant" in df.columns:
        return
    debit_col = None
    credit_col = None
    for key, orig in lower.items():
        if key in ("debit", "débit"):
            debit_col = orig
        if key in ("credit", "crédit"):
            credit_col = orig
    if debit_col or credit_col:
        d = df[debit_col].apply(_parse_amount_value) if debit_col else 0.0
        c = df[credit_col].apply(_parse_amount_value) if credit_col else 0.0
        df["montant"] = pd.Series(
            [max(abs(float(di)), abs(float(ci))) for di, ci in zip(d, c)],
            index=df.index,
        )
        if debit_col:
            col_map[debit_col] = "_debit_src"
        if credit_col:
            col_map[credit_col] = "_credit_src"


def load_file_to_dataframe(content: bytes, filename: str) -> pd.DataFrame:
    """Charge CSV ou XLSX en DataFrame brut."""
    name = (filename or "").lower()
    if name.endswith(".xlsx") or name.endswith(".xls"):
        return pd.read_excel(io.BytesIO(content), engine="openpyxl")
    return pd.read_csv(io.BytesIO(content), encoding="utf-8-sig")


def parse_journal_xlsx(content: bytes) -> pd.DataFrame:
    """Aplatit un journal comptable multi-lignes (modèle OHADA) en lignes transaction."""
    raw = pd.read_excel(io.BytesIO(content), header=None, engine="openpyxl")
    rows: list[dict[str, Any]] = []
    current_date = ""
    current_libelle = ""
    idx = 0

    for _, row in raw.iterrows():
        cells = [row.iloc[i] if i < len(row) else None for i in range(min(6, len(row)))]
        c2 = cells[2] if len(cells) > 2 else None
        c3 = cells[3] if len(cells) > 3 else None
        c4 = cells[4] if len(cells) > 4 else None
        c5 = cells[5] if len(cells) > 5 else None

        if c2 is not None and pd.notna(c2):
            s2 = str(c2).strip()
            if re.match(r"20\d{2}-\d{2}-\d{2}", s2) or "00:00:00" in s2:
                try:
                    current_date = pd.to_datetime(c2).strftime("%Y-%m-%d")
                except Exception:
                    current_date = s2[:10]
                current_libelle = str(c3 or "").strip()
                continue

        compte = str(c2 or "").strip()
        if compte.isdigit() and len(compte) >= 3:
            intitule = str(c3 or "").strip()
            debit = _parse_amount_value(c4)
            credit = _parse_amount_value(c5)
            montant = debit if debit > 0 else credit
            if montant <= 0:
                continue
            idx += 1
            rows.append(
                {
                    "id": f"ECR-{idx}",
                    "date": current_date,
                    "heure": "12:00",
                    "fournisseur": intitule or current_libelle or compte,
                    "montant": montant,
                    "categorie": compte,
                    "validateur": "",
                }
            )

    if rows:
        return pd.DataFrame(rows)
    return raw


def detect_and_normalize(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    Retourne (df_canonical avec colonnes CANONICAL + _extra_json), schema_report.
    """
    warnings: list[str] = []
    mapped_columns: dict[str, str] = {}
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    df = df.loc[:, [c for c in df.columns if not _is_empty_column(df[c]) and not str(c).startswith("Unnamed")]]

    lower_cols = {str(c).strip().lower(): c for c in df.columns}
    col_map: dict[str, str] = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            key = alias.lower()
            if key in lower_cols:
                orig = lower_cols[key]
                col_map[orig] = canonical
                mapped_columns[orig] = canonical
                break

    _resolve_montant_column(df, col_map)
    out = df.rename(columns={k: v for k, v in col_map.items() if not v.startswith("_")})

    for col in CANONICAL_COLUMNS:
        if col not in out.columns:
            if col == "montant":
                out[col] = 0.0
            elif col == "heure":
                out[col] = "12:00"
                warnings.append("Colonne heure absente — valeur par défaut 12:00 (GMT+1).")
            else:
                out[col] = ""

    if "montant" in out.columns:
        out["montant"] = out["montant"].apply(_parse_amount_value)

    if "date" in out.columns:
        out["date"] = pd.to_datetime(out["date"], errors="coerce").dt.strftime("%Y-%m-%d")
        out["date"] = out["date"].fillna("")

    mapped_origins = set(col_map.keys())
    unmapped = [c for c in df.columns if c not in mapped_origins and c in out.columns]

    extra_cols: list[str] = []
    for c in df.columns:
        if c not in mapped_origins and c in out.columns:
            extra_cols.append(c)

    extra_data: list[dict[str, Any]] = []
    for i, row in out.iterrows():
        extra: dict[str, Any] = {}
        for c in extra_cols:
            val = row.get(c)
            if val is not None and not (isinstance(val, float) and pd.isna(val)):
                extra[str(c)] = val if isinstance(val, (int, float)) else str(val)
        extra_data.append(extra)

    canonical = out[CANONICAL_COLUMNS].copy()
    canonical["_extra_fields"] = extra_data

    schema_report = {
        "mapped_columns": mapped_columns,
        "unmapped_columns": [str(c) for c in extra_cols],
        "warnings": warnings,
        "row_count": len(canonical),
    }
    return canonical, schema_report


def read_upload(content: bytes, filename: str) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Point d'entrée : fichier uploadé -> DataFrame normalisé + rapport."""
    name = (filename or "").lower()
    source_format = "xlsx" if name.endswith((".xlsx", ".xls")) else "csv"

    if name.endswith((".xlsx", ".xls")):
        df_flat = load_file_to_dataframe(content, filename)
        if len(df_flat.columns) >= 4 and any(
            str(c).lower() in ("amount", "montant", "entryno", "details") for c in df_flat.columns
        ):
            df_raw = df_flat
        else:
            df_raw = parse_journal_xlsx(content)
            if df_raw.empty or len(df_raw) < 2:
                df_raw = df_flat
    else:
        df_raw = load_file_to_dataframe(content, filename)

    if df_raw.empty:
        return df_raw, {
            "mapped_columns": {},
            "unmapped_columns": [],
            "warnings": ["Fichier vide"],
            "source_format": source_format,
            "row_count": 0,
        }

    canonical, report = detect_and_normalize(df_raw)
    report["source_format"] = source_format
    return canonical, report
