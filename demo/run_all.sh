#!/usr/bin/env bash
# Génère toute la démo : voix off + slides + vidéo MP4
# Usage : bash demo/run_all.sh
set -euo pipefail
cd "$(dirname "$0")"

PY="${PY:-python3}"

echo "=== FinAudit — génération démo vidéo ==="

if ! command -v "$PY" >/dev/null 2>&1; then
  echo "Python introuvable."
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg est requis pour la vidéo finale."
  echo "  sudo apt install -y ffmpeg"
  exit 1
fi

echo "[1/4] Dépendances Python…"
"$PY" -m pip install -q -r requirements-demo.txt

echo "[2/4] Voix off (MP3)…"
"$PY" generate_voiceover.py

echo "[3/4] Visuels (slides PNG)…"
"$PY" generate_slides.py

echo "[4/4] Montage vidéo MP4…"
"$PY" build_video.py

echo ""
echo "=== Terminé ==="
echo "  Vidéo     : $(pwd)/output/FinAudit_Demo.mp4"
echo "  Audio seul: $(pwd)/output/audio/"
echo "  Slides    : $(pwd)/output/slides/"
echo ""
echo "Option : enregistrement écran réel + cette voix off → docs/ENREGISTREMENT_VIDEO.md"
