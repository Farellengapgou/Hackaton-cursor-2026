# Guide complet — Louer un serveur Linux et déployer FinAudit (URL publique)

Ce guide part de **zéro** : pas de déploiement local obligatoire. Vous louez un VPS, vous y installez FinAudit, vous obtenez une URL accessible sur Internet.

**Durée estimée :** 1 à 2 h (première fois).

---

## Vue d’ensemble

```
[Votre PC]  ──SSH──►  [VPS Linux]  ──Internet──►  [Visiteurs]
                         │
                         ├─ Docker : conteneur web (nginx, port 80)
                         └─ Docker : conteneur backend (API, interne)
```

**Une URL pour tout :** `https://finaudit.votredomaine.com` (ou `http://IP` pour un test rapide).

---

## Étape 1 — Choisir et louer un VPS

Un **VPS** = un petit serveur Linux dans le cloud, avec une **adresse IP publique**.

### Fournisseurs simples (au choix)

| Fournisseur | Site | Prix indicatif | Remarque |
|-------------|------|----------------|----------|
| **Hetzner** | https://www.hetzner.com/cloud | ~ 4–6 €/mois | Bon rapport qualité/prix |
| **Scaleway** | https://www.scaleway.com | ~ 7–10 €/mois | Datacenters en France |
| **DigitalOcean** | https://www.digitalocean.com | ~ 6 $/mois | Très documenté |
| **OVH** | https://www.ovhcloud.com | variable | Français |

Les étapes ci-dessous utilisent des noms génériques (Dashboard, Create instance, etc.) — adaptez au site choisi.

### Configuration recommandée de la machine

| Paramètre | Valeur |
|-----------|--------|
| OS | **Ubuntu 22.04** ou **24.04** LTS |
| RAM | **2 Go** minimum (4 Go confortable) |
| CPU | 1 vCPU suffit |
| Disque | 20 Go |
| Région | Proche de vos utilisateurs (ex. Paris) |

### Création du serveur (exemple type)

1. Créez un compte sur le site du fournisseur.
2. Menu **Cloud** / **Instances** / **Créer un serveur**.
3. Image : **Ubuntu 24.04 LTS**.
4. Type : le plus petit payant (CX22, DEV1-S, Droplet Basic…).
5. **Clé SSH** (recommandé) :
   - Sur **votre PC** : `ssh-keygen -t ed25519 -C "finaudit"` (Entrée × 3).
   - Copiez le contenu de `~/.ssh/id_ed25519.pub` dans le champ « SSH key » du fournisseur.
6. Notez l’**adresse IP publique** (ex. `123.45.67.89`).
7. Validez et attendez 1–2 minutes que le serveur soit **Running**.

Vous n’avez **pas** besoin d’avoir déployé en local avant — le VPS est une machine neuve.

---

## Étape 2 — Se connecter au serveur (SSH)

Sur **votre PC** (terminal) :

```bash
ssh root@123.45.67.89
```

Remplacez par votre IP. Si vous avez créé un utilisateur `ubuntu` :

```bash
ssh ubuntu@123.45.67.89
```

La première connexion demande de confirmer l’empreinte : tapez `yes`.

Vous êtes maintenant **dans le serveur** (prompt du type `root@...`).

---

## Étape 3 — Mettre à jour le système et installer Docker

Sur le **serveur** (copier-coller bloc par bloc) :

```bash
sudo apt update && sudo apt upgrade -y
```

Installer Docker (méthode officielle simplifiée) :

```bash
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

Vérifier :

```bash
docker --version
docker compose version
```

Optionnel — éviter `sudo` devant chaque commande docker :

```bash
sudo usermod -aG docker $USER
# Déconnectez-vous puis reconnectez-vous en SSH pour que ce soit actif
```

---

## Étape 4 — Copier le projet FinAudit sur le serveur

### Option A — Avec Git (si le projet est sur GitHub/GitLab)

Sur le **serveur** :

```bash
sudo apt install -y git
cd /opt
sudo git clone https://github.com/VOTRE_COMPTE/FINAUDIT.git finaudit
sudo chown -R $USER:$USER finaudit
cd finaudit
```

### Option B — Depuis votre PC (sans Git distant)

Sur **votre PC** (pas sur le serveur) :

```bash
cd /home/angelasevilla/Downloads
tar czf finaudit.tar.gz FINAUDIT --exclude=FINAUDIT/web/node_modules --exclude=FINAUDIT/.git
scp finaudit.tar.gz root@123.45.67.89:/opt/
```

Sur le **serveur** :

```bash
cd /opt
tar xzf finaudit.tar.gz
mv FINAUDIT finaudit
cd finaudit
```

---

## Étape 5 — Fichier `.env` (secrets)

Sur le **serveur**, à la **racine** du projet (`/opt/finaudit`) :

```bash
cd /opt/finaudit
cp .env.example .env
nano .env
```

Contenu (adaptez) :

```env
GEMINI_API_KEY=votre_cle_gemini_ici
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_TIMEOUT_SECONDS=20

# Au début, avec l’IP seule (test) :
FINAUDIT_CORS_ORIGIN=http://123.45.67.89

# Plus tard, avec un nom de domaine :
# FINAUDIT_CORS_ORIGIN=https://finaudit.votredomaine.com
```

Enregistrer : `Ctrl+O`, Entrée, `Ctrl+X`.

**Ne commitez jamais `.env` sur Git.**

---

## Étape 6 — Déployer FinAudit (production)

Toujours sur le **serveur** :

```bash
cd /opt/finaudit
chmod +x scripts/deploy-public.sh

