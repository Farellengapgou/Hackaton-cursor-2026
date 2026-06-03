import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import GlassPanel from '../shared/GlassPanel';
import { useUiStore } from '../../store/uiStore';
import { chartColors, chartColorsLight } from '../../styles/theme';
import { useI18n } from '../../i18n';

interface Props {
  data: { range: string; count: number }[];
}

export default function RiskDistributionChart({ data }: Props) {
  const { theme } = useUiStore();
  const { t } = useI18n();
  const colors = theme === 'dark' ? chartColors : chartColorsLight;

  const colored = data.map((d, i) => ({
    ...d,
    fill: i === 2 ? colors.danger : i === 1 ? colors.accent : colors.primary,
  }));

  return (
    <GlassPanel className="p-5">
      <h3 className="mb-4 text-sm font-semibold text-themed-fg">{t('dashboard.charts.riskScores')}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={colored} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: theme === 'dark' ? '#1a323c' : '#fff',
              border: `1px solid ${colors.grid}`,
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {colored.map((entry) => (
              <Cell key={entry.range} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </GlassPanel>
  );
}
