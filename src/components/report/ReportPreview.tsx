import { useMemo, useState } from 'react';
import { generateReportPdf } from '../../services/api';
import type { AuditSummary, Transaction } from '../../types';
import SeverityBadge from '../shared/SeverityBadge';
import GlassPanel from '../shared/GlassPanel';
import RiskGauge from '../shared/RiskGauge';
import ReportSection from './ReportSection';
import { formatFCFA, formatDateTime } from '../../utils/format';
import { useI18n } from '../../i18n';

interface ReportPreviewProps {
  transactions: Transaction[];
  summary: AuditSummary;
}

export default function ReportPreview({ transactions, summary }: ReportPreviewProps) {
  const { t, locale } = useI18n();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const flagged = useMemo(
    () =>
      transactions
        .filter((t) => t.anomalies.length > 0)
        .sort((a, b) => b.risk_score - a.risk_score),
    [transactions],
  );

  const critical = useMemo(
    () => transactions.filter((t) => t.severity === 'critique' || t.risk_score >= 70),
    [transactions],
  );

  const breakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    flagged.forEach((t) => {
      t.anomalies.forEach((a) => {
        counts[a.rule_name] = (counts[a.rule_name] ?? 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [flagged]);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    const payload = {
      total_transactions: summary.totalTransactions,
      total_anomalies: summary.anomalyCount,
      score_moyen: summary.globalRiskScore,
      total_amount: summary.totalAmount,
      anomalies: flagged.map((tx) => ({
        id: tx.id,
        montant: tx.amount,
        fournisseur: tx.description,
        score_risque: tx.risk_score,
        severity: tx.severity,
        explication_ia:
          tx.aiExplanation ??
          `Score ${tx.risk_score}. Signaux : ${tx.anomalies.map((a) => a.rule_name).join(', ') || 'Voir journal.'}`,
      })),
    };

    try {
      const blob = await generateReportPdf(payload);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinAudit_Rapport_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.print();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-themed-fg">{t('report.title')}</h2>
          <p className="text-sm text-muted">{t('report.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark hover:shadow-glow disabled:opacity-50"
        >
          {exporting ? t('report.exporting') : t('report.export')}
        </button>
      </div>
      {exportError && (
        <p className="mb-4 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">
          {exportError}
        </p>
      )}

      <GlassPanel className="p-8 md:p-12 print:bg-white print:text-black" id="audit-report">
        <header className="mb-10 border-b border-themed pb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">{t('report.confidential')}</p>
          <h1 className="mt-2 text-3xl font-bold text-themed-fg">{t('app.name')}</h1>
          <p className="mt-1 text-muted">{t('report.title')}</p>
          <p className="mt-2 font-mono text-xs text-muted">
            {t('report.generated')} {formatDateTime(new Date().toISOString(), locale)}
          </p>
        </header>

        <ReportSection title={t('report.executiveSummary')}>
          <p className="leading-relaxed text-themed-fg/85">
            {t('report.summaryText', {
              total: summary.totalTransactions,
              anomalies: summary.anomalyCount,
              score: summary.globalRiskScore,
            })}
          </p>
        </ReportSection>

        <ReportSection title={t('report.riskOverview')}>
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-around">
            <RiskGauge score={summary.globalRiskScore} size={160} animated={false} />
            <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-3">
              <StatBox label={t('dashboard.kpi.transactions')} value={String(summary.totalTransactions)} />
              <StatBox label={t('dashboard.kpi.anomalies')} value={String(summary.anomalyCount)} accent />
              <StatBox label={t('dashboard.kpi.critical')} value={String(summary.criticalCount)} danger />
            </div>
          </div>
        </ReportSection>

        <ReportSection title={t('report.anomalyBreakdown')}>
          <div className="space-y-3">
            {breakdown.map(([type, count]) => (
              <div key={type} className="flex items-center gap-4">
                <span className="w-40 shrink-0 text-sm text-themed-fg/80">{type}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-themed-skeleton">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-700"
                    style={{ width: `${(count / Math.max(summary.anomalyCount, 1)) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-sm text-muted">{count}</span>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection title={t('report.criticalTransactions')}>
          <div className="space-y-4">
            {critical.map((tx) => (
              <div
                key={tx.id}
                className="rounded-lg border border-themed bg-themed/60 p-4 transition hover:border-accent/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-themed-fg">{tx.id}</p>
                    <p className="text-sm text-muted">{tx.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={tx.severity} size="md" />
                    <span className="font-mono text-lg font-bold text-danger">{tx.risk_score}</span>
                  </div>
                </div>
                <p className="mt-2 font-mono text-xs text-themed-fg/60">
                  {formatFCFA(tx.amount, locale)}
                </p>
                {tx.aiExplanation && (
                  <p className="mt-3 border-t border-themed pt-3 text-sm italic text-themed-fg/75">
                    {tx.aiExplanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ReportSection>

        <footer className="mt-10 border-t border-themed pt-6 text-center text-xs text-muted">
          {t('report.footer')}
        </footer>
      </GlassPanel>
    </div>
  );
}

function StatBox({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  const color = danger ? 'text-danger' : accent ? 'text-accent' : 'text-themed-fg';
  return (
    <div className="rounded-lg border border-themed bg-themed/40 px-4 py-3">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
