# Déployer FinAudit sur Internet (URL publique)

Le déploiement **local** (`scripts/deploy.sh`) n’est visible que sur votre PC.  
Pour que **n’importe qui** ouvre un lien, il faut une machine **accessible sur Internet** + une **URL** (domaine ou IP).

## Architecture en production

```
Visiteur → https://votre-domaine.com (port 443)
              ↓
         nginx (conteneur web, port 80/443)
              ├─ pages React
              └─ /api, /analyze, /chat → backend (réseau interne Docker, pas exposé)
```

Le front appelle déjà `/api` en **relatif** : une seule URL suffit pour tout.

---

## Option A — VPS (recommandé pour une vraie démo / hackathon)

**Hébergeurs :** OVH, Scaleway, Hetzner, DigitalOcean, etc. (≈ 5–10 €/mois).

### 1. Créer un serveur Linux (Ubuntu 22/24)

- Au moins **2 Go RAM**
- Installer Docker : https://docs.docker.com/engine/install/ubuntu/

### 2. Copier le projet sur le serveur

```bash
git clone <votre-repo> finaudit
cd finaudit
# ou : scp -r FINAUDIT/ user@IP:/home/user/finaudit
```

### 3. Configurer `.env` à la racine

```bash
cp .env.example .env
nano .env
```

```env
GEMINI_API_KEY=votre_cle
FINAUDIT_CORS_ORIGIN=https://finaudit.votredomaine.com
```

### 4. Lancer le déploiement public

```bash
chmod +x scripts/deploy-public.sh
export PUBLIC_URL=https://finaudit.votredomaine.com
bash scripts/deploy-public.sh
```

### 5. DNS + pare-feu

- **DNS :** enregistrement `A` → IP du VPS (`finaudit.votredomaine.com` → `123.45.67.89`)
- **Pare-feu :** autoriser **80** (HTTP) et **443** (HTTPS)

Test : `curl http://IP_DU_SERVEUR/health`

### 6. HTTPS (obligatoire pour une URL « pro »)

Sur le VPS, installez **Caddy** devant Docker (reverse proxy + certificat gratuit) :

```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile <<'EOF'
finaudit.votredomaine.com {
    reverse_proxy localhost:80
}
EOF
sudo systemctl reload caddy
```

Les visiteurs utilisent : **https://finaudit.votredomaine.com**

Mettez à jour `.env` :

```env
FINAUDIT_CORS_ORIGIN=https://finaudit.votredomaine.com
```

Puis : `docker compose -f docker-compose.prod.yml up -d --build`

---

## Option B — Tunnel Cloudflare (rapide, sans acheter un VPS)

Utile pour une **démo temporaire** avec une URL `*.trycloudflare.com`.

1. Installez [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
2. Sur votre machine (avec Docker déjà lancé en prod) :

```bash
cd FINAUDIT
export PUBLIC_URL=http://localhost
bash scripts/deploy-public.sh
cloudflared tunnel --url http://localhost:80
```

3. Cloudflare affiche une URL publique du type `https://xxxx.trycloudflare.com`  
4. Mettez cette URL dans `FINAUDIT_CORS_ORIGIN` et redémarrez les conteneurs.

---

## Option C — PaaS (Render, Railway, Fly.io)

Deux services à créer :

| Service | Type | Rôle |
|---------|------|------|
| Backend | Web service (Docker `backend/`) | API, variables `GEMINI_*` |
| Frontend | Static site **ou** Docker `web/` | Build `web/dist` + proxy vers l’API |

Sur Render/Railway, configurez les **secrets** dans le panneau (pas dans git).  
Le front en static doit pointer l’API vers l’URL du backend (`VITE_API_URL`) — pour FinAudit Docker unifié, le VPS + `docker-compose.prod.yml` reste plus simple.

---

## Fichiers utiles

| Fichier | Usage |
|---------|--------|
| `scripts/deploy.sh` | **Local** : ports 8080 + 8000 |
| `scripts/deploy-public.sh` | **Internet** : port 80, API non exposée |
| `docker-compose.prod.yml` | Compose production |

---

## Checklist sécurité

- Ne jamais committer `.env` ni la clé Gemini
- Révoquer toute clé exposée dans un chat ou un dépôt public
- En production, ne pas publier le port **8000** (utiliser `docker-compose.prod.yml`)
- Prévoir HTTPS avant de partager l’URL largement

---

## Compte de démo

Après déploiement, les visiteurs peuvent s’inscrire ou utiliser un compte créé à l’avance (`marie_audit` / `FinAudit2026` si vous l’avez enregistré sur ce serveur).

Les données sont **par utilisateur** en mémoire sur le serveur (redémarrage Docker = perte des comptes sauf si vous ajoutez une base de données plus tard).
