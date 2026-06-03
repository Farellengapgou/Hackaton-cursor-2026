# Rapport technique — Backend FinAudit (Thème 11)

Branche : `feature/backend-finaudit`  
Stack : FastAPI, pandas, scikit-learn (Isolation Forest), Gemini optionnel, auth Bearer existante.

---

## 1. Vue d'ensemble

FinAudit analyse un **fichier comptable** (CSV ou Excel) et renvoie :

- des **transactions** enrichies (`risk_score`, `anomalies[]`, `extra_fields`);
- un **`schema_report`** (colonnes mappées / non mappées);
- des **explications** et un **chat** par transaction (`/explain`, `/chat`).

La **détection** ne passe jamais par une API externe. Seules `/explain` et `/chat` peuvent appeler **Gemini** si `GEMINI_API_KEY` est définie.

---

## 2. Architecture

```text
main.py
├── schema_mapper.py     # CSV/XLSX, colonnes extra, journal OHADA
├── detector.py          # Règles + Benford + Isolation Forest
├── context_builder.py   # JSON d'audit pour explain/chat
├── prompts.py           # Prompts Gemini (temperature 0.2)
├── explainer.py         # TemplateExplainer + LLMExplainer
├── auth/ + api/         # JWT, routes /api/* (conservées)
└── services/            # store, analysis_service
```

---

## 3. Ingestion flexible

### Schéma canonique (7 colonnes)

`id, date, heure, fournisseur, montant, categorie, validateur`

### Colonnes supplémentaires

Toute colonne non reconnue est stockée dans `transaction.extra_fields` et incluse dans le contexte LLM (ex. Kaggle : `Territory_key`).

### Exemple Kaggle (`fixtures/kaggle_sample.csv`)

| Source | Cible |
|--------|--------|
| EntryNo | id |
| Date | date |
| Details | fournisseur |
| Amount | montant |
| Account_key | categorie |
| Territory_key | extra_fields |

### Journal Excel OHADA

Fichiers type `modele-journal-comptable-excel.xlsx` : parser multi-lignes → une row par ligne de compte (débit/crédit).

### Réponse `/analyze`

```json
{
  "summary": {
    "total": 500,
    "flagged_count": 120,
    "pct_flagged": 24.0,
    "dataset_alerts": [
      {
        "type": "BENFORD_DEVIATION",
        "scope": "file",
        "chi2": 18.2,
        "threshold": 15.507,
        "n_amounts": 500,
        "message": "Distribution des premiers chiffres anormale sur tout le fichier..."
      }
    ],
    "dataset_alerts_count": 1
  },
  "schema_report": {
    "mapped_columns": { "Amount": "montant" },
    "unmapped_columns": ["Territory_key"],
    "warnings": [],
    "source_format": "csv"
  },
  "transactions": [ ... ]
}
```

---

## 4. Pipeline de détection

| Règle | Description |
|-------|-------------|
| OUTLIER_STATISTIQUE | Montant > moyenne + 3×écart-type (valeur absolue) |
| DOUBLON | Même date + fournisseur + montant |
| MONTANT_NEGATIF | Montant < 0 |
| HEURE_NOCTURNE | 22h–06h (GMT+1) |
| MONTANT_ROND | Multiple de 100 000 FCFA |
| FOURNISSEUR_UNIQUE | Une seule occurrence dans le fichier |
| ISOLATION_FOREST | sklearn, contamination 0.1, fit sur le fichier importé (n ≥ 8) |

**Alerte fichier (pas par ligne)** : `BENFORD_DEVIATION` dans `summary.dataset_alerts` — test χ² sur effectifs (seuil 15,507, 8 ddl, min. 30 montants).

**Score 0–100** : somme des `score_contribution` × 100, plafonné à 100 (Benford n’alimente pas le score ligne).

---

## 5. Couche explicative (bonus IA édition)

### Template (défaut, hors ligne)

- 3–5 phrases, ≥2 chiffres (montant, ratio catégorie, ML).
- Champs : `text`, `risk_level`, `recommendation`, `source: "template"`, `causes[]`.

### Gemini (optionnel)

- Modèle `gemini-1.5-flash`, **temperature 0.2**, timeout **5 s**.
- Prompts dans `prompts.py` (system + JSON context + few-shot).
- Fallback automatique vers template si erreur / timeout / pas de clé.

### Prompt engineering appliqué

- Instructions positives (cite des faits JSON).
- Contexte structuré (`build_audit_context`), pas de dump brut.
- Pas de chaîne de pensée exposée (latence hackathon).

---

