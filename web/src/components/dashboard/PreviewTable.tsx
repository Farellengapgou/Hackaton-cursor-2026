import type { Transaction } from '../../types';
import SeverityBadge from '../shared/SeverityBadge';
import { getRiskTailwind } from '../../styles/theme';
import { formatDate, formatFCFA, formatFCFACompact } from '../../utils/format';
import { useI18n } from '../../i18n';
import { useTransactions } from '../../hooks/useTransactions';
import GlassPanel from '../shared/GlassPanel';

interface PreviewTableProps {
  transactions: Transaction[];
}

export default function PreviewTable({ transactions }: PreviewTableProps) {
  const { t, locale } = useI18n();
  const { setSelectedTransaction, openAssistantFor } = useTransactions();

  return (
    <GlassPanel className="overflow-hidden">
      <div className="border-b border-themed px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-themed-fg">{t('dashboard.preview')}</h3>
        <p className="text-xs text-muted">
          {t('dashboard.previewRowsHint', { count: transactions.length })}
        </p>
      </div>
      <div className="max-h-[420px] overflow-auto scrollbar-thin">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-themed-panel">
            <tr className="border-b border-themed text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3 font-medium sm:px-5">{t('transactions.columns.date')}</th>
              <th className="px-4 py-3 font-medium sm:px-5">ID</th>
              <th className="px-4 py-3 font-medium sm:px-5">{t('transactions.columns.description')}</th>
              <th className="px-4 py-3 font-medium text-right sm:px-5">
                {t('transactions.columns.amount')}
              </th>
              <th className="px-4 py-3 font-medium sm:px-5">{t('transactions.columns.severity')}</th>
              <th className="px-4 py-3 font-medium text-right sm:px-5">
                {t('transactions.columns.riskScore')}
              </th>
              <th className="px-4 py-3 font-medium sm:px-5">{t('transactions.columns.anomalies')}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted">
                  {t('dashboard.previewEmpty')}
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => {
                    setSelectedTransaction(tx);
                    openAssistantFor(tx.id);
                  }}
                  className={`cursor-pointer border-b border-themed/50 transition hover:bg-themed-hover ${
                    tx.severity === 'critique' ? 'border-l-2 border-l-danger bg-danger/[0.03]' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-muted sm:px-5">
                    {formatDate(tx.date, locale)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs sm:px-5">{tx.id}</td>
                  <td className="max-w-[180px] truncate px-4 py-2.5 text-themed-fg sm:px-5">
                    {tx.description}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs sm:px-5">
                    <span title={formatFCFA(tx.amount, locale)}>{formatFCFACompact(tx.amount, locale)}</span>
                  </td>
                  <td className="px-4 py-2.5 sm:px-5">
                    <SeverityBadge severity={tx.severity} />
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono font-bold sm:px-5 ${getRiskTailwind(tx.risk_score)}`}
                  >
                    {tx.risk_score}
                  </td>
                  <td className="px-4 py-2.5 text-xs sm:px-5">
                    {tx.anomalies.length > 0
                      ? tx.anomalies.map((a) => a.rule_name).join(', ')
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}
