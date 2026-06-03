import { useMemo, useState } from 'react';
import TransactionDetailPanel from '../components/table/TransactionDetailPanel';
import TransactionFilters, { type FilterState } from '../components/table/TransactionFilters';
import TransactionsTable from '../components/table/TransactionsTable';
import { useTransactions } from '../hooks/useTransactions';
import { useI18n } from '../i18n';

const defaultFilters: FilterState = {
  severity: 'all',
  minAmount: '',
  maxAmount: '',
  dateFrom: '',
  dateTo: '',
};

export default function Transactions() {
  const { transactions, selectedTransaction, setSelectedTransaction } = useTransactions();
  const { t } = useI18n();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [panelTx, setPanelTx] = useState(selectedTransaction);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filters.severity !== 'all' && tx.severity !== filters.severity) return false;
      if (filters.minAmount && tx.amount < Number(filters.minAmount)) return false;
      if (filters.maxAmount && tx.amount > Number(filters.maxAmount)) return false;
      const d = new Date(tx.date);
      if (filters.dateFrom && d < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && d > new Date(`${filters.dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [transactions, filters]);

  const handleSelect = (tx: (typeof transactions)[0]) => {
    setSelectedTransaction(tx);
    setPanelTx(tx);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-themed-fg">{t('transactions.title')}</h2>
        <p className="mt-1 text-sm text-muted">
          {t('transactions.subtitle', { filtered: filtered.length, total: transactions.length })}
        </p>
      </div>

      <TransactionFilters filters={filters} onChange={setFilters} />

      <TransactionsTable
        transactions={filtered}
        selectedId={panelTx?.id ?? null}
        onSelect={handleSelect}
      />

      <TransactionDetailPanel transaction={panelTx} onClose={() => setPanelTx(null)} />
    </div>
  );
}
