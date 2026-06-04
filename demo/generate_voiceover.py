#!/usr/bin/env python3
"""
Génère les fichiers MP3 de la voix off à partir de demo/narration_fr.txt

Usage:
  pip install -r requirements-demo.txt
  python generate_voiceover.py

Sortie: demo/output/audio/<section>.mp3
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCRIPT_FILE = ROOT / "narration_fr.txt"
OUT_DIR = ROOT / "output" / "audio"


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


def synthesize_gtts(section_id: str, text: str, out_path: Path) -> None:
    from gtts import gTTS

    tts = gTTS(text=text, lang="fr", slow=False)
    tts.save(str(out_path))
    print(f"  OK {out_path.name} ({len(text)} car.)")


def main() -> int:
    global SCRIPT_FILE, OUT_DIR
    if len(sys.argv) >= 2:
        SCRIPT_FILE = ROOT / sys.argv[1]
    if len(sys.argv) >= 3:
        OUT_DIR = ROOT / sys.argv[2]

    if not SCRIPT_FILE.exists():
        print(f"Fichier introuvable: {SCRIPT_FILE}", file=sys.stderr)
        return 1

    try:
        from gtts import gTTS  # noqa: F401
    except ImportError:
        print("Installez: pip install -r requirements-demo.txt", file=sys.stderr)
        return 1

    sections = parse_sections(SCRIPT_FILE.read_text(encoding="utf-8"))
    if not sections:
        print("Aucune section [id] dans narration_fr.txt", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Génération de {len(sections)} pistes audio dans {OUT_DIR}…")

    for i, (sid, body) in enumerate(sections, start=1):
        out = OUT_DIR / f"{i:02d}_{sid}.mp3"
        print(f"[{i}/{len(sections)}] {sid}")
        try:
            synthesize_gtts(sid, body, out)
        except Exception as exc:
            print(f"  ERREUR {sid}: {exc}", file=sys.stderr)
            return 1

    # Playlist pour montage
    playlist = ROOT / "output" / "playlist.txt"
    playlist.write_text(
        "\n".join(f"file '{p.resolve()}'" for p in sorted(OUT_DIR.glob("*.mp3"))),
        encoding="utf-8",
    )
    print(f"\nTerminé. Playlist ffmpeg: {playlist}")
    print("Fusionner en un seul MP3:")
    print(
        "  ffmpeg -f concat -safe 0 -i demo/output/playlist.txt "
        "-c copy demo/output/voix_off_complete.mp3"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
