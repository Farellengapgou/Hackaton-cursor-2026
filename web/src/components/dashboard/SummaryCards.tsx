import type { AuditSummary } from '../../types';
import { formatFCFA } from '../../utils/format';
import { useI18n } from '../../i18n';
import GlassPanel from '../shared/GlassPanel';

interface SummaryCardsProps {
  summary: AuditSummary;
  onAnomaliesClick?: () => void;
}

export default function SummaryCards({ summary, onAnomaliesClick }: SummaryCardsProps) {
  const { t, locale } = useI18n();
  const critical = summary.criticalCount;

  const cards: {
    label: string;
    value: string;
    color: string;
    onClick?: () => void;
    hint?: string;
    compactValue?: boolean;
  }[] = [
    { label: t('dashboard.kpi.transactions'), value: String(summary.totalTransactions), color: 'text-themed-fg' },
    {
      label: t('dashboard.kpi.anomalies'),
      value: String(summary.anomalyCount),
      color: 'text-accent',
      onClick: onAnomaliesClick,
      hint: onAnomaliesClick ? t('dashboard.kpi.anomaliesHint') : undefined,
    },
    {
      label: t('dashboard.kpi.totalAmount'),
      value: formatFCFA(summary.totalAmount, locale),
      color: 'text-primary',
      compactValue: true,
    },
    { label: t('dashboard.kpi.critical'), value: String(critical), color: 'text-danger' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => {
        const inner = (
          <>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">{c.label}</p>
            <p
              className={`mt-2 font-mono font-bold ${c.color} ${
                c.compactValue ? 'break-words text-base leading-snug sm:text-xl' : 'text-2xl'
              }`}
            >
              {c.value}
            </p>
            {c.hint && <p className="mt-1 text-[10px] text-muted">{c.hint}</p>}
          </>
        );
        if (c.onClick) {
          return (
            <button
              key={c.label}
              type="button"
              onClick={c.onClick}
              className="text-left transition hover:opacity-90"
            >
              <GlassPanel className="cursor-pointer p-5 transition hover:border-accent/50 hover:shadow-glow">
                {inner}
              </GlassPanel>
            </button>
          );
        }
        return (
          <GlassPanel key={c.label} className="p-5 transition hover:border-primary/30">
            {inner}
          </GlassPanel>
        );
      })}
    </div>
  );
}
