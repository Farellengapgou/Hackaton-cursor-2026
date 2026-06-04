# FinAudit — Docker en local

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ou Docker Engine + plugin Compose
- Fichier `.env` à la **racine** du projet (copie de `.env.example`)

```bash
cd /chemin/vers/FINAUDIT
cp .env.example .env
# Éditez .env : GEMINI_API_KEY=...
```

## Lancer (une commande)

```bash
bash scripts/deploy.sh
```

Ou manuellement :

```bash
docker compose up -d --build
```

## URLs

| Service | URL |
|---------|-----|
| **Application** | http://localhost:8081 |
| **API (direct)** | http://localhost:8001/docs |
| **Santé API** | http://localhost:8001/health |
| **Santé via nginx** | http://localhost:8081/health |

Le front appelle l’API en **relatif** (`/api/...`) : nginx dans le conteneur `web` proxy vers `backend:8000`. Pas besoin de `VITE_API_URL` en Docker local.

## Compte démo

- Utilisateur : `marie_audit`
- Mot de passe : `FinAudit2026`

## Arrêter

```bash
docker compose down
```

## Port API sur l’hôte

Par défaut l’API est exposée sur **8001** (évite le conflit avec MariaDB sur 8000).

Pour utiliser 8000 :

```bash
FINAUDIT_API_PORT=8000 docker compose up -d --build
```

Par défaut le front Docker est sur **8081** (Vite utilise souvent 8080). Pour 8080 : `FINAUDIT_WEB_PORT=8080 docker compose up -d --build` (arrêtez Vite avant).

L’app via nginx utilise toujours le backend **dans** Docker — seuls les ports hôte changent.

## Voir les logs

```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs -f web
```

## Dépannage

| Problème | Action |
|----------|--------|
| `Cannot connect to docker.sock` | Démarrez Docker Desktop / `sudo systemctl start docker` |
| Build web très long | Normal la 1ère fois (npm + vite). Relancez si timeout. |
| 502 / API inaccessible | `docker compose ps` — le backend doit être `Up` |
| CORS en local | `FINAUDIT_CORS_ORIGIN=http://localhost:8081` dans `.env` |

## Dev sans Docker (optionnel)

Terminal 1 — API :

```bash
cd backend
./run.sh   # ou : uvicorn main:app --reload --port 8001
```

Terminal 2 — front :

```bash
cd web
npm install && npm run dev
```

Avec Vite seul, configurez le proxy ou `VITE_API_URL=http://localhost:8001` dans `web/.env`.
