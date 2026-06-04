export type Severity = 'critique' | 'suspect' | 'a_verifier';

export interface AnomalyDetail {
  rule_name: string;
  reason: string;
  severity: Severity;
  score_contribution: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  risk_score: number;
  severity: Severity;
  anomalies: AnomalyDetail[];
  aiExplanation?: string;
}

export interface StatsData {
  global_risk_score: number;
  total_transactions: number;
  anomaly_count: number;
  total_amount: number;
  transactions_over_time: { date: string; count: number; amount?: number }[];
  anomaly_distribution: { name: string; count: number }[];
  severity_distribution: { severity: Severity; count: number }[];
  risk_score_distribution: { range: string; count: number; min?: number; max?: number }[];
  insights?: string[];
}

export interface AuditSummary {
  totalTransactions: number;
  anomalyCount: number;
  globalRiskScore: number;
  totalAmount: number;
  mostCommonAnomaly: string;
  criticalCount: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface HistoryEntry {
  id: string;
  filename: string;
  uploaded_at: string;
  transaction_count: number;
}

export interface ReportPayload {
  total_transactions: number;
  total_anomalies: number;
  score_moyen: number;
  total_amount: number;
  anomalies: {
    id: string;
    montant: number;
    fournisseur: string;
    score_risque: number;
    severity: Severity;
    explication_ia: string;
  }[];
}
