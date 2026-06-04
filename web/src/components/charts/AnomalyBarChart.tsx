import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import GlassPanel from '../shared/GlassPanel';
import { useUiStore } from '../../store/uiStore';
import { chartColors, chartColorsLight } from '../../styles/theme';
import { useI18n } from '../../i18n';
import { getAnomalyRuleInfo, mapDistributionForChart } from '../../utils/anomalyLabels';

interface Props {
  data: { name: string; count: number }[];
  onBarClick?: (ruleName: string) => void;
}

function AnomalyTooltip({
  active,
  payload,
  theme,
}: {
  active?: boolean;
  payload?: { payload?: { ruleId: string; label: string; description: string; count: number } }[];
  theme: 'dark' | 'light';
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  const info = getAnomalyRuleInfo(row.ruleId);
  const bg = theme === 'dark' ? '#1a323c' : '#fff';
  return (
    <div
      className="max-w-xs rounded-lg border px-3 py-2.5 text-left shadow-lg"
      style={{ background: bg, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,32,39,0.12)' }}
    >
      <p className="text-sm font-semibold text-[#0F2027] dark:text-[#e8f0f3]">{info.label}</p>
      <p className="mt-1 font-mono text-xs text-[#1D9E75]">
        {row.count} occurrence{row.count > 1 ? 's' : ''}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[#6b7280] dark:text-[#8ba3ad]">
        {info.description}
      </p>
      <p className="mt-2 text-[10px] text-[#9ca3af]">Cliquez pour voir les transactions concernées</p>
    </div>
  );
}

export default function AnomalyBarChart({ data, onBarClick }: Props) {
  const { theme } = useUiStore();
  const { t } = useI18n();
  const colors = theme === 'dark' ? chartColors : chartColorsLight;
  const chartData = mapDistributionForChart(data);
  const chartHeight = Math.max(240, chartData.length * 44);

  return (
    <GlassPanel className="p-5">
      <h3 className="mb-1 text-sm font-semibold text-themed-fg">{t('dashboard.charts.anomalies')}</h3>
      <p className="mb-4 text-xs text-muted">
        Répartition des signaux détectés — survolez une barre pour l&apos;explication
      </p>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'Nombre de signaux',
              position: 'insideBottom',
              offset: -4,
              fill: colors.muted,
              fontSize: 11,
            }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<AnomalyTooltip theme={theme === 'dark' ? 'dark' : 'light'} />}
            cursor={{ fill: theme === 'dark' ? 'rgba(29,158,117,0.12)' : 'rgba(29,158,117,0.08)' }}
          />
          <Bar
            dataKey="count"
            fill={colors.accent}
            radius={[0, 4, 4, 0]}
            maxBarSize={28}
            cursor={onBarClick ? 'pointer' : 'default'}
            onClick={(_bar, index) => {
              const row = chartData[index];
              if (row?.ruleId && onBarClick) onBarClick(row.ruleId);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </GlassPanel>
  );
}
