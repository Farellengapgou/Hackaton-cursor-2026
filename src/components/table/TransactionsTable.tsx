import SeverityBadge from '../shared/SeverityBadge';
import { getRiskTailwind, getSeverityBgTailwind } from '../../styles/theme';
import { formatDate, formatFCFA } from '../../utils/format';
import { useI18n } from '../../i18n';
import type { Transaction } from '../../types';

interface TransactionsTableProps {
  transactions: Transaction[];
  selectedId: string | null;
  onSelect: (tx: Transaction) => void;
}

export default function TransactionsTable({
  transactions,
  selectedId,
  onSelect,
}: TransactionsTableProps) {
  const { t, locale } = useI18n();

  return (
    <div className="overflow-hidden rounded-xl border border-themed bg-themed-panel/40">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-themed bg-themed-light/80 text-xs uppercase tracking-wider text-muted">
            <th className="px-5 py-3.5 font-medium">{t('transactions.columns.date')}</th>
            <th className="px-5 py-3.5 font-medium">{t('transactions.columns.description')}</th>
            <th className="px-5 py-3.5 font-medium text-right">{t('transactions.columns.amount')}</th>
            <th className="px-5 py-3.5 font-medium">{t('transactions.columns.severity')}</th>
            <th className="px-5 py-3.5 font-medium text-right">{t('transactions.columns.riskScore')}</th>
            <th className="px-5 py-3.5 font-medium">{t('transactions.columns.anomalies')}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center text-muted">
                {t('transactions.empty')}
              </td>
            </tr>
          ) : (
            transactions.map((tx) => {
              const isSelected = selectedId === tx.id;
              const rowBorder =
                tx.severity === 'critique'
                  ? 'border-l-2 border-l-danger'
                  : tx.severity === 'suspect'
                    ? 'border-l-2 border-l-accent'
                    : tx.anomalies.length === 0
                      ? 'border-l-2 border-l-primary/40'
                      : '';
              return (
                <tr
                  key={tx.id}
                  onClick={() => onSelect(tx)}
                  className={`cursor-pointer border-b border-themed/50 transition-all duration-200 ${rowBorder} ${
                    isSelected
                      ? 'bg-primary/15 ring-1 ring-inset ring-primary/40'
                      : 'hover:bg-themed-hover'
                  }`}
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-muted">{formatDate(tx.date, locale)}</td>
                  <td className="max-w-xs truncate px-5 py-3.5 font-medium text-themed-fg">{tx.description}</td>
                  <td className="px-5 py-3.5 text-right font-mono">{formatFCFA(tx.amount, locale)}</td>
                  <td className="px-5 py-3.5">
                    <SeverityBadge severity={tx.severity} />
                  </td>
                  <td className={`px-5 py-3.5 text-right font-mono text-base font-bold ${getRiskTailwind(tx.risk_score)}`}>
                    {tx.risk_score}
                  </td>
                  <td className="px-5 py-3.5">
                    {tx.anomalies.length > 0 ? (
                      <span className={`rounded-md border px-2 py-0.5 text-xs ${getSeverityBgTailwind(tx.severity)}`}>
                        {tx.anomalies.length}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