## 6. API

| Route | Auth | Description |
|-------|------|-------------|
| GET /health | Non | `llm_configured`, `explainer_mode` |
| POST /analyze | Oui | CSV/XLSX, détection locale |
| POST /explain | Oui | Explication transaction |
| POST /chat | Oui | Chat + `history` |
| POST /api/upload | Non* | Alias analyse (router séparé) |
| POST /api/chat | Non* | Anthropic legacy (`ai/explainer.py`) |

\* Selon montage routers ; routes principales protégées par Bearer.

### Tests curl (après login si auth active)

```bash
curl -s http://localhost:8000/health

curl -X POST http://localhost:8000/analyze -H "Authorization: Bearer TOKEN" \
  -F "file=@sample_transactions.csv"

curl -X POST http://localhost:8000/explain -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transaction_id":"TXN-007"}'

curl -X POST http://localhost:8000/chat -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transaction_id":"TXN-007","message":"Dois-je bloquer ce paiement ?","history":[]}'
```

---

## 7. Configuration

```bash
cp .env.example .env
# GEMINI_API_KEY=...   # https://aistudio.google.com/apikey
# ANTHROPIC_API_KEY=... # route /api/chat legacy uniquement
```

---

## 8. Limites honnêtes

- Benford et IForest = **signaux**, pas preuve de fraude.
- IForest entraîné **uniquement sur le fichier courant** (non supervisé, pas de modèle persistant).
- Pas de persistance DB : mémoire + `store` session.
- Journal Excel complexe : parser heuristique ; exports CSV plats recommandés pour production.

---

## 9. FAQ pièges jury

**Q : Votre IA invente-t-elle des fraudes ?**  
R : Non. Les règles et IForest calculent les flags ; Gemini **commente** un JSON de faits. Sans clé, les templates font la même chose.

**Q : Benford prouve-t-il la fraude ?**  
R : Non. C'est un outil forensique de présélection (comme en audit judiciaire), pas une condamnation.

**Q : Pourquoi 60 alertes Benford avant ?**  
R : Corrigé : une seule alerte dans `summary.dataset_alerts` pour tout le fichier. Les lignes gardent leurs règles propres (doublon, nuit, etc.).

**Q : Pourquoi pas de base de données ?**  
R : MVP hackathon 6h — analyse stateless, upload → analyse → réponse.

**Q : Isolation Forest entraîné sur quoi ?**  
R : Sur le CSV **que vous venez d'uploader** (montant, heure, jour, catégorie). Pas de réentraînement global.

**Q : Et si mon CSV a d'autres colonnes ?**  
R : Elles apparaissent dans `extra_fields` et `schema_report.unmapped_columns`. La détection utilise le noyau canonique.

**Q : Vous perdez mes colonnes ?**  
R : Non. `Territory_key`, `Account_key`, etc. restent disponibles pour le chat.

**Q : Montants négatifs (Kaggle) ?**  
R : Acceptés ; règle `MONTANT_NEGATIF` + stats sur valeurs absolues où pertinent.

**Q : Sans internet ?**  
R : `/analyze` et templates fonctionnent à 100 %. Gemini optionnel.

**Q : Cursor a tout généré ?**  
R : Cursor accélère le code ; seuils FCFA, Benford, fusion score, mapping Kaggle = choix métier équipe.

**Q : Différence règle vs ML ?**  
R : Règles = explicables une par une. IForest = combinaison multivariée atypique.

**Q : Gemini vs Claude dans le projet ?**  
R : `/explain` et `/chat` → Gemini + templates. `/api/chat` legacy → Anthropic si clé présente.

**Q : RGPD ?**  
R : Pas de stockage durable des fichiers ; LLM optionnel ; ne pas envoyer de données réelles sensibles en démo.

**Q : Peut-on analyser 30 000 lignes ?**  
R : `FINAUDIT_MAX_ROWS` (config) plafonne ; pour la démo utiliser `fixtures/kaggle_sample.csv` (500 lignes).

**Q : Pourquoi temperature 0.2 ?**  
R : Recommandation Google pour réponses factuelles (whitepaper Prompt Engineering).

---

## 10. Fichiers de test

| Fichier | Usage |
|---------|--------|
| `sample_transactions.csv` | Démo 8 lignes, 5 anomalies ciblées |
| `fixtures/kaggle_sample.csv` | 500 lignes, colonnes extra |
| `demo_transactions.csv` | Généré par `generate_demo_data.py` |

---

*Document généré pour le hackathon J.U.I.N 2026 — Thème 11 FinAudit.*
