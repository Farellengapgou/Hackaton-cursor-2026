import type { Transaction, StatsData } from '../types';
import { computeStatsFromTransactions } from '../services/api';

export const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'TX-2026-0048',
    date: '2026-06-03T16:42:00',
    description: 'Virement — Global Import SARL',
    amount: 2847500,
    severity: 'critique',
    risk_score: 91,
    anomalies: [
      {
        rule_name: 'Benford',
        reason: 'Distribution du premier chiffre non conforme à Benford',
        severity: 'critique',
        score_contribution: 35,
      },
      {
        rule_name: 'Outlier',
        reason: 'Montant 4,2× la médiane sectorielle',
        severity: 'critique',
        score_contribution: 28,
      },
    ],
    aiExplanation:
      'Le chiffre leading "2" apparaît à 38 % vs 17,6 % attendu (Benford). Fournisseur non vérifié — revue documentaire immédiate.',
  },
  {
    id: 'TX-2026-0047',
    date: '2026-06-03T14:22:00',
    description: 'Paiement fournisseur — SARL Import Douala',
    amount: 1250000,
    severity: 'critique',
    risk_score: 82,
    anomalies: [
      {
        rule_name: 'Outlier',
        reason: 'Z-score 3,4 sur le montant',
        severity: 'critique',
        score_contribution: 40,
      },
      {
        rule_name: 'Vendor',
        reason: 'Fournisseur absent du registre approuvé',
        severity: 'suspect',
        score_contribution: 20,
      },
    ],
  },
  {
    id: 'TX-2026-0046',
    date: '2026-06-03T11:05:00',
    description: 'Carburant — Station Total Bastos',
    amount: 45000,
    severity: 'a_verifier',
    risk_score: 18,
    anomalies: [],
  },
  {
    id: 'TX-2026-0045',
    date: '2026-06-02T23:18:00',
    description: 'Mobile Money — Agent #447',
    amount: 890000,
    severity: 'suspect',
    risk_score: 71,
    anomalies: [
      {
        rule_name: 'After Hours',
        reason: 'Saisie hors heures ouvrables (23:18)',
        severity: 'suspect',
        score_contribution: 25,
      },
      {
        rule_name: 'Pattern',
        reason: 'Montant rond récurrent',
        severity: 'suspect',
        score_contribution: 15,
      },
    ],
  },
  {
    id: 'TX-2026-0044',
    date: '2026-06-02T18:30:00',
    description: 'Doublon — Office Supplies Co.',
    amount: 125000,
    severity: 'critique',
    risk_score: 88,
    anomalies: [
      {
        rule_name: 'Duplicate',
        reason: 'Doublon exact de TX-2026-0031 sous 72h',
        severity: 'critique',
        score_contribution: 45,
      },
    ],
  },
  {
    id: 'TX-2026-0043',
    date: '2026-06-02T15:12:00',
    description: 'Consulting — AfriTech Partners',
    amount: 320000,
    severity: 'a_verifier',
    risk_score: 22,
    anomalies: [],
  },
  {
    id: 'TX-2026-0042',
    date: '2026-06-02T10:45:00',
    description: 'Avance paie — Lot employés',
    amount: 156000,
    severity: 'a_verifier',
    risk_score: 31,
    anomalies: [],
  },
  {
    id: 'TX-2026-0041',
    date: '2026-06-01T22:55:00',
    description: 'Retrait espèces — DAB agence',
    amount: 500000,
    severity: 'suspect',
    risk_score: 64,
    anomalies: [
      {
        rule_name: 'Benford',
        reason: 'Déviation Benford sur registre espèces',
        severity: 'suspect',
        score_contribution: 22,
      },
    ],
  },
  {
    id: 'TX-2026-0040',
    date: '2026-06-01T16:20:00',
    description: 'Prime assurance — AXA Régional',
    amount: 780000,
    severity: 'a_verifier',
    risk_score: 28,
    anomalies: [],
  },
  {
    id: 'TX-2026-0039',
    date: '2026-06-01T09:30:00',
    description: 'Doublon — Office Supplies Co.',
    amount: 125000,
    severity: 'critique',
    risk_score: 85,
    anomalies: [
      {
        rule_name: 'Duplicate',
        reason: 'Chaîne de paiements en double potentielle',
        severity: 'critique',
        score_contribution: 42,
      },
    ],
  },
  {
    id: 'TX-2026-0038',
    date: '2026-05-31T17:00:00',
    description: 'Location équipement — TechLease GmbH',
    amount: 2100000,
    severity: 'critique',
    risk_score: 76,
    anomalies: [
      {
        rule_name: 'Outlier',
        reason: 'Pic vs moyenne mobile 90 jours',
        severity: 'critique',
        score_contribution: 38,
      },
    ],
  },
  {
    id: 'TX-2026-0037',
    date: '2026-05-31T14:15:00',
    description: 'Traiteur — Event Services Ltd',
    amount: 89000,
    severity: 'a_verifier',
    risk_score: 19,
    anomalies: [],
  },
  {
    id: 'TX-2026-0036',
    date: '2026-05-30T20:10:00',
    description: 'Fournisseur — Entité inconnue #992',
    amount: 445000,
    severity: 'critique',
    risk_score: 79,
    anomalies: [
      {
        rule_name: 'Vendor',
        reason: 'ID absent du référentiel fournisseurs',
        severity: 'critique',
        score_contribution: 35,
      },
    ],
  },
  {
    id: 'TX-2026-0035',
    date: '2026-05-30T11:00:00',
    description: 'Utilities — ENEO Cameroun',
    amount: 234500,
    severity: 'a_verifier',
    risk_score: 15,
    anomalies: [],
  },
  {
    id: 'TX-2026-0034',
    date: '2026-05-29T13:45:00',
    description: 'Voyage — Air France Corporate',
    amount: 567000,
    severity: 'a_verifier',
    risk_score: 35,
    anomalies: [],
  },
];

