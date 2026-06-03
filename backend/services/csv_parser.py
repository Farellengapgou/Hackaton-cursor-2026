"""Lecture et normalisation d'un relevé CSV en transactions.

Accepte les variantes d'en-têtes FR/EN et nettoie les montants. Le
comportement (colonnes, valeurs par défaut, plafond de lignes) est conservé à
l'identique de l'implémentation historique pour ne pas changer les réponses.
"""

from __future__ import annotations

import csv
import io
import uuid
from typing import Any

from config import settings


def parse_csv(content: bytes) -> list[dict[str, Any]]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows: list[dict[str, Any]] = []
    for i, row in enumerate(reader):
        amount_raw = row.get("amount") or row.get("montant") or row.get("Amount") or "0"
        try:
            amount = float(str(amount_raw).replace(",", ".").replace(" ", ""))
        except ValueError:
            amount = 0.0
        rows.append(
            {
                "id": row.get("id") or str(uuid.uuid4())[:8],
                "date": row.get("date") or row.get("Date") or "",
                "label": (
                    row.get("label")
                    or row.get("libelle")
                    or row.get("Label")
                    or row.get("fournisseur")
                    or ""
                ),
                "heure": row.get("heure") or row.get("time") or "",
                "amount": amount,
                "category": row.get("category") or row.get("categorie") or "",
            }
        )
        if i > settings.MAX_ROWS:
            break
    return rows
