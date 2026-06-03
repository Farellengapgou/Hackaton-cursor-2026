# FinAudit — API Contract (unified backend + auth)

Contract between the FastAPI backend (`feature/backend-finaudit`) and the
React + Vite frontend. The backend runs a local rule-based `AnomalyDetector`
(FCFA / Cameroon context) plus a template-first explainer (optional Gemini),
and is protected by lightweight in-memory Bearer-token auth.

## Base setup

- Base URL: `http://localhost:8000`
- CORS: only `http://localhost:5173` (Vite dev) is allowed.
- Live schema: `http://localhost:8000/docs` (Swagger UI).
- Auth: send `Authorization: Bearer <access_token>` on every protected endpoint.

## Authentication

Flow: `register` (once) -> `login` (get `access_token`) -> send the token on
protected requests.

Public auth endpoints:

- `POST /api/auth/register` — body `{ "username": string, "password": string }`
  -> `{ "user_id": string, "username": string, "message": "user_created" }`
  (`400` if the username already exists)
- `POST /api/auth/login` — body `{ "username": string, "password": string }`
  -> `{ "access_token": string, "user_id": string, "username": string }`
  (`401` on bad credentials)

Protected auth endpoints (Bearer token):

- `GET /api/auth/me` -> `{ "user_id": string, "username": string }`
- `POST /api/auth/logout` -> `{ "status": "logged_out" }`

## Endpoints overview

Public: `GET /health`, `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`.

Protected (Bearer token required):

- `POST /analyze` — multipart `file` (.csv) -> `AnalyzeResponse`
- `POST /api/upload` — alias of `/analyze`, same response
- `POST /explain` — body `{ "transaction_id": string }` -> `ExplainResponse`
- `POST /chat` — body `{ "transaction_id": string, "message": string, "history"?: {role,content}[] }`
  -> `ChatResponse`
- `GET /api/transactions` -> `Transaction[]`
- `GET /api/anomalies` -> `Anomaly[]` (flattened, each carries `transaction_id`)
- `GET /api/stats` -> `StatsResponse`
- `GET /api/history` -> `HistoryEntry[]`

Note: `/explain` and `/chat` operate on the LAST analysis held in memory; call
`/analyze` (or `/api/upload`) first, otherwise they return `400`.

## Core types (TypeScript)

```ts
type Severity = "critique" | "suspect" | "a_verifier";
type RuleName =
  | "OUTLIER_STATISTIQUE"
  | "DOUBLON"
  | "MONTANT_NEGATIF"
  | "HEURE_NOCTURNE"
  | "MONTANT_ROND"
  | "FOURNISSEUR_UNIQUE"
  | "BENFORD_DEVIATION";

interface Anomaly {
  rule_name: RuleName;
  flagged: boolean;          // always true when present
  reason: string;
  severity: Severity;
  score_contribution: number; // 0..1
  transaction_id?: string;    // present only in the flattened /api/anomalies list
}

interface Transaction {
  id: string;
  date: string;
  heure: string;
  fournisseur: string;
  montant: number;            // FCFA
  categorie: string;
  validateur: string;
  risk_score: number;         // 0..100 (integer)
  severity: Severity;
  anomalies: Anomaly[];       // nested per transaction
}

interface Summary {
  total: number;
  flagged_count: number;
  pct_flagged: number;        // percentage, 1 decimal
}

interface AnalyzeResponse {
  summary: Summary;
  transactions: Transaction[];
}

interface StatsResponse {
  transactions_count: number;
  anomalies_count: number;
  total_amount: number;                       // sum of montant
  anomalies_by_severity: Record<string, number>; // keys: critique|suspect|a_verifier
}

interface HistoryEntry {
  timestamp: string;          // ISO-8601 UTC
  username: string | null;
  transactions_count: number;
  anomalies_count: number;
}

interface ExplainResponse {
  text: string;
  risk_level: string;         // e.g. CRITIQUE | SUSPECT | FAIBLE
  recommendation: string;
  source: "template" | "llm";
}

interface ChatResponse {
  reply: string;
  source: "template" | "llm";
}

// Auth
interface RegisterResponse { user_id: string; username: string; message: string; }
interface LoginResponse { access_token: string; user_id: string; username: string; }
interface MeResponse { user_id: string; username: string; }
```

## Example: `POST /analyze` (or `/api/upload`) response

```json
{
  "summary": { "total": 50, "flagged_count": 7, "pct_flagged": 14.0 },
  "transactions": [
    {
      "id": "12",
      "date": "2025-01-08",
      "heure": "23:40",
      "fournisseur": "Virement suspect",
      "montant": 15000000.0,
      "categorie": "autre",
      "validateur": "agent_03",
      "risk_score": 70,
      "severity": "suspect",
      "anomalies": [
        {
          "rule_name": "HEURE_NOCTURNE",
          "flagged": true,
          "reason": "Transaction à 23:40 (plage nocturne 22h-06h, hors horaires bureau Cameroun GMT+1).",
          "severity": "critique",
          "score_contribution": 0.35
        }
      ]
    }
  ]
}
```

## Example fetch with auth header

```ts
fetch("http://localhost:8000/analyze", {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}` },
  body: formData, // FormData with field "file"
});
```

## Errors

All errors use the FastAPI shape `{ "detail": string }`:

- `400` — non-`.csv` / invalid / empty CSV; register with an existing username;
  `/explain` or `/chat` when no analysis is in memory yet
- `401` — missing/invalid Bearer token, or bad login credentials
  (detail `"invalid_or_missing_token"` / `"invalid_credentials"`)
- `404` — `/explain` or `/chat` with an unknown `transaction_id`
- `422` — malformed request body (validation)

## Notes to avoid conflicts

- `id` / `transaction_id` are **strings**; `montant` and `total_amount` are numbers (FCFA).
- The detector and severities are French-context: `critique | suspect | a_verifier`
  (different from the old `low|medium|high` scheme).
- Anomalies are nested inside each `Transaction` in `/analyze`, `/api/transactions`;
  `/api/anomalies` returns them flattened with an added `transaction_id`.
- `/chat` is keyed by `transaction_id` + `message` (it is NOT the old anomaly-id chat).
- Backend keeps a single in-memory session (last upload). `/explain`, `/chat`,
  `/api/transactions|anomalies|stats|history` all reflect the most recent `/analyze`.
- Health endpoints and `register`/`login` are the only public routes; everything
  else requires the Bearer token.
