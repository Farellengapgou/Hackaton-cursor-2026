import type { Severity } from '../../types';
import { useI18n } from '../../i18n';
import type { SortOrder, TransactionSortKey } from '../../utils/transactionSort';

export interface FilterState {
  severity: Severity | 'all';
  minAmount: string;
  maxAmount: string;
  dateFrom: string;
  dateTo: string;
  rule: string;
  riskRange?: string;
  onlyFlagged: boolean;
  sortBy: TransactionSortKey;
  sortOrder: SortOrder;
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-themed bg-themed-panel/60 px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-themed-fg">
          <input
            type="checkbox"
            checked={filters.onlyFlagged}
            onChange={(e) => update({ onlyFlagged: e.target.checked })}
            className="h-4 w-4 rounded border-themed text-primary focus:ring-primary/40"
          />
          <span>{t('transactions.filters.onlyFlagged')}</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted">
            {t('transactions.filters.sortBy')}
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => update({ sortBy: e.target.value as TransactionSortKey })}
            className="rounded-lg border border-themed bg-themed px-3 py-2 text-sm text-themed-fg outline-none focus:border-primary"
          >
            <option value="severity">{t('transactions.filters.sortSeverity')}</option>
            <option value="date">{t('transactions.filters.sortDate')}</option>
            <option value="name">{t('transactions.filters.sortName')}</option>
          </select>
          <select
            value={filters.sortOrder}
            onChange={(e) => update({ sortOrder: e.target.value as SortOrder })}
            className="rounded-lg border border-themed bg-themed px-3 py-2 text-sm text-themed-fg outline-none focus:border-primary"
            aria-label={t('transactions.filters.sortOrder')}
          >
            <option value="desc">{t('transactions.filters.sortDesc')}</option>
            <option value="asc">{t('transactions.filters.sortAsc')}</option>
          </select>
        </div>
      </div>
    <div className="grid gap-4 rounded-xl border border-themed bg-themed-panel/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="sm:col-span-2 lg:col-span-1">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
          Type d&apos;anomalie
        </label>
        <input
          type="text"
          placeholder="ex. DOUBLON, Benford…"
          value={filters.rule}
          onChange={(e) => update({ rule: e.target.value })}
          className="w-full rounded-lg border border-themed bg-themed px-3 py-2 text-sm text-themed-fg outline-none focus:border-primary"
        />
      </div>
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
    </div>
  );
}
