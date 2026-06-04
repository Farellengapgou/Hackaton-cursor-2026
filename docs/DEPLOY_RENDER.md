# Déployer FinAudit sur Render (gratuit)

**Vercel n’est pas obligatoire.** Le plus simple : **tout sur Render** (1 API + 1 site statique).

Si vous mettez le front sur Vercel et l’API sur Render, c’est possible mais **2 hébergeurs** + CORS — pas recommandé pour commencer.

---

## Architecture sur Render

```
Visiteur → https://finaudit-web.onrender.com     (Static Site — React)
                    │
                    └── appels API → https://finaudit-api.onrender.com
```

Le front utilise la variable **`VITE_API_URL`** (URL du backend Render).

---

## Prérequis

1. Compte https://render.com (connexion GitHub conseillée).
2. Code FinAudit sur **GitHub** (dépôt public ou privé).

---

## Partie 1 — Backend (Web Service)

1. Render → **New +** → **Web Service**.
2. Connecter le repo **FINAUDIT**.
3. Paramètres :

| Champ | Valeur |
|--------|--------|
| **Name** | `finaudit-api` |
| **Region** | Frankfurt ou proche |
| **Root Directory** | `backend` |
| **Runtime** | **Docker** (si `backend/Dockerfile` détecté) **ou** Python |
| **Instance type** | Free |

### Si Runtime = Python (sans Docker)

| Champ | Valeur |
|--------|--------|
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` *(obligatoire : `$PORT`, pas 8000)* |

**Si Runtime = Docker** (recommandé, `backend/Dockerfile` corrigé) :

| Champ | Valeur |
|--------|--------|
| **Dockerfile Path** | `Dockerfile` |
| **Health Check Path** | `/health` |
| Pas de Start Command manuel — le Dockerfile utilise `./start.sh` et `$PORT` |

### Variables d’environnement (Environment)

| Clé | Valeur |
|-----|--------|
| `GEMINI_API_KEY` | votre clé |
| `GEMINI_MODEL` | `gemini-2.5-flash-lite` |
| `FINAUDIT_CORS_ORIGIN` | `https://finaudit-web.onrender.com` *(URL du front, étape 2 — à ajuster après)* |

4. **Create Web Service** → attendre le déploiement.
5. Noter l’URL : `https://finaudit-api.onrender.com`
6. Test : `https://finaudit-api.onrender.com/health`

---

## Partie 2 — Frontend (Static Site)

1. Render → **New +** → **Static Site** (pas Web Service).
2. Même repo GitHub.
3. Paramètres :

| Champ | Valeur |
|--------|--------|
| **Name** | `finaudit-web` |
| **Root Directory** | `web` |
| **Build Command** | `npm install && npm run build` *(ou `pnpm install && pnpm run build`)* |
| **Publish Directory** | `dist` |

### Variable d’environnement (important)

| Clé | Valeur |
|-----|--------|
| `VITE_API_URL` | `https://finaudit-api.onrender.com` *(sans slash final)* |

Sans cette variable, le front appellerait `/api` sur le domaine Vercel/Render static → **ça ne marcherait pas**.

4. **Create Static Site**.
5. URL du site : `https://finaudit-web.onrender.com`

---

## Partie 3 — Finaliser CORS

Retournez sur le service **finaudit-api** → **Environment** :

```env
FINAUDIT_CORS_ORIGIN=https://finaudit-web.onrender.com
```

**Save** → redéploiement automatique.

---

## Vercel : faut-il l’utiliser ?

| Approche | Avantages | Inconvénients |
|----------|-----------|---------------|
| **Tout Render** | Un seul compte, guide ci-dessus | Free tier lent au réveil |
| **Vercel (front) + Render (API)** | Front très rapide sur CDN | 2 configs, `VITE_API_URL` + CORS, 2 dashboards |

**Conclusion :** restez sur **Render Static Site** pour le front ; **pas besoin de Vercel**.

Si vous insistez sur Vercel :

1. Import projet, root `web`, framework Vite.
2. Variable : `VITE_API_URL=https://finaudit-api.onrender.com`
3. CORS backend : `FINAUDIT_CORS_ORIGIN=https://votre-app.vercel.app`

---

## Limites du plan gratuit Render

- Le backend **s’endort** après ~15 min sans visite → premier chargement **30–60 s**.
- 750 h/mois par service (suffisant pour une démo).
- Pas de disque persistant : comptes utilisateurs en **mémoire** (perdus au redémarrage).

---

## Checklist

- [ ] Repo sur GitHub
- [ ] Web Service `backend` → `/health` OK
- [ ] Static Site `web` avec `VITE_API_URL`
- [ ] `FINAUDIT_CORS_ORIGIN` = URL exacte du front
- [ ] Test : inscription + import CSV sur l’URL du front

---

## Dépannage

| Problème | Solution |
|----------|----------|
| Deploy **failed** / **Exited** sur l’API | Cause n°1 : port **8000** au lieu de **`$PORT`**. Utilisez le `Dockerfile` à jour ou Start : `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health check failed | **Health Check Path** = `/health` dans les paramètres Render |
| Build pip très long puis timeout | Normal avec scikit-learn ; relancer ou passer en plan payant |
| Front OK mais login échoue | Vérifier `VITE_API_URL` et rebuild du static site |
| Erreur CORS dans la console | `FINAUDIT_CORS_ORIGIN` doit être l’URL **https** du front |
| Build web échoue | Utiliser `pnpm install && pnpm run build` dans Build Command |
| 502 sur API | **Logs** → onglet deploy ; vérifier `$PORT` |

### Après correction dans Git

```bash
git add backend/Dockerfile backend/start.sh render.yaml
git commit -m "fix(render): use PORT env for uvicorn on Render"
git push
```

Render redéploiera automatiquement.
