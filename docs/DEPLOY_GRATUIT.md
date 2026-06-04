# Déployer FinAudit gratuitement (URL publique)

Hetzner est payant (~4 €/mois). Voici **3 options gratuites** réalistes pour FinAudit.

---

## Comparaison rapide

| Option | Coût | 24h/24 en ligne | Difficulté | Idéal pour |
|--------|------|-----------------|------------|------------|
| **A. Oracle Cloud Free** | 0 € | Oui | Moyenne | **Meilleur gratuit** (vrai serveur Linux) |
| **B. Cloudflare Tunnel** | 0 € | Seulement si votre PC reste allumé | Facile | Démo rapide (hackathon, 1 journée) |
| **C. Render** | 0 € (limité) | Oui* | Moyenne | Sans carte parfois limité ; backend peut « dormir » |

\* Render free : le backend s’endort après inactivité (réveil lent au premier clic).

**Recommandation :** **Oracle Cloud Free** si vous voulez une vraie URL stable sans payer. **Cloudflare Tunnel** si vous voulez tester en 15 minutes sans créer de compte cloud complexe.

---

# Option A — Oracle Cloud (VPS gratuit, comme Hetzner mais 0 €)

Oracle offre des machines **Always Free** (gratuites à vie, pas un essai de 30 jours).

### 1. Créer un compte

1. https://www.oracle.com/cloud/free/
2. Inscription (carte parfois demandée pour vérification, **pas de débit** si vous restez dans le tier Free).
3. Choisir une région proche (ex. France / Pays-Bas).

### 2. Créer une instance

1. Menu **Compute** → **Instances** → **Create instance**.
2. Nom : `finaudit`
3. Image : **Ubuntu 22.04** ou 24.04
4. Shape : **Ampere** (ARM) — Always Free eligible (ex. VM.Standard.A1.Flex, 1 OCPU, 6 Go RAM)
5. Télécharger votre clé SSH ou en générer une
6. Ouvrir les ports dans la **Security List** / **Ingress rules** :
   - TCP **22** (SSH)
   - TCP **80** (HTTP)
   - TCP **443** (HTTPS)
7. Créer → noter l’**IP publique**

### 3. Déployer FinAudit

**Identique au guide VPS** : [GUIDE_VPS_COMPLET.md](./GUIDE_VPS_COMPLET.md)

Résumé sur le serveur :

```bash
ssh ubuntu@VOTRE_IP
# installer Docker (même commandes que le guide Hetzner)
# copier le projet (scp ou git)
cd /opt/finaudit
cp .env.example .env && nano .env
export PUBLIC_URL=http://VOTRE_IP
bash scripts/deploy-public.sh
```

Test : `http://VOTRE_IP` dans le navigateur.

---

# Option B — Cloudflare Tunnel (gratuit, sans VPS)

Votre PC fait tourner Docker ; Cloudflare donne une URL publique `https://xxxx.trycloudflare.com`.

### Limites

- Le PC doit rester **allumé** et connecté à Internet.
- L’URL change à chaque tunnel (sauf compte Cloudflare payant avec nom fixe).
- Pas idéal pour une démo permanente.

### Étapes

**1. Sur votre PC**, installer cloudflared :  
https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

**2. Libérer le port 80** (arrêter MariaDB/autre sur 80 si besoin) :

```bash
sudo fuser -k 80/tcp 8080/tcp 8000/tcp 2>/dev/null || true
```

**3. Déployer en mode « public local »** :

```bash
cd /home/angelasevilla/Downloads/FINAUDIT
cp .env.example .env
# éditer GEMINI_API_KEY dans .env

export PUBLIC_URL=http://127.0.0.1
export HTTP_PORT=80
bash scripts/deploy-public.sh
```

**4. Dans un autre terminal** :

```bash
cloudflared tunnel --url http://localhost:80
```

**5.** Copier l’URL affichée (ex. `https://random-words.trycloudflare.com`) et la partager.

**6.** Mettre à jour CORS dans `.env` avec cette URL exacte, puis :

```bash
export PUBLIC_URL=https://random-words.trycloudflare.com
bash scripts/deploy-public.sh
```

---

# Option C — Render (hébergement managé gratuit)

Guide détaillé : **[DEPLOY_RENDER.md](./DEPLOY_RENDER.md)**

- **Backend** : Web Service (dossier `backend`)
- **Frontend** : Static Site (dossier `web`) — **pas besoin de Vercel**
- Variable front : `VITE_API_URL=https://votre-api.onrender.com`

**Limite gratuite :** le backend dort après inactivité (~30–60 s au réveil).

---

# Récap : que choisir ?

| Besoin | Choix |
|--------|--------|
| URL stable, gratuit, projet sérieux | **Oracle Cloud Free** |
| Tester tout de suite, 1 après-midi | **Cloudflare Tunnel** |
| Pas de VPS, OK avec lenteur au réveil | Render (plus de config) |

---

# Après le choix

- Guide serveur détaillé : [GUIDE_VPS_COMPLET.md](./GUIDE_VPS_COMPLET.md) (Oracle = mêmes commandes, IP différente).
- Script : `bash scripts/deploy-public.sh` avec `export PUBLIC_URL=...`

**Pas besoin de Hetzner payant** pour avoir une URL publique.
