import AnomalyBarChart from '../components/charts/AnomalyBarChart';
import RiskDistributionChart from '../components/charts/RiskDistributionChart';
import SeverityPieChart from '../components/charts/SeverityPieChart';
import TransactionLineChart from '../components/charts/TransactionLineChart';
import CsvUpload from '../components/dashboard/CsvUpload';
import PreviewTable from '../components/dashboard/PreviewTable';
import QuickInsights from '../components/dashboard/QuickInsights';
import SummaryCards from '../components/dashboard/SummaryCards';
import GlassPanel from '../components/shared/GlassPanel';
import RiskGauge from '../components/shared/RiskGauge';
import { useTransactions } from '../hooks/useTransactions';
import { useI18n } from '../i18n';

export default function Dashboard() {
  const { transactions, summary, stats, insights, uploadLoading } = useTransactions();
  const { t } = useI18n();

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-themed-fg">{t('dashboard.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <CsvUpload />
        <GlassPanel className="flex items-center justify-center p-6" glow="primary">
          <RiskGauge score={stats.global_risk_score} key={stats.global_risk_score} />
        </GlassPanel>
      </div>

      {uploadLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-themed-skeleton" />
          ))}
        </div>
      ) : (
        <SummaryCards summary={summary} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <TransactionLineChart data={stats.transactions_over_time} />
        <AnomalyBarChart data={stats.anomaly_distribution} />
        <SeverityPieChart data={stats.severity_distribution} />
        <RiskDistributionChart data={stats.risk_score_distribution} />
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <PreviewTable transactions={transactions} />
        <QuickInsights insights={insights} />
      </div>
    </div>
  );
}
