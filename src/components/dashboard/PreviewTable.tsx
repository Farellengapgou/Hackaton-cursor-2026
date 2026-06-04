import type { Transaction } from '../../types';
import SeverityBadge from '../shared/SeverityBadge';
import { getRiskTailwind } from '../../styles/theme';
import { formatDate, formatFCFA } from '../../utils/format';
import { useI18n } from '../../i18n';
import GlassPanel from '../shared/GlassPanel';

interface PreviewTableProps {
  transactions: Transaction[];
}

export default function PreviewTable({ transactions }: PreviewTableProps) {
  const { t, locale } = useI18n();
  const rows = transactions.slice(0, 10);

  return (
    <GlassPanel className="overflow-hidden">
      <div className="border-b border-themed px-5 py-3">
        <h3 className="text-sm font-semibold text-themed-fg">{t('dashboard.preview')}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-themed text-xs uppercase tracking-wider text-muted">
              <th className="px-5 py-3 font-medium">{t('transactions.columns.date')}</th>
              <th className="px-5 py-3 font-medium">{t('transactions.columns.description')}</th>
              <th className="px-5 py-3 font-medium text-right">{t('transactions.columns.amount')}</th>
              <th className="px-5 py-3 font-medium">{t('transactions.columns.severity')}</th>
              <th className="px-5 py-3 font-medium text-right">{t('transactions.columns.riskScore')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr
                key={tx.id}
                className={`border-b border-themed/50 transition hover:bg-themed-hover ${
                  tx.severity === 'critique' ? 'border-l-2 border-l-danger bg-danger/[0.03]' : ''
                }`}
              >
                <td className="px-5 py-3 font-mono text-xs text-muted">{formatDate(tx.date, locale)}</td>
                <td className="max-w-[200px] truncate px-5 py-3 text-themed-fg">{tx.description}</td>
                <td className="px-5 py-3 text-right font-mono">{formatFCFA(tx.amount, locale)}</td>
                <td className="px-5 py-3"><SeverityBadge severity={tx.severity} /></td>
                <td className={`px-5 py-3 text-right font-mono font-bold ${getRiskTailwind(tx.risk_score)}`}>
                  {tx.risk_score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}
