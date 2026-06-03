# FinAudit — Frontend (branche `Frontend`)

Interface React + Vite pour le thème 11 J.U.I.N 2026.

**API backend :** branche `feature/backend-finaudit` — lancer FastAPI sur le port 8000 avant le front.

## Lancer le frontend

```bash
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173 — le proxy Vite redirige `/analyze`, `/explain`, `/chat` vers `http://localhost:8000`.

## Structure

- `frontend/src/App.jsx` — upload CSV, tableau, panneau explain/chat
- `frontend/src/api/client.js` — appels API
- `frontend/src/components/` — stubs D3/D4 (tableau, stats, chat)

Documentation API complète : voir `README.md` sur la branche `feature/backend-finaudit`.
