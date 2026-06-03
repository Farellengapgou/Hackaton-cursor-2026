import type { AuditSummary } from '../../types';
import { formatFCFA } from '../../utils/format';
import { useI18n } from '../../i18n';
import GlassPanel from '../shared/GlassPanel';

interface SummaryCardsProps {
  summary: AuditSummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const { t, locale } = useI18n();
  const critical = summary.criticalCount;

  const cards = [
    { label: t('dashboard.kpi.transactions'), value: String(summary.totalTransactions), color: 'text-themed-fg' },
    { label: t('dashboard.kpi.anomalies'), value: String(summary.anomalyCount), color: 'text-accent' },
    { label: t('dashboard.kpi.totalAmount'), value: formatFCFA(summary.totalAmount, locale), color: 'text-primary' },
    { label: t('dashboard.kpi.critical'), value: String(critical), color: 'text-danger' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <GlassPanel key={c.label} className="p-5 transition hover:border-primary/30">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{c.label}</p>
          <p className={`mt-2 font-mono text-2xl font-bold ${c.color}`}>{c.value}</p>
        </GlassPanel>
      ))}
    </div>
  );
}
