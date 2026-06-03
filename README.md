# FinAudit — Backend

API FastAPI pour la détection d'anomalies sur relevés CSV (stockage en mémoire).

## Lancer le backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY="..."   # optionnel, pour le chat Claude
uvicorn main:app --reload --port 8000
```

- API : http://localhost:8000
- Docs : http://localhost:8000/docs
- CORS : `http://localhost:5173`

Fichier de test : `backend/sample_transactions.csv`
