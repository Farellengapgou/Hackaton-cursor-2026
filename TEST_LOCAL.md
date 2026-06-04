# Tester FinAudit (backend local + front `front_2`)

## 1. Backend (port 8000)

```bash
# Si le port est occupé :
fuser -k 8000/tcp

cd /home/angelasevilla/Downloads/FINAUDIT/backend
./run.sh
```

Vérifier : http://127.0.0.1:8000/health → `{"status":"ok"}`

## 2. Frontend poussé (`origin/front_2` → dossier `web/`)

```bash
cd /home/angelasevilla/Downloads/FINAUDIT/web
npm install
npm run dev
```

Ouvrir : **http://localhost:5173**

## 3. Parcours de test

1. **S'inscrire** ou **se connecter** (le champ email = identifiant `username` du backend)
2. Tableau de bord → glisser `../backend/demo_transactions.csv`
3. Consulter graphiques et transactions signalées
4. Cliquer l'assistant IA (bouton flottant) → choisir une transaction → poser des questions

## Branches

| Composant | Source |
|-----------|--------|
| Backend | `feature/backend-finaudit` (dossier `backend/`) |
| Frontend UI | `origin/front_2` (dossier `web/`) |