# Remplacez par votre IP ou votre domaine
export PUBLIC_URL=http://123.45.67.89

bash scripts/deploy-public.sh
```

Le script :

- construit les images Docker (5–15 min la 1ère fois) ;
- démarre **web** (port 80) + **backend** (interne) ;
- vérifie `/health`.

Si le port **80** est déjà pris sur le VPS :

```bash
export HTTP_PORT=8080
export PUBLIC_URL=http://123.45.67.89:8080
bash scripts/deploy-public.sh
```

---

## Étape 7 — Ouvrir le pare-feu (indispensable)

### Sur le panneau du fournisseur (souvent oublié)

Dans la console cloud (Hetzner Firewall, Security Group, etc.) :

- Autoriser **entrant TCP 22** (SSH)
- Autoriser **entrant TCP 80** (HTTP)
- Autoriser **entrant TCP 443** (HTTPS, plus tard)

### Sur Ubuntu (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## Étape 8 — Tester depuis votre PC

Sur **votre PC** (pas sur le serveur) :

```bash
curl -s http://123.45.67.89/health
```

Réponse attendue (JSON) :

```json
{"status":"ok","llm_configured":true,"explainer_mode":"gemini",...}
```

Ouvrez dans un navigateur : **http://123.45.67.89**

Créez un compte ou connectez-vous. Importez un CSV de démo.

**Note :** Si chez vous `localhost:8000` ouvre MariaDB, c’est **votre PC**, pas le VPS. Sur le serveur neuf, le port 8000 n’est en général **pas** exposé.

---

## Étape 9 — Nom de domaine (URL propre, optionnel mais recommandé)

1. Achetez un domaine (OVH, Gandi, Cloudflare Registrar…).
2. Dans la zone DNS, ajoutez un enregistrement **A** :

| Type | Nom | Valeur |
|------|-----|--------|
| A | `finaudit` ou `@` | `123.45.67.89` |

3. Attendez 5 min à 48 h (souvent < 1 h).
4. Sur le serveur, mettez à jour `.env` :

```env
FINAUDIT_CORS_ORIGIN=https://finaudit.votredomaine.com
```

5. Redéployez :

```bash
export PUBLIC_URL=https://finaudit.votredomaine.com
bash scripts/deploy-public.sh
```

---

## Étape 10 — HTTPS (cadenas vert, obligatoire pour partager sérieusement)

Sur le **serveur**, avec un domaine qui pointe vers l’IP :

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Fichier Caddy (remplacez le domaine) :

```bash
sudo tee /etc/caddy/Caddyfile <<'EOF'
finaudit.votredomaine.com {
    reverse_proxy localhost:80
}
EOF

sudo systemctl reload caddy
```

Les visiteurs utilisent : **https://finaudit.votredomaine.com**

Mettez `FINAUDIT_CORS_ORIGIN` et `PUBLIC_URL` en **https** puis relancez `deploy-public.sh`.

---

## Commandes utiles sur le serveur

```bash
cd /opt/finaudit

# État des conteneurs
docker compose -f docker-compose.prod.yml ps

# Logs
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f backend

# Redémarrer après modification du code
git pull   # si vous utilisez Git
export PUBLIC_URL=https://finaudit.votredomaine.com
bash scripts/deploy-public.sh

# Arrêter
docker compose -f docker-compose.prod.yml down
```

---

## Dépannage

| Problème | Cause probable | Action |
|----------|----------------|--------|
| Site inaccessible depuis Internet | Pare-feu cloud ou UFW | Ouvrir ports 80/443 |
| `curl IP/health` timeout | App pas démarrée | `docker compose -f docker-compose.prod.yml ps` |
| Build Docker très long | Normal 1ère fois | Attendre, vérifier `docker compose logs` |
| Erreur port 80 | Port déjà utilisé | `sudo ss -tlnp \| grep :80` ou `HTTP_PORT=8080` |
| IA en mode template | Clé Gemini absente | Vérifier `GEMINI_API_KEY` dans `.env` |
| CORS / connexion refusée | Mauvaise URL dans `.env` | `FINAUDIT_CORS_ORIGIN` = URL exacte du navigateur |

---

## Checklist finale

- [ ] VPS Ubuntu créé, IP notée
- [ ] SSH OK
- [ ] Docker installé
- [ ] Projet dans `/opt/finaudit`
- [ ] `.env` avec `GEMINI_API_KEY` et `FINAUDIT_CORS_ORIGIN`
- [ ] `bash scripts/deploy-public.sh` terminé sans erreur
- [ ] Ports 80 (443) ouverts
- [ ] `http://IP/health` OK depuis votre PC
- [ ] (Optionnel) Domaine + HTTPS Caddy

---

## Résumé : local vs serveur

| | Votre PC (local) | VPS (déploiement réel) |
|--|------------------|-------------------------|
| Commande | `scripts/deploy.sh` | `scripts/deploy-public.sh` |
| URL | localhost | IP ou domaine |
| Public | Non | Oui |
| Obligatoire avant l’autre ? | **Non** | C’est l’objectif final |

Vous pouvez **ignorer le déploiement local** et suivre uniquement ce guide sur le VPS.
