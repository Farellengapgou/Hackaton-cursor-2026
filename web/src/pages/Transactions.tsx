import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TransactionDetailPanel from '../components/table/TransactionDetailPanel';
import TransactionFilters, { type FilterState } from '../components/table/TransactionFilters';
import TransactionsTable from '../components/table/TransactionsTable';
import { useTransactions } from '../hooks/useTransactions';
import { useI18n } from '../i18n';
import { parseSortKey, parseSortOrder, sortTransactions } from '../utils/transactionSort';

function filtersFromSearchParams(
  searchParams: URLSearchParams,
  anomalyFilter: string | null,
): FilterState {
  const onlyFlagged = searchParams.get('flagged') === '1';
  const sevRaw = searchParams.get('severity');
  const severity: FilterState['severity'] =
    sevRaw && ['critique', 'suspect', 'a_verifier'].includes(sevRaw)
      ? (sevRaw as FilterState['severity'])
      : 'all';
  return {
    severity,
    minAmount: '',
    maxAmount: '',
    dateFrom: '',
    dateTo: '',
    rule: searchParams.get('rule') ?? anomalyFilter ?? '',
    riskRange: searchParams.get('riskRange') ?? '',
    onlyFlagged,
    sortBy: parseSortKey(searchParams.get('sort'), onlyFlagged),
    sortOrder: parseSortOrder(searchParams.get('order')),
  };
}

export default function Transactions() {
  const {
    transactions,
    selectedTransaction,
    setSelectedTransaction,
    anomalyFilter,
    setAnomalyFilter,
    openAssistantFor,
  } = useTransactions();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() =>
    filtersFromSearchParams(searchParams, anomalyFilter),
  );
  const [panelTx, setPanelTx] = useState(selectedTransaction);

  useEffect(() => {
    setFilters(filtersFromSearchParams(searchParams, anomalyFilter));
    const rule = searchParams.get('rule') ?? '';
    if (rule) setAnomalyFilter(rule);
  }, [searchParams, anomalyFilter, setAnomalyFilter]);

  const syncUrl = useCallback(
    (next: FilterState) => {
      const p = new URLSearchParams(searchParams);
      if (next.onlyFlagged) p.set('flagged', '1');
      else p.delete('flagged');
      if (next.rule) p.set('rule', next.rule);
      else p.delete('rule');
      if (next.severity !== 'all') p.set('severity', next.severity);
      else p.delete('severity');
      if (next.riskRange) p.set('riskRange', next.riskRange);
      else p.delete('riskRange');
      if (next.sortBy !== 'date' || next.onlyFlagged) p.set('sort', next.sortBy);
      else p.delete('sort');
      if (next.sortOrder !== 'desc') p.set('order', next.sortOrder);
      else p.delete('order');
      setSearchParams(p, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleFiltersChange = useCallback(
    (next: FilterState) => {
      setFilters(next);
      syncUrl(next);
    },
    [syncUrl],
  );

  const filtered = useMemo(() => {
    const list = transactions.filter((tx) => {
      if (filters.onlyFlagged && tx.anomalies.length === 0) return false;
      if (filters.severity !== 'all' && tx.severity !== filters.severity) return false;
      if (filters.minAmount && tx.amount < Number(filters.minAmount)) return false;
      if (filters.maxAmount && tx.amount > Number(filters.maxAmount)) return false;
      const d = new Date(tx.date);
      if (filters.dateFrom && d < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && d > new Date(`${filters.dateTo}T23:59:59`)) return false;
      if (filters.rule) {
        const match = tx.anomalies.some(
          (a) => a.rule_name.toLowerCase() === filters.rule.toLowerCase(),
        );
        if (!match) return false;
      }
      if (filters.riskRange) {
        const [minS, maxS] = filters.riskRange.split('-').map(Number);
        if (!Number.isNaN(minS) && tx.risk_score < minS) return false;
        if (!Number.isNaN(maxS) && tx.risk_score > maxS) return false;
      }
      return true;
    });
    return sortTransactions(list, filters.sortBy, filters.sortOrder);
  }, [transactions, filters]);

  const handleSelect = (tx: (typeof transactions)[0]) => {
    setSelectedTransaction(tx);
    setPanelTx(tx);
  };

  const clearFilters = () => {
    const fresh: FilterState = {
      severity: 'all',
      minAmount: '',
      maxAmount: '',
      dateFrom: '',
      dateTo: '',
      rule: '',
      riskRange: '',
      onlyFlagged: false,
      sortBy: 'date',
      sortOrder: 'desc',
    };
    setAnomalyFilter(null);
    setSearchParams({}, { replace: true });
    setFilters(fresh);
  };

  const hasActiveFilter =
    filters.onlyFlagged ||
    filters.rule ||
    filters.riskRange ||
    filters.severity !== 'all' ||
    filters.sortBy === 'severity';

  return (
    <div className="animate-fade-in space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl font-bold text-themed-fg sm:text-2xl">{t('transactions.title')}</h2>
        <p className="mt-1 text-sm text-muted">
          {t('transactions.subtitle', { filtered: filtered.length, total: transactions.length })}
        </p>
      </div>

      {hasActiveFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          <span className="text-muted">{t('transactions.activeFilter')}</span>
          {filters.onlyFlagged && (
            <span className="font-medium text-themed-fg">{t('transactions.filters.onlyFlagged')}</span>
          )}
          {filters.sortBy === 'severity' && (
            <span className="font-medium text-themed-fg">{t('transactions.filters.sortedByAnomaly')}</span>
          )}
          {filters.rule && (
            <span className="font-medium text-themed-fg">
              {t('transactions.ruleFilter', { rule: filters.rule })}
            </span>
          )}
          {filters.riskRange && (
            <span className="font-medium text-themed-fg">
              {t('transactions.riskFilter', { range: filters.riskRange })}
            </span>
          )}
          {filters.severity !== 'all' && (
            <span className="font-medium text-themed-fg">{t(`severity.${filters.severity}`)}</span>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto text-xs text-primary hover:underline"
          >
            {t('transactions.clearFilters')}
          </button>
        </div>
      )}

      <TransactionFilters filters={filters} onChange={handleFiltersChange} />

      <TransactionsTable
        transactions={filtered}
        selectedId={panelTx?.id ?? null}
        onSelect={handleSelect}
        onAnalyze={(tx) => openAssistantFor(tx.id)}
      />

      <TransactionDetailPanel transaction={panelTx} onClose={() => setPanelTx(null)} />
    </div>
  );
}
