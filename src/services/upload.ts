import { normalizeTransaction } from './api';
import type { Severity, Transaction } from '../types';
import { getStoredToken } from '../store/authStore';

const API_BASE = '/api';

function inferSeverity(riskScore: number, anomalies: unknown[]): Severity {
  if (riskScore >= 70) return 'critique';
  if (riskScore >= 40) return 'suspect';
  if (anomalies.length > 0) return 'a_verifier';
  return 'a_verifier';
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else current += ch;
  }
  result.push(current.trim());
  return result;
}

export function parseCsvToTransactions(csvText: string): Transaction[] {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = {
    id: headers.findIndex((h) => /id|reference/.test(h)),
    date: headers.findIndex((h) => /date|heure|time/.test(h)),
    description: headers.findIndex((h) => /desc|fournisseur|vendor|label/.test(h)),
    amount: headers.findIndex((h) => /amount|montant/.test(h)),
    risk: headers.findIndex((h) => /risk|score|risque/.test(h)),
    severity: headers.findIndex((h) => /severity|severite|sévérité/.test(h)),
    anomalies: headers.findIndex((h) => /anomal/.test(h)),
  };

  return lines.slice(1).map((line, i) => {
    const cols = parseCsvLine(line);
    const anomaliesRaw = idx.anomalies >= 0 ? cols[idx.anomalies] ?? '' : '';
    const anomalyStrings = anomaliesRaw
      ? anomaliesRaw.split(/[;|]/).map((a) => a.trim()).filter(Boolean)
      : [];
    const amount = parseFloat((cols[idx.amount] ?? '0').replace(/[^\d.-]/g, '')) || 0;
    const riskScore = parseFloat(cols[idx.risk] ?? '') || (anomalyStrings.length > 0 ? 55 : 20);
    const severity = (cols[idx.severity] as Severity) || inferSeverity(riskScore, anomalyStrings);

    return normalizeTransaction({
      id: cols[idx.id] || `TX-IMPORT-${String(i + 1).padStart(4, '0')}`,
      date: cols[idx.date] || new Date().toISOString(),
      description: cols[idx.description] || 'Transaction importée',
      amount,
      risk_score: Math.min(100, Math.max(0, Math.round(riskScore))),
      severity,
      anomalies: anomalyStrings.map((a) => ({
        rule_name: a,
        reason: a,
        severity,
        score_contribution: 10,
      })),
    });
  });
}

export async function uploadCsv(file: File): Promise<Transaction[]> {
  const token = getStoredToken();

  for (const path of ['/upload', '/analyze']) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.transactions ?? []);
        return list.map((t: Record<string, unknown>) => normalizeTransaction(t));
      }
    } catch {
      /* try next or fallback */
    }
  }

  const text = await file.text();
  return parseCsvToTransactions(text);
}
