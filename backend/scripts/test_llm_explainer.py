#!/usr/bin/env python3
"""Test LLMExplainer — n'affiche jamais la clé API."""

from __future__ import annotations

import os
import sys
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from context_builder import build_audit_context
from detector import AnomalyDetector
from explainer import LLMExplainer, TemplateExplainer
from schema_mapper import read_upload


def _key_status() -> str:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        return "ABSENT"
    if key.startswith("AIza"):
        return f"present (AIza…, len={len(key)})"
    return f"present (non-AIza prefix, len={len(key)}) — format suspect"


def _raw_gemini_ping() -> tuple[bool, str]:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        return False, "no key"
    try:
        import google.generativeai as genai
        from prompts import GEMINI_MODEL, GENERATION_CONFIG

        genai.configure(api_key=key)
        model = genai.GenerativeModel(GEMINI_MODEL)
        r = model.generate_content(
            "Réponds uniquement: OK",
            generation_config={**GENERATION_CONFIG, "max_output_tokens": 16},
        )
        text = (r.text or "").strip()
        return bool(text), text[:80] or "(empty text)"
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"


def _llm_explainer_paths() -> None:
    df, report = read_upload(
        (ROOT / "sample_transactions.csv").read_bytes(),
        "sample_transactions.csv",
    )
    txs, _ = AnomalyDetector().analyze(df)
    tx = max(txs, key=lambda t: t.get("risk_score", 0))
    ctx = build_audit_context(tx, txs, report)
    anomalies = tx.get("anomalies", [])

    exp = LLMExplainer()
    explain = exp.explain(tx, anomalies, ctx)
    chat = exp.chat(tx, anomalies, "Ce paiement est-il suspect ?", ctx, [])

    print("explain.source:", explain.get("source"))
    print("explain.text[:120]:", (explain.get("text") or "")[:120])
    print("chat.source:", chat.get("source"))
    print("chat.reply[:120]:", (chat.get("reply") or chat.get("text") or "")[:120])


def main() -> int:
    print("GEMINI_API_KEY:", _key_status())
    ok, detail = _raw_gemini_ping()
    print("raw Gemini ping:", "OK" if ok else "FAIL", "-", detail)

    print("\n--- LLMExplainer ---")
    try:
        _llm_explainer_paths()
    except Exception:
        traceback.print_exc()
        return 1

    exp = LLMExplainer()
    r = exp.explain(
        {"id": "T", "severity": "suspect", "risk_score": 50},
        [],
        build_audit_context(
            {
                "id": "T",
                "montant": 1000,
                "categorie": "Test",
                "fournisseur": "X",
                "anomalies": [],
                "risk_score": 50,
                "severity": "suspect",
            },
            [],
            None,
        ),
    )
    if r.get("source") == "llm":
        print("\nRESULT: LLMExplainer OK")
        return 0
    tmpl = TemplateExplainer().explain(
        {"id": "T", "risk_score": 50, "severity": "suspect"},
        [],
        {},
    )
    if r.get("text") == tmpl.get("text"):
        print("\nRESULT: FALLBACK template (Gemini call failed or empty)")
        return 2
    print("\nRESULT: unexpected")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
