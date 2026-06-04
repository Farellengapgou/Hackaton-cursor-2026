import type { Severity, Transaction } from '../types';

const SEVERITY_RANK: Record<Severity, number> = {
  critique: 3,
  suspect: 2,
  a_verifier: 1,
};

export type TransactionSortKey = 'date' | 'name' | 'severity';
export type SortOrder = 'asc' | 'desc';

export function severityRank(tx: Transaction): number {
  if (tx.anomalies.length === 0) return 0;
  return SEVERITY_RANK[tx.severity] ?? 0;
}

export function sortTransactions(
  txs: Transaction[],
  sortBy: TransactionSortKey,
  order: SortOrder,
): Transaction[] {
  const dir = order === 'asc' ? 1 : -1;
  return [...txs].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'name':
        cmp = a.description.localeCompare(b.description, 'fr', { sensitivity: 'base' });
        break;
      case 'date':
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'severity':
        cmp = severityRank(a) - severityRank(b);
        if (cmp === 0) cmp = a.risk_score - b.risk_score;
        if (cmp === 0) cmp = b.anomalies.length - a.anomalies.length;
        break;
    }
    if (cmp === 0) cmp = a.id.localeCompare(b.id);
    return cmp * dir;
  });
}

export function parseSortKey(raw: string | null, onlyFlagged = false): TransactionSortKey {
  if (raw === 'name' || raw === 'date' || raw === 'severity') return raw;
  return onlyFlagged ? 'severity' : 'date';
}

export function parseSortOrder(raw: string | null): SortOrder {
  return raw === 'asc' ? 'asc' : 'desc';
}
