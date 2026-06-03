# FinAudit — Détecteur d'anomalies comptables

MVP hackathon **J.U.I.N 2026**, thème 11 : import CSV, détection multi-règles, score de risque, explications (templates + Gemini optionnel).

## Structure

```text
backend/          # FastAPI — POST /analyze (sans API externe)
frontend/         # React + Vite — port 5173
demo/             # Futurs jeux de données démo
```

## Prérequis

- Python 3.11+
- Node.js 20+

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Routes

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/health` | Santé API |
| POST | `/analyze` | Upload CSV → analyse (**aucun appel externe**) |
| POST | `/api/upload` | Alias de `/analyze` (compatibilité) |
| POST | `/explain` | Explication FR (template par défaut) |
| POST | `/chat` | Chat sur une transaction analysée |

### Variables d'environnement (optionnel)

Copier `.env.example` vers `.env` :

```bash
GEMINI_API_KEY=   # Si défini : enrichit /explain et /chat via Gemini (timeout 3s, fallback template)
```

Sans clé : tout fonctionne avec **TemplateExplainer** (recommandé pour la démo).

### Test rapide (curl)

```bash
curl http://localhost:8000/health

curl -X POST http://localhost:8000/analyze \
  -F "file=@sample_transactions.csv"

curl -X POST http://localhost:8000/explain \
  -H "Content-Type: application/json" \
  -d '{"transaction_id":"TXN-007"}'

curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"transaction_id":"TXN-007","message":"Dois-je bloquer ce paiement ?"}'
```

### Format CSV

Colonnes recommandées :

`id, date, heure, fournisseur, montant, categorie, validateur`

Alias acceptés : `amount`, `label`, `category`, etc.

### Jeu de données démo (60 transactions, 5 anomalies cachées)

```bash
cd backend
python3 generate_demo_data.py
```

Génère `demo_transactions.csv` (fournisseurs camerounais, FCFA, janvier 2025) et affiche une **cheat sheet** dans le terminal (démo uniquement).

Tester l’analyse :

```bash
curl -X POST http://localhost:8000/analyze \
  -F "file=@demo_transactions.csv"
```

Anomalies attendues (IDs) : doublon T048–T049, nuit T050, outlier T051, montant rond T052, cluster Benford T053–T060.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173 — le proxy Vite redirige `/analyze`, `/explain`, `/chat` vers le backend.

## Équipe (rôles hackathon 6h)

| Dev | Focus |
|-----|--------|
| D1 | Règles avancées, PDF |
| D2 | Isolation Forest, LLM |
| D3 | UI tableau / stats |
| D4 | Chat panel |
| D5 | CSV démo + pitch |

## Composants frontend (stubs)

- `src/components/FileUpload.jsx`
- `src/components/StatsCards.jsx`
- `src/components/TransactionTable.jsx`
- `src/components/AnomalyChat.jsx`

À enrichir en phases D3/D4.
