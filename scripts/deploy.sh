#!/usr/bin/env bash
# Déploiement FinAudit (Docker) — à lancer depuis la racine du projet
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== FinAudit — déploiement ==="

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker est requis. Installez Docker puis relancez."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose (plugin) est requis."
  exit 1
fi

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Fichier .env créé depuis .env.example — renseignez GEMINI_API_KEY si besoin."
  else
    echo "Créez un fichier .env à la racine avec GEMINI_API_KEY=..."
    exit 1
  fi
fi

# Le frontend est compilé dans l'image Docker (web/Dockerfile).
# Build local uniquement si demandé : FINAUDIT_LOCAL_WEB_BUILD=1
if [[ "${FINAUDIT_LOCAL_WEB_BUILD:-}" == "1" ]]; then
  cd "$ROOT/web"
  if command -v npm >/dev/null 2>&1; then
    echo "→ Build local (npm)…"
    npm ci && npm run build
  else
    echo "npm requis pour FINAUDIT_LOCAL_WEB_BUILD=1"
    exit 1
  fi
else
  echo "→ Build frontend dans Docker (défaut). Pour build local : FINAUDIT_LOCAL_WEB_BUILD=1"
fi

docker compose down 2>/dev/null || true
docker compose up -d --build

API_PORT="${FINAUDIT_API_PORT:-8001}"
WEB_PORT="${FINAUDIT_WEB_PORT:-8081}"

echo ""
echo "Attente des services…"
for _ in $(seq 1 45); do
  if curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null \
    && curl -sf "http://127.0.0.1:${WEB_PORT}/health" >/dev/null; then
    break
  fi
  sleep 2
done

echo ""
curl -s "http://127.0.0.1:${API_PORT}/health" | python3 -m json.tool 2>/dev/null \
  || curl -s "http://127.0.0.1:${API_PORT}/health"
echo ""
echo "Application : http://localhost:${WEB_PORT}"
echo "API docs    : http://localhost:${API_PORT}/docs"
echo ""
echo "Arrêt : docker compose down"
