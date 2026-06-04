#!/usr/bin/env python3
"""Génère les visuels 1920x1080 pour chaque section de la démo."""

from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SCRIPT_FILE = ROOT / "narration_fr.txt"
OUT_DIR = ROOT / "output" / "slides"

W, H = 1920, 1080
BG = (15, 32, 39)
ACCENT = (29, 158, 117)
TEXT = (255, 255, 255)
MUTED = (180, 195, 200)

TITLES = {
    "intro": "FinAudit",
    "landing": "Page d'accueil",
    "inscription": "Création de compte",
    "import": "Import des transactions",
    "dashboard": "Tableau de bord",
    "transactions": "Analyse des transactions",
    "assistant": "Assistant d'audit IA",
    "rapport": "Rapport d'audit",
    "conclusion": "Conclusion",
}


def parse_sections(text: str) -> list[tuple[str, str]]:
    sections: list[tuple[str, str]] = []
    current_id: str | None = None
    lines: list[str] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^\[(\w+)\]$", line)
        if m:
            if current_id and lines:
                sections.append((current_id, " ".join(lines)))
            current_id = m.group(1)
            lines = []
        else:
            lines.append(line)
    if current_id and lines:
        sections.append((current_id, " ".join(lines)))
    return sections


def wrap_text(text: str, max_chars: int = 52) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for w in words:
        trial = " ".join(current + [w])
        if len(trial) <= max_chars:
            current.append(w)
        else:
            if current:
                lines.append(" ".join(current))
            current = [w]
    if current:
        lines.append(" ".join(current))
    return lines[:8]


def get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_slide(section_id: str, body: str, index: int) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Bandeau accent
    draw.rectangle([0, 0, W, 8], fill=ACCENT)
    draw.rectangle([80, 120, 88, H - 120], fill=ACCENT)

    title_font = get_font(72, bold=True)
    sub_font = get_font(36)
    body_font = get_font(32)

    title = TITLES.get(section_id, section_id.replace("_", " ").title())
    draw.text((120, 100), "FinAudit", font=get_font(28), fill=ACCENT)
    draw.text((120, 160), title, font=title_font, fill=TEXT)

    draw.text((120, 260), f"Étape {index}", font=sub_font, fill=MUTED)

    y = 340
    for line in wrap_text(body, 48):
        draw.text((120, y), line, font=body_font, fill=TEXT)
        y += 48

    draw.text((120, H - 80), "Détecter · Analyser · Protéger", font=get_font(24), fill=MUTED)
    return img


def main() -> int:
    if not SCRIPT_FILE.exists():
        print(f"Manquant: {SCRIPT_FILE}")
        return 1

    sections = parse_sections(SCRIPT_FILE.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for i, (sid, body) in enumerate(sections, start=1):
        out = OUT_DIR / f"{i:02d}_{sid}.png"
        draw_slide(sid, body, i).save(out, "PNG")
        print(f"  slide {out.name}")

    print(f"{len(sections)} slides → {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
