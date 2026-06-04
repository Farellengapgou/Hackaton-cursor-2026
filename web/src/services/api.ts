import type {
  AnomalyDetail,
  ChatMessage,
  HistoryEntry,
  ReportPayload,
  Severity,
  StatsData,
  Transaction,
} from '../types';
import { apiUrl } from '../config/apiBase';
import { getStoredToken } from '../store/authStore';

const API_BASE = apiUrl('/api');

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options?: RequestInit & { auth?: boolean; json?: boolean },
): Promise<T> {
  const token = options?.auth !== false ? getStoredToken() : null;
  const headers: Record<string, string> = {};
  if (options?.json !== false && !(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(detail || `Request failed: ${res.status}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function inferSeverity(riskScore: number, anomalies: AnomalyDetail[]): Severity {
  if (anomalies.some((a) => a.severity === 'critique') || riskScore >= 70) return 'critique';
  if (anomalies.some((a) => a.severity === 'suspect') || riskScore >= 40) return 'suspect';
  if (anomalies.length > 0) return 'a_verifier';
  return 'a_verifier';
}

function normalizeAnomaly(raw: unknown): AnomalyDetail {
  if (typeof raw === 'string') {
    return {
      rule_name: raw,
      reason: raw,
      severity: 'a_verifier',
      score_contribution: 10,
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    rule_name: String(o.rule_name ?? o.rule ?? o.type ?? 'Anomaly'),
    reason: String(o.reason ?? o.description ?? o.rule_name ?? 'Signal détecté'),
    severity: (o.severity as Severity) ?? 'a_verifier',
    score_contribution: Number(o.score_contribution ?? o.score ?? 10),
  };
}

export function normalizeTransaction(raw: Record<string, unknown>): Transaction {
  const anomaliesRaw = raw.anomalies ?? [];
  const anomalies = Array.isArray(anomaliesRaw)
    ? anomaliesRaw.map(normalizeAnomaly)
    : [];

  const riskScore = Number(raw.risk_score ?? raw.riskScore ?? 0);
  const severity = (raw.severity as Severity) ?? inferSeverity(riskScore, anomalies);

  return {
    id: String(raw.id ?? raw.transaction_id ?? ''),
    date: String(raw.date ?? new Date().toISOString()),
    description: String(raw.description ?? raw.fournisseur ?? ''),
    amount: Number(raw.amount ?? raw.montant ?? 0),
    risk_score: riskScore,
    severity,
    anomalies,
    aiExplanation: raw.aiExplanation
      ? String(raw.aiExplanation)
      : raw.explanation
        ? String(raw.explanation)
        : undefined,
  };
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const data = await request<unknown[]>('/transactions');
  return (data ?? []).map((t) => normalizeTransaction(t as Record<string, unknown>));
}

export async function fetchAnomalies(): Promise<Transaction[]> {
  const data = await request<unknown[]>('/anomalies');
  return (data ?? []).map((t) => normalizeTransaction(t as Record<string, unknown>));
}

export async function fetchStats(): Promise<StatsData> {
  const raw = await request<Record<string, unknown>>('/stats');
  const txs = await fetchTransactions().catch(() => [] as Transaction[]);
  if (txs.length > 0) {
    return computeStatsFromTransactions(txs);
  }
  const total = Number(raw.transactions_count ?? 0);
  const anomalyCount = Number(raw.anomalies_count ?? 0);
  return {
    global_risk_score: 0,
    total_transactions: total,
    anomaly_count: anomalyCount,
    total_amount: Number(raw.total_amount ?? 0),
    transactions_over_time: [],
    anomaly_distribution: Object.entries(
      (raw.anomalies_by_severity as Record<string, number>) ?? {},
    ).map(([name, count]) => ({ name, count })),
    severity_distribution: [],
    risk_score_distribution: [],
  };
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  return request<HistoryEntry[]>('/history');
}

export type ExplainResult = {
  explanation: string;
  source: 'llm' | 'template' | 'unknown';
};

export async function postExplain(
  transactionId: string,
  ruleName?: string,
): Promise<ExplainResult> {
  const res = await fetch(apiUrl('/explain'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}),
    },
    body: JSON.stringify({
      transaction_id: transactionId,
      rule_name: ruleName ?? null,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(detail, res.status);
  }
  const data = (await res.json()) as Record<string, unknown>;
  const text = String(data.text ?? data.explanation ?? '');
  const src = String(data.source ?? 'unknown');
  const source = src === 'llm' || src === 'template' ? src : 'unknown';
  return { explanation: text, source };
}

export async function postChat(
  transactionId: string,
  message: string,
  history: ChatMessage[],
  ruleName?: string,
): Promise<{ response: string; source: 'llm' | 'template' | 'unknown' }> {
  const res = await fetch(apiUrl('/chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}),
    },
    body: JSON.stringify({
      transaction_id: transactionId,
      message,
      history: history.map((m) => ({ role: m.role, content: m.content })),
      rule_name: ruleName ?? null,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(detail, res.status);
  }
  const data = (await res.json()) as Record<string, unknown>;
  const src = String(data.source ?? 'unknown');
  const source = src === 'llm' || src === 'template' ? src : 'unknown';
  return {
    response: String(data.reply ?? data.response ?? data.text ?? ''),
    source,
  };
}

export type LlmStatus = {
  configured: boolean;
  mode: 'gemini' | 'template';
  model?: string;
};

export async function fetchLlmStatus(): Promise<LlmStatus> {
  try {
    const res = await fetch(apiUrl('/health'));
    if (!res.ok) return { configured: false, mode: 'template' };
    const data = (await res.json()) as Record<string, unknown>;
    return {
      configured: Boolean(data.llm_configured),
      mode: data.explainer_mode === 'gemini' ? 'gemini' : 'template',
      model: data.gemini_model as string | undefined,
    };
  } catch {
    return { configured: false, mode: 'template' };
  }
}

export async function generateReportPdf(report: ReportPayload): Promise<Blob> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}/generate-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error(`PDF generation failed: ${res.status}`);
  return res.blob();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const [a, b] = await Promise.all([
      fetch(apiUrl('/health')).then((r) => r.ok),
      fetch(`${API_BASE}/health`).then((r) => r.ok),
    ]);
    return a || b;
  } catch {
    return false;
  }
}

export { ApiError };

export function emptyStats(): StatsData {
  return computeStatsFromTransactions([]);
}

export function computeStatsFromTransactions(transactions: Transaction[]): StatsData {
  const anomalyTx = transactions.filter((t) => t.anomalies.length > 0);
  const globalRisk =
    transactions.length === 0
      ? 0
      : Math.round(transactions.reduce((s, t) => s + t.risk_score, 0) / transactions.length);

  const byDate: Record<string, { count: number; amount: number }> = {};
  transactions.forEach((t) => {
    const d = t.date.slice(0, 10);
    if (!byDate[d]) byDate[d] = { count: 0, amount: 0 };
    byDate[d].count += 1;
    byDate[d].amount += t.amount;
  });

  const ruleCounts: Record<string, number> = {};
  anomalyTx.forEach((t) => {
    t.anomalies.forEach((a) => {
      ruleCounts[a.rule_name] = (ruleCounts[a.rule_name] ?? 0) + 1;
    });
  });

  const sevCounts: Record<Severity, number> = { critique: 0, suspect: 0, a_verifier: 0 };
  transactions.forEach((t) => {
    sevCounts[t.severity] = (sevCounts[t.severity] ?? 0) + 1;
  });

  const buckets = [
    { range: '0-39', min: 0, max: 39, count: 0 },
    { range: '40-69', min: 40, max: 69, count: 0 },
    { range: '70-100', min: 70, max: 100, count: 0 },
  ];
  transactions.forEach((t) => {
    const b = buckets.find((x) => t.risk_score >= x.min && t.risk_score <= x.max);
    if (b) b.count += 1;
  });

  return {
    global_risk_score: globalRisk,
    total_transactions: transactions.length,
    anomaly_count: anomalyTx.length,
    total_amount: transactions.reduce((s, t) => s + t.amount, 0),
    transactions_over_time: Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, count: v.count, amount: v.amount })),
    anomaly_distribution: Object.entries(ruleCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    severity_distribution: (['critique', 'suspect', 'a_verifier'] as Severity[]).map(
      (severity) => ({ severity, count: sevCounts[severity] }),
    ),
    risk_score_distribution: buckets,
  };
}
