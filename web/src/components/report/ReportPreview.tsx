import { useEffect, useMemo, useState } from 'react';
import { exportAuditPdf, type PdfOrientation } from '../../utils/exportAuditPdf';
import type { AuditSummary, Transaction } from '../../types';
import SeverityBadge from '../shared/SeverityBadge';
import GlassPanel from '../shared/GlassPanel';
import RiskGauge from '../shared/RiskGauge';
import ReportSection from './ReportSection';
import { formatFCFA, formatDateTime } from '../../utils/format';
import { useI18n } from '../../i18n';
import { postExplain } from '../../services/api';
import { getAnomalyRuleInfo } from '../../utils/anomalyLabels';

interface ReportPreviewProps {
  transactions: Transaction[];
  summary: AuditSummary;
}

export default function ReportPreview({ transactions, summary }: ReportPreviewProps) {
  const { t, locale } = useI18n();
  const [exporting, setExporting] = useState(false);
  const [orientation, setOrientation] = useState<PdfOrientation>('portrait');
  const [enrichedTx, setEnrichedTx] = useState<Transaction[]>(transactions);

  useEffect(() => {
    setEnrichedTx(transactions);
  }, [transactions]);

  const flagged = useMemo(
    () =>
      enrichedTx
        .filter((tx) => tx.anomalies.length > 0)
        .sort((a, b) => b.risk_score - a.risk_score),
    [enrichedTx],
  );

  const critical = useMemo(
    () => enrichedTx.filter((t) => t.severity === 'critique' || t.risk_score >= 70),
    [enrichedTx],
  );

  const breakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    flagged.forEach((tx) => {
      tx.anomalies.forEach((a) => {
        counts[a.rule_name] = (counts[a.rule_name] ?? 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([ruleId, count]) => ({ ...getAnomalyRuleInfo(ruleId, t), count, ruleId }));
  }, [flagged, t]);

  const verdict = useMemo(() => {
    if (summary.globalRiskScore >= 70) {
      return {
        title: t('report.verdictHighTitle'),
        text: t('report.verdictHighText'),
        tone: 'danger' as const,
      };
    }
    if (summary.globalRiskScore >= 40) {
      return {
        title: t('report.verdictMidTitle'),
        text: t('report.verdictMidText'),
        tone: 'warn' as const,
      };
    }
    return {
      title: t('report.verdictLowTitle'),
      text: t('report.verdictLowText'),
      tone: 'ok' as const,
    };
  }, [summary.globalRiskScore, t]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const withExplanations = await Promise.all(
        flagged.slice(0, 25).map(async (tx) => {
          if (tx.aiExplanation) return tx;
          try {
            const { explanation } = await postExplain(tx.id);
            return { ...tx, aiExplanation: explanation };
          } catch {
            const fallback = tx.anomalies
              .map((a) => {
                const info = getAnomalyRuleInfo(a.rule_name, t);
                return `${info.label} : ${a.reason}`;
              })
              .join(' — ');
            return { ...tx, aiExplanation: fallback || undefined };
          }
        }),
      );
      const merged = enrichedTx.map((tx) => {
        const found = withExplanations.find((e) => e.id === tx.id);
        return found ?? tx;
      });
      setEnrichedTx(merged);
      exportAuditPdf(merged, summary, orientation);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-0 sm:px-2">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-themed-fg sm:text-2xl">{t('report.title')}</h2>
          <p className="text-sm text-muted">{t('report.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as PdfOrientation)}
            className="rounded-lg border border-themed bg-themed px-3 py-2 text-sm text-themed-fg"
          >
            <option value="portrait">{t('report.pdfPortrait')}</option>
            <option value="landscape">{t('report.pdfLandscape')}</option>
          </select>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || flagged.length === 0}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
          >
            {exporting ? t('report.exporting') : t('report.export')}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-themed px-5 py-2.5 text-sm font-medium text-themed-fg"
          >
            {t('report.print')}
          </button>
        </div>
      </div>

      <GlassPanel className="p-6 sm:p-12 print:bg-white print:text-black" id="audit-report">
        <header className="mb-10 border-b border-themed pb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            {t('report.confidential')}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-themed-fg sm:text-3xl">{t('report.docTitle')}</h1>
          <p className="mt-2 text-sm text-muted">{t('report.docSubtitle')}</p>
          <p className="mt-2 font-mono text-xs text-muted">
            {t('report.generated')} {formatDateTime(new Date().toISOString(), locale)}
          </p>
        </header>

        <ReportSection title={t('report.sectionConclusion')}>
          <div
            className={`rounded-lg border p-4 ${
              verdict.tone === 'danger'
                ? 'border-danger/40 bg-danger/5'
                : verdict.tone === 'warn'
                  ? 'border-accent/40 bg-accent/5'
                  : 'border-primary/30 bg-primary/5'
            }`}
          >
            <p className="text-lg font-semibold text-themed-fg">{verdict.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-themed-fg/85">{verdict.text}</p>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-themed-fg/85">
            <li>{t('report.listAnalyzed', { total: summary.totalTransactions, anomalies: summary.anomalyCount })}</li>
            <li>{t('report.listGlobalScore', { score: summary.globalRiskScore })}</li>
            <li>{t('report.listCritical', { count: summary.criticalCount })}</li>
            <li>
              {t('report.totalAmountLabel')}{' '}
              <strong>{formatFCFA(summary.totalAmount, locale)}</strong>
            </li>
          </ul>
        </ReportSection>

        <ReportSection title={t('report.sectionHowToRead')}>
          <div className="space-y-3 text-sm leading-relaxed text-themed-fg/85">
            <p>{t('report.bodySignalsExplain')} {t('report.bodySignalsNote')}</p>
            <p>{t('report.bodyScoreExplain')}</p>
            <p>{t('report.bodyAiNote')}</p>
          </div>
        </ReportSection>

        <ReportSection title={t('report.riskOverview')}>
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-around">
            <RiskGauge score={summary.globalRiskScore} size={160} animated={false} />
            <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-3">
              <StatBox label={t('report.statsTransactions')} value={String(summary.totalTransactions)} />
              <StatBox label={t('report.statsWithSignals')} value={String(summary.anomalyCount)} accent />
              <StatBox label={t('report.statsCritical')} value={String(summary.criticalCount)} danger />
            </div>
          </div>
        </ReportSection>

        <ReportSection title={t('report.sectionSignals')}>
          <div className="space-y-4">
            {breakdown.length === 0 ? (
              <p className="text-sm text-muted">{t('report.noSignalsOnFile')}</p>
            ) : (
              breakdown.map((row) => (
                <div key={row.ruleId} className="rounded-lg border border-themed/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-themed-fg">{row.label}</p>
                    <span className="font-mono text-sm text-primary">{t('report.occurrences', { count: row.count })}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{row.description}</p>
                </div>
              ))
            )}
          </div>
        </ReportSection>

        <ReportSection title={t('report.sectionPriority')}>
          <p className="mb-4 text-sm text-muted">{t('report.sectionPriorityHint')}</p>
          <div className="space-y-5">
            {critical.length === 0 && flagged.length === 0 ? (
              <p className="text-sm text-muted">{t('report.noAnomaliesToDocument')}</p>
            ) : (
              (critical.length > 0 ? critical : flagged.slice(0, 15)).map((tx) => (
                <article
                  key={tx.id}
                  className="rounded-lg border border-themed bg-themed/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-bold text-themed-fg">{tx.id}</p>
                      <p className="text-sm text-themed-fg">{tx.description}</p>
                      <p className="mt-1 font-mono text-xs text-muted">
                        {formatDateTime(tx.date, locale)} · {formatFCFA(tx.amount, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={tx.severity} size="md" />
                      <div className="text-right">
                        <p className="text-[10px] uppercase text-muted">{t('report.scoreLabel')}</p>
                        <p className="font-mono text-xl font-bold text-danger">{tx.risk_score}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-md bg-themed-panel/80 p-3">
                    <p className="text-xs font-semibold uppercase text-muted">{t('report.detectedSignals')}</p>
                    <ul className="mt-2 space-y-2 text-sm">
                      {tx.anomalies.map((a, i) => {
                        const info = getAnomalyRuleInfo(a.rule_name, t);
                        return (
                          <li key={i}>
                            <span className="font-medium text-themed-fg">{info.label}</span>
                            <span className="text-muted"> — {a.reason}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-3 border-t border-themed pt-3">
                    <p className="text-xs font-semibold uppercase text-primary">{t('report.whatToDo')}</p>
                    <p className="mt-2 text-sm leading-relaxed text-themed-fg/90">
                      {tx.aiExplanation ??
                        (tx.risk_score >= 70
                          ? t('report.actionHigh')
                          : tx.risk_score >= 40
                            ? t('report.actionMid')
                            : t('report.actionLow'))}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </ReportSection>

        <footer className="mt-10 border-t border-themed pt-6 text-center text-xs text-muted">
          {t('report.footer')} — {t('report.footerDisclaimer')}
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
