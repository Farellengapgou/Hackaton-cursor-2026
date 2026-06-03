import type { Severity } from '../../types';
import { useI18n } from '../../i18n';

export interface FilterState {
  severity: Severity | 'all';
  minAmount: string;
  maxAmount: string;
  dateFrom: string;
  dateTo: string;
}

interface TransactionFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const SEVERITY_OPTIONS: (Severity | 'all')[] = ['all', 'critique', 'suspect', 'a_verifier'];

export default function TransactionFilters({ filters, onChange }: TransactionFiltersProps) {
  const { t } = useI18n();
  const update = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="grid gap-4 rounded-xl border border-themed bg-themed-panel/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
          {t('transactions.filters.severity')}
        </label>
        <select
          value={filters.severity}
          onChange={(e) => update({ severity: e.target.value as FilterState['severity'] })}
          className="w-full rounded-lg border border-themed bg-themed px-3 py-2 text-sm text-themed-fg outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/40"
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt} className="bg-themed-panel">
              {opt === 'all' ? t('transactions.filters.all') : t(`severity.${opt}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
          {t('transactions.filters.amountRange')}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minAmount}
            onChange={(e) => update({ minAmount: e.target.value })}
            className="w-full rounded-lg border border-themed bg-themed px-3 py-2 text-sm text-themed-fg outline-none focus:border-primary"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxAmount}
            onChange={(e) => update({ maxAmount: e.target.value })}
            className="w-full rounded-lg border border-themed bg-themed px-3 py-2 text-sm text-themed-fg outline-none focus:border-primary"
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
          {t('transactions.filters.dateFrom')}
        </label>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update({ dateFrom: e.target.value })}
          className="w-full rounded-lg border border-themed bg-themed px-3 py-2 text-sm text-themed-fg outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
          {t('transactions.filters.dateTo')}
        </label>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => update({ dateTo: e.target.value })}
          className="w-full rounded-lg border border-themed bg-themed px-3 py-2 text-sm text-themed-fg outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
