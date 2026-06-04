#!/usr/bin/env bash
# Déploiement accessible sur Internet (VPS ou machine avec IP publique).
# Une URL = le port 80 (front + API via nginx). HTTPS : voir docs/DEPLOY_PUBLIC.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== FinAudit — déploiement public ==="

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "Docker et docker compose sont requis."
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Créé .env — éditez GEMINI_API_KEY et FINAUDIT_CORS_ORIGIN (votre URL publique)."
  exit 1
fi

if [[ -z "${PUBLIC_URL:-}" ]]; then
  echo "Erreur : définissez PUBLIC_URL avant de lancer ce script."
  echo "  export PUBLIC_URL=http://VOTRE_IP_PUBLIQUE"
  echo "  export PUBLIC_URL=https://finaudit.votredomaine.com"
  echo "Voir docs/GUIDE_VPS_COMPLET.md"
  exit 1
fi

PUBLIC_URL="${PUBLIC_URL%/}"
export FINAUDIT_CORS_ORIGIN="${FINAUDIT_CORS_ORIGIN:-$PUBLIC_URL}"

if grep -q '^FINAUDIT_CORS_ORIGIN=' .env 2>/dev/null; then
  sed -i "s|^FINAUDIT_CORS_ORIGIN=.*|FINAUDIT_CORS_ORIGIN=$FINAUDIT_CORS_ORIGIN|" .env
else
  echo "FINAUDIT_CORS_ORIGIN=$FINAUDIT_CORS_ORIGIN" >> .env
fi

echo "CORS : $FINAUDIT_CORS_ORIGIN"
echo "Build Docker (peut prendre 5–15 min la première fois)…"

docker compose -f docker-compose.prod.yml down 2>/dev/null || true
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "Attente du service…"
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${HTTP_PORT:-80}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo ""
curl -s "http://127.0.0.1:${HTTP_PORT:-80}/health" | python3 -m json.tool 2>/dev/null || true
echo ""
echo "✓ Application servie sur le port ${HTTP_PORT:-80}"
echo "  URL pour les visiteurs : $PUBLIC_URL"
echo ""
echo "Sur un VPS, ouvrez le port 80 (et 443 si HTTPS) dans le pare-feu."
echo "HTTPS : voir docs/DEPLOY_PUBLIC.md (Caddy + Let's Encrypt)."
echo "Arrêt : docker compose -f docker-compose.prod.yml down"
