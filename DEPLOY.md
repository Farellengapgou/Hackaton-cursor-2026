# Déploiement FinAudit

## Architecture

| Service | Port (défaut) | Rôle |
|---------|---------------|------|
| `web` (nginx + React) | 8080 | Interface utilisateur |
| `backend` (FastAPI) | 8000 | API, analyse, Gemini |

Le front en production passe par nginx qui proxy `/api`, `/analyze`, `/explain`, `/chat`, `/health` vers le backend.

## Déploiement rapide (Docker)

### Prérequis

- **Docker** + plugin **docker compose**
- **Node.js 20+** avec **pnpm** (recommandé) ou **npm** — pour compiler le frontend avant l’image nginx

### Étapes (machine locale ou VPS)

```bash
cd /home/angelasevilla/Downloads/FINAUDIT   # adapter le chemin

# 1. Secrets (racine du projet, jamais dans git)
cp .env.example .env
nano .env   # GEMINI_API_KEY=votre_cle   (assistant IA, optionnel)

# 2. Libérer les ports si un ancien serveur tourne encore
fuser -k 8000/tcp 8080/tcp 2>/dev/null || true

# 3. Déployer (build web + docker compose)
bash scripts/deploy.sh
```

Le script utilise **pnpm** en priorité si installé, sinon **npm**.

### URLs après succès

- Application : http://localhost:8080  
- API directe : http://localhost:8000/docs  
- Santé IA : http://localhost:8000/health → `"explainer_mode": "gemini"` si la clé est valide

## Variables d'environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `GEMINI_API_KEY` | Non | Active Gemini pour `/explain` et `/chat` |
| `GEMINI_MODEL` | Non | Défaut : `gemini-2.5-flash-lite` |
| `GEMINI_TIMEOUT_SECONDS` | Non | Défaut : `12` |

**Sécurité :** ne jamais committer `.env` ni coller la clé API dans le dépôt Git. Utiliser les secrets de votre hébergeur (Railway, Render, Fly.io, VPS + fichier `.env` hors git).

## Déploiement sans Docker

### Backend

```bash
cd backend
pip install -r requirements.txt
export GEMINI_API_KEY="votre_cle"
./run.sh
```

### Frontend (build statique)

```bash
cd web
npm ci
npm run build
# Servir dist/ derrière nginx avec le même proxy que web/nginx.conf
```

## Déploiement public (URL pour tout le monde)

**Guide pas à pas complet :** [docs/GUIDE_VPS_COMPLET.md](docs/GUIDE_VPS_COMPLET.md)  
(louer un VPS, SSH, Docker, `.env`, `scripts/deploy-public.sh`, pare-feu, domaine, HTTPS)

```bash
export PUBLIC_URL=http://VOTRE_IP   # ou https://votre-domaine.com
bash scripts/deploy-public.sh
```

## Hébergeurs suggérés

1. **VPS (Ubuntu)** : voir `docs/GUIDE_VPS_COMPLET.md` — **recommandé**  
2. **Railway / Render** : service backend + static site ; secrets dans le panneau  
3. **Tunnel Cloudflare** : démo rapide sans VPS — voir `docs/DEPLOY_PUBLIC.md`

## Vérifications post-déploiement

```bash
curl -s http://localhost:8000/health | jq .
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo_audit","password":"FinAudit2026"}'
```

## Rotation de clé API

Si une clé a été exposée (chat, commit accidentel), la révoquer dans [Google AI Studio](https://aistudio.google.com/apikey) et en générer une nouvelle.
