#!/usr/bin/env bash
# Démo vidéo réelle de l'application FinAudit (capture + voix off, max 3 min)
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
PY="${PY:-python3}"

echo "=== FinAudit — démo application (≤ 3 min) ==="

command -v ffmpeg >/dev/null || { echo "sudo apt install -y ffmpeg"; exit 1; }

"$PY" -m pip install -q -r requirements-demo.txt playwright
"$PY" -m playwright install chromium

# Backend
if ! curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
  echo "Démarrage backend…"
  (cd "$ROOT/backend" && ./run.sh) &
  for _ in $(seq 1 40); do curl -sf http://127.0.0.1:8000/health >/dev/null && break; sleep 1; done
fi

# Frontend
if ! curl -sf http://127.0.0.1:5173/ >/dev/null 2>&1; then
  echo "Démarrage frontend…"
  (cd "$ROOT/web" && npm run dev -- --host 127.0.0.1 --port 5173) &
  for _ in $(seq 1 60); do curl -sf http://127.0.0.1:5173/ >/dev/null && break; sleep 1; done
fi

echo "[1/3] Voix off (texte court)…"
"$PY" generate_voiceover.py narration_app_fr.txt output/audio_app

echo "[2/3] Enregistrement navigateur (parcours app)…"
export FINAUDIT_DEMO_MAX_SEC=175
"$PY" record_app_demo.py

echo "[3/3] Montage final…"
"$PY" build_app_video.py

echo ""
echo "=== Terminé ==="
echo "  $(pwd)/output/FinAudit_App_Demo.mp4"