export function computeSummary(transactions: Transaction[]) {
  const stats = computeStatsFromTransactions(transactions);
  const mostCommon = stats.anomaly_distribution[0]?.name ?? 'Aucune';
  const criticalCount = transactions.filter(
    (t) => t.severity === 'critique' || t.risk_score >= 70,
  ).length;
  return {
    totalTransactions: stats.total_transactions,
    anomalyCount: stats.anomaly_count,
    globalRiskScore: stats.global_risk_score,
    totalAmount: stats.total_amount,
    mostCommonAnomaly: mostCommon,
    criticalCount,
  };
}

export function getQuickInsights(transactions: Transaction[]): string[] {
  const summary = computeSummary(transactions);
  const highRisk = transactions.filter((t) => t.risk_score >= 70).length;
  const benford = transactions.filter((t) =>
    t.anomalies.some((a) => /benford/i.test(a.rule_name)),
  ).length;
  const duplicates = transactions.filter((t) =>
    t.anomalies.some((a) => /duplicate|doublon/i.test(a.rule_name)),
  ).length;

  return [
    `${summary.anomalyCount} anomalies signalées sur ${summary.totalTransactions} transactions (${Math.round((summary.anomalyCount / Math.max(summary.totalTransactions, 1)) * 100)} % de taux).`,
    `${highRisk} transactions dépassent le seuil critique (score ≥ 70).`,
    benford > 0
      ? `Analyse Benford : ${benford} écritures avec distribution de chiffres atypique.`
      : 'Analyse Benford : aucune anomalie significative sur ce lot.',
    duplicates > 0
      ? `${duplicates} correspondances de type duplication à revoir en comptabilité fournisseurs.`
      : 'Détection de doublons : aucun cluster exact sur la fenêtre courante.',
    `Signal dominant : ${summary.mostCommonAnomaly}.`,
  ];
}

export function getDemoStats(): StatsData {
  return computeStatsFromTransactions(DEMO_TRANSACTIONS);
}
