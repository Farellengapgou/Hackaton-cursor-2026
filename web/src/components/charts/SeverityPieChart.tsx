import { Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import GlassPanel from '../shared/GlassPanel';
import { useUiStore } from '../../store/uiStore';
import { chartColors, chartColorsLight } from '../../styles/theme';
import { useI18n } from '../../i18n';
import type { Severity } from '../../types';

interface Props {
  data: { severity: Severity; count: number }[];
}

const SEV_COLORS: Record<Severity, string> = {
  critique: '#E74C3C',
  suspect: '#F5A623',
  a_verifier: '#1D9E75',
};

export default function SeverityPieChart({ data }: Props) {
  const { theme } = useUiStore();
  const { t } = useI18n();
  const navigate = useNavigate();
  const colors = theme === 'dark' ? chartColors : chartColorsLight;

  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      name: t(`severity.${d.severity}`),
      value: d.count,
      severity: d.severity,
    }));

  return (
    <GlassPanel className="p-5">
      <h3 className="mb-1 text-sm font-semibold text-themed-fg">{t('dashboard.charts.severity')}</h3>
      <p className="mb-4 text-xs text-muted">{t('charts.clickSeverity')}</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            cursor="pointer"
            onClick={(_, index) => {
              const sev = chartData[index]?.severity;
              if (sev) {
                navigate(`/transactions?flagged=1&severity=${sev}&sort=severity&order=desc`);
              }
            }}
          >
            {chartData.map((entry) => (
              <Cell key={entry.severity} fill={SEV_COLORS[entry.severity]} />
            ))}
            <Label
              value={t('charts.severityDistribution')}
              position="center"
              fill={colors.muted}
              fontSize={10}
            />
          </Pie>
          <Tooltip
            formatter={(value: number, _n, item) => [
              `${value} transaction(s)`,
              (item as { payload?: { name: string } }).payload?.name ?? '',
            ]}
            contentStyle={{
              background: theme === 'dark' ? '#1a323c' : '#fff',
              border: `1px solid ${colors.grid}`,
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </GlassPanel>
  );
}
