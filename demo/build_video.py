#!/usr/bin/env python3
"""Assemble slides PNG + MP3 en une vidéo MP4 (nécessite ffmpeg)."""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SLIDES = ROOT / "output" / "slides"
AUDIO = ROOT / "output" / "audio"
WORK = ROOT / "output" / "segments"
OUT_VIDEO = ROOT / "output" / "FinAudit_Demo.mp4"


def section_pairs() -> list[tuple[Path, Path]]:
    slides = sorted(SLIDES.glob("*.png"))
    audios = sorted(AUDIO.glob("*.mp3"))
    if len(slides) != len(audios):
        # Match by numeric prefix 01_, 02_, ...
        def key(p: Path) -> str:
            return p.stem[:2]

        audio_by = {key(a): a for a in audios}
        pairs = []
        for s in slides:
            a = audio_by.get(key(s))
            if a:
                pairs.append((s, a))
        return pairs
    return list(zip(slides, audios))


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def main() -> int:
    if not shutil.which("ffmpeg"):
        print("Installez ffmpeg: sudo apt install -y ffmpeg", file=sys.stderr)
        return 1

    pairs = section_pairs()
    if not pairs:
        print("Aucune paire slide/audio. Lancez d'abord generate_voiceover.py et generate_slides.py", file=sys.stderr)
        return 1

    if WORK.exists():
        for f in WORK.glob("*.mp4"):
            f.unlink()
    WORK.mkdir(parents=True, exist_ok=True)

    segments: list[Path] = []
    print(f"Montage de {len(pairs)} segments…")

    for i, (slide, audio) in enumerate(pairs, start=1):
        seg = WORK / f"seg_{i:02d}.mp4"
        run(
            [
                "ffmpeg",
                "-y",
                "-loop",
                "1",
                "-i",
                str(slide),
                "-i",
                str(audio),
                "-c:v",
                "libx264",
                "-tune",
                "stillimage",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-shortest",
                "-movflags",
                "+faststart",
                str(seg),
            ]
        )
        segments.append(seg)
        print(f"  {seg.name}")

    list_file = ROOT / "output" / "segments_list.txt"
    list_file.write_text(
        "\n".join(f"file '{s.resolve()}'" for s in segments),
        encoding="utf-8",
    )

    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_file),
            "-c",
            "copy",
            str(OUT_VIDEO),
        ]
    )

    print(f"\nVidéo prête: {OUT_VIDEO}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
