# FinAudit — Frontend sur Vercel

L’API FastAPI ne tourne **pas** sur Vercel (utilisez **Render** ou Docker). Vercel héberge uniquement le build statique React (`web/`).

## Paramètres du projet Vercel

| Champ | Valeur |
|--------|--------|
| **Root Directory** | `web` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm ci` (ou `npm install`) |

## Variable d’environnement (obligatoire)

| Clé | Valeur |
|-----|--------|
| `VITE_API_URL` | `https://finaudit-api.onrender.com` *(sans slash final)* |

Sans `VITE_API_URL`, le front appelle `/api` sur le domaine Vercel → **404 / NOT_FOUND** sur les routes API.

Sur Render (backend), ajoutez :

```env
FINAUDIT_CORS_ORIGIN=https://votre-projet.vercel.app
```

(URL exacte du déploiement Vercel, avec `https`.)

## Fichier `web/vercel.json`

Les routes React (`/login`, `/dashboard`, …) sont gérées côté client. Vercel doit renvoyer `index.html` pour ces chemins (voir `vercel.json`).

## Checklist NOT_FOUND

1. L’URL est bien celle du **déploiement** (pas une ancienne URL après renommage d’équipe).
2. Le dernier deploy est **Ready** (pas Failed).
3. **Root Directory** = `web` (pas la racine du monorepo).
4. **Output Directory** = `dist`.
5. `VITE_API_URL` défini **avant** le build → **Redeploy** après ajout.
6. CORS backend = URL Vercel exacte.

## Alternative recommandée

Tout sur **Render** (Static Site + API) : un seul hébergeur, voir `docs/DEPLOY_RENDER.md`.
