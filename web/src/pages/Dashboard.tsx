import { useNavigate } from 'react-router-dom';
import AnomalyBarChart from '../components/charts/AnomalyBarChart';
import RiskDistributionChart from '../components/charts/RiskDistributionChart';
import SeverityPieChart from '../components/charts/SeverityPieChart';
import TransactionLineChart from '../components/charts/TransactionLineChart';
import CsvUpload from '../components/dashboard/CsvUpload';
import QuickInsights from '../components/dashboard/QuickInsights';
import SummaryCards from '../components/dashboard/SummaryCards';
import GlassPanel from '../components/shared/GlassPanel';
import RiskGauge from '../components/shared/RiskGauge';
import { useTransactions } from '../hooks/useTransactions';
import { useI18n } from '../i18n';
import { formatDateTime } from '../utils/format';

export default function Dashboard() {
  const {
    transactions,
    summary,
    stats,
    insights,
    uploadLoading,
    uploadMeta,
    hasAnalyzed,
    loadDemoData,
    setAnomalyFilter,
  } = useTransactions();
  const { t, locale } = useI18n();
  const navigate = useNavigate();

  const viewFlaggedAnomalies = () => {
    navigate('/transactions?flagged=1&sort=severity&order=desc');
  };

  const onAnomalyDrill = (ruleName: string) => {
    setAnomalyFilter(ruleName);
    navigate(
      `/transactions?flagged=1&rule=${encodeURIComponent(ruleName)}&sort=severity&order=desc`,
    );
  };

  return (
    <div className="animate-fade-in space-y-6 md:space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-themed-fg sm:text-2xl">
          {t('dashboard.title')}
        </h2>
        <p className="mt-1 text-sm text-muted">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px] xl:grid-cols-[1fr_280px]">
        <CsvUpload />
        <GlassPanel className="flex items-center justify-center p-4 sm:p-6" glow="primary">
          <RiskGauge score={stats.global_risk_score} key={stats.global_risk_score} />
        </GlassPanel>
      </div>

      {!hasAnalyzed && !uploadLoading && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-themed bg-themed-panel/50 px-4 py-3 text-sm">
          <span className="text-muted">{t('dashboard.noFile')}</span>
          <button
            type="button"
            onClick={loadDemoData}
            className="rounded-md border border-primary/40 px-4 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
          >
            {t('dashboard.loadDemo')}
          </button>
        </div>
      )}

      {uploadMeta && hasAnalyzed && (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-sm font-medium text-themed-fg">
              {t('dashboard.fileImported')}{' '}
              <span className="font-mono">{uploadMeta.fileName}</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              {t('dashboard.rowsAnalyzed', { count: uploadMeta.rowCount })} —{' '}
              {formatDateTime(uploadMeta.analyzedAt, locale)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/transactions')}
              className="rounded-lg border border-themed bg-themed-panel px-4 py-2 text-xs font-semibold text-themed-fg transition hover:border-primary/50 hover:text-primary"
            >
              {t('dashboard.viewTransactions')}
            </button>
          </div>
        </div>
      )}

      {uploadLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-themed-skeleton" />
          ))}
        </div>
      ) : (
        hasAnalyzed && (
          <SummaryCards summary={summary} onAnomaliesClick={viewFlaggedAnomalies} />
        )
      )}

      {hasAnalyzed && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <TransactionLineChart data={stats.transactions_over_time} />
            <AnomalyBarChart data={stats.anomaly_distribution} onBarClick={onAnomalyDrill} />
            <SeverityPieChart data={stats.severity_distribution} />
            <RiskDistributionChart data={stats.risk_score_distribution} />
          </div>

          <QuickInsights insights={insights} />

          <div className="rounded-xl border border-themed bg-themed-panel/60 p-6 text-center sm:p-8">
            <h3 className="text-lg font-semibold text-themed-fg">{t('dashboard.reportCardTitle')}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t('dashboard.reportCardDesc')}</p>
            <button
              type="button"
              onClick={() => navigate('/report')}
              className="mt-6 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark hover:shadow-glow"
            >
              {t('dashboard.generateReport')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
