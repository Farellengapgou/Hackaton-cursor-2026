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

interface Props {
  data: { name: string; count: number }[];
}

export default function AnomalyBarChart({ data }: Props) {
  const { theme } = useUiStore();
  const { t } = useI18n();
  const colors = theme === 'dark' ? chartColors : chartColorsLight;

  return (
    <GlassPanel className="p-5">
      <h3 className="mb-4 text-sm font-semibold text-themed-fg">{t('dashboard.charts.anomalies')}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="name"
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
          <Bar dataKey="count" fill={colors.accent} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </GlassPanel>
  );
}
