#!/usr/bin/env python3
"""Assemble capture application + voix off → FinAudit_App_Demo.mp4 (max 3 min)."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VIDEO_IN = ROOT / "output" / "app_capture" / "demo_raw.webm"
AUDIO_DIR = ROOT / "output" / "audio_app"
PLAYLIST = ROOT / "output" / "playlist_app.txt"
VOIX = ROOT / "output" / "voix_app_complete.mp3"
OUT = ROOT / "output" / "FinAudit_App_Demo.mp4"
MAX_DURATION = 180.0


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True)


def main() -> int:
    if not VIDEO_IN.is_file():
        print(f"Vidéo manquante: {VIDEO_IN}", file=sys.stderr)
        return 1
    if not AUDIO_DIR.is_dir() or not list(AUDIO_DIR.glob("*.mp3")):
        print(f"Audio manquant: {AUDIO_DIR}", file=sys.stderr)
        return 1

    PLAYLIST.write_text(
        "\n".join(f"file '{p.resolve()}'" for p in sorted(AUDIO_DIR.glob("*.mp3"))),
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
            str(PLAYLIST),
            "-c",
            "copy",
            str(VOIX),
        ]
    )

    vdur = float(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(VIDEO_IN),
            ],
            text=True,
        ).strip()
    )
    adur = float(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(VOIX),
            ],
            text=True,
        ).strip()
    )

    target = min(vdur, MAX_DURATION)
    if adur > target + 0.5:
        tempo = adur / target
        audio_filter = [f"atempo={tempo:.6f}"]
    else:
        audio_filter = []
        target = min(vdur, adur, MAX_DURATION)

    tmp = ROOT / "output" / "app_mux"
    tmp.mkdir(parents=True, exist_ok=True)
    voix_fit = tmp / "voix_fit.mp3"
    video_mp4 = tmp / "video.mp4"

    af = ["-filter:a", ",".join(audio_filter)] if audio_filter else []
    run(
        ["ffmpeg", "-y", "-i", str(VOIX), *af, "-t", f"{target:.3f}", str(voix_fit)]
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(VIDEO_IN),
            "-vf",
            "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-t",
            f"{target:.3f}",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "22",
            "-pix_fmt",
            "yuv420p",
            str(video_mp4),
        ]
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(video_mp4),
            "-i",
            str(voix_fit),
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            "-shortest",
            str(OUT),
        ]
    )

    final_dur = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(OUT),
        ],
        text=True,
    ).strip()
    print(f"\nTerminé : {OUT} ({final_dur}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
