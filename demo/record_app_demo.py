#!/usr/bin/env python3
"""
Enregistre une démo vidéo du parcours réel FinAudit (Playwright).

Prérequis : backend :8000 + frontend :5173 démarrés.
Sortie : demo/output/app_capture/demo.webm (renommé)
"""

from __future__ import annotations

import os
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent
OUT_DIR = ROOT / "output" / "app_capture"
CSV_FILE = PROJECT / "backend" / "demo_transactions.csv"
BASE_URL = os.getenv("FINAUDIT_URL", "http://127.0.0.1:5173").rstrip("/")
USERNAME = os.getenv("FINAUDIT_DEMO_USER", "marie_audit")
PASSWORD = os.getenv("FINAUDIT_DEMO_PASS", "FinAudit2026")
MAX_SECONDS = float(os.getenv("FINAUDIT_DEMO_MAX_SEC", "175"))


def _ensure_deps() -> None:
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401
    except ImportError:
        print("pip install playwright && playwright install chromium", file=sys.stderr)
        raise


def _scroll(page, pixels: int = 400) -> None:
    page.evaluate(f"window.scrollBy(0, {pixels})")


def run() -> Path:
    from playwright.sync_api import sync_playwright

    if not CSV_FILE.is_file():
        print(f"CSV démo introuvable: {CSV_FILE}", file=sys.stderr)
        return Path()

    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)

    started = time.monotonic()
    final_video = OUT_DIR / "demo_raw.webm"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(OUT_DIR),
            record_video_size={"width": 1920, "height": 1080},
            locale="fr-FR",
        )
        page = context.new_page()
        page.set_default_timeout(60_000)

        def budget_left() -> float:
            return MAX_SECONDS - (time.monotonic() - started)

        def pause(sec: float) -> None:
            page.wait_for_timeout(int(min(sec, max(0.5, budget_left())) * 1000))

        # --- Landing ---
        page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
        pause(2)
        _scroll(page, 500)
        pause(2)
        page.get_by_role("link", name="Accéder à la plateforme").first.click()
        page.wait_for_url("**/login**")
        pause(2)

        # --- Login ---
        page.get_by_placeholder("ex. marie_audit").fill(USERNAME)
        page.locator("#login-password").fill(PASSWORD)
        pause(1)
        page.get_by_role("button", name="Se connecter").click()
        page.wait_for_url("**/dashboard**")
        pause(2)

        # --- Upload CSV ---
        page.locator('input[type="file"]').set_input_files(str(CSV_FILE))
        page.get_by_text("Fichier importé", exact=False).first.wait_for(state="visible", timeout=90_000)
        pause(4)
        _scroll(page, 300)
        pause(2)

        # --- Dashboard / graphiques ---
        try:
            page.locator("canvas, svg.recharts-surface").first.click(timeout=5000)
        except Exception:
            pass
        pause(3)
        page.get_by_role("link", name="Transactions").click()
        page.wait_for_url("**/transactions**")
        pause(2)

        # --- Transactions + détail ---
        rows = page.locator("table tbody tr")
        if rows.count() > 0:
            rows.first.click()
            pause(2)
            analyze = page.get_by_role("button", name="Analyser").first
            if analyze.is_visible():
                analyze.click()
                pause(2)
                try:
                    page.get_by_role("button", name="Ouvrir l'assistant d'audit IA").click(timeout=3000)
                except Exception:
                    pass
                pause(1)
                try:
                    area = page.locator("textarea").first
                    if area.is_visible():
                        area.fill("Pourquoi cette transaction est-elle signalée ?")
                        pause(1)
                        page.get_by_role("button", name="Envoyer").click()
                        pause(5)
                except Exception:
                    pause(2)
                try:
                    page.keyboard.press("Escape")
                except Exception:
                    pass

        pause(2)
        page.get_by_role("link", name="Rapport").click()
        page.wait_for_url("**/report**")
        pause(2)
        _scroll(page, 600)
        pause(3)
        page.get_by_role("link", name="Tableau de bord").click()
        pause(2)

        # Remplir jusqu'à ~2m50 si marge
        while budget_left() > 3:
            pause(min(2, budget_left() - 1))

        video_src = page.video.path() if page.video else None
        context.close()
        browser.close()

        if video_src and Path(video_src).is_file():
            shutil.move(video_src, final_video)
        else:
            webms = sorted(OUT_DIR.glob("*.webm"), key=lambda p: p.stat().st_mtime)
            if webms:
                shutil.move(webms[-1], final_video)

    elapsed = time.monotonic() - started
    print(f"Capture : {final_video} ({elapsed:.1f}s)")
    return final_video


if __name__ == "__main__":
    _ensure_deps()
    out = run()
    sys.exit(0 if out.is_file() else 1)
