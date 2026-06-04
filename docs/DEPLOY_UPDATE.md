# Mettre à jour le site déployé (Render)

Chaque modification du code sur GitHub peut redéployer automatiquement Render.

## 1. Sur votre PC

```bash
cd /chemin/vers/FINAUDIT
git add .
git commit -m "Description de vos changements"
git push origin main
```

## 2. Sur Render

- **Backend (Web Service)** : onglet **Events** → nouveau deploy si branche `main` + auto-deploy activé.
- **Frontend (Static Site)** : idem — un **nouveau build** est obligatoire (le front est compilé à chaque deploy).

Si rien ne part : **Manual Deploy** → **Deploy latest commit**.

## 3. Variables d'environnement

| Variable | Quand redéployer |
|----------|------------------|
| `VITE_API_URL` (front) | **Rebuild** du Static Site après modification |
| `GEMINI_API_KEY`, `FINAUDIT_CORS_ORIGIN` (API) | Redéploiement API après **Save** |

## 4. Vérifier la mise à jour

1. Ouvrez l’URL du front en navigation privée (évite le cache).
2. Landing : image hero + bouton **FR/EN**.
3. F12 → Network : requêtes vers votre API Render.

## 5. Docker local (optionnel)

```bash
bash scripts/deploy.sh
```

Rebuild les images après changement du code.
