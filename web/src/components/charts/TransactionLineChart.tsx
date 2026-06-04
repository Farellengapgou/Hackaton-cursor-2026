import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
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
  data: { date: string; count: number }[];
}

export default function TransactionLineChart({ data }: Props) {
  const { theme } = useUiStore();
  const { t } = useI18n();
  const colors = theme === 'dark' ? chartColors : chartColorsLight;

  return (
    <GlassPanel className="p-5">
      <h3 className="mb-4 text-sm font-semibold text-themed-fg">{t('dashboard.charts.timeline')}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: colors.muted, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v.slice(5)}
          >
            <Label value={t('charts.dateAxis')} offset={-8} position="insideBottom" fill={colors.muted} fontSize={11} />
          </XAxis>
          <YAxis tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false}>
            <Label
              value={t('charts.transactionCount')}
              angle={-90}
              position="insideLeft"
              fill={colors.muted}
              fontSize={11}
              style={{ textAnchor: 'middle' }}
            />
          </YAxis>
          <Tooltip
            formatter={(value: number) => [`${value}`, t('charts.transactions')]}
            labelFormatter={(label) => `Date : ${label}`}
            contentStyle={{
              background: theme === 'dark' ? '#1a323c' : '#fff',
              border: `1px solid ${colors.grid}`,
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            name={t('charts.transactions')}
            stroke={colors.primary}
            strokeWidth={2}
            dot={{ fill: colors.primary, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </GlassPanel>
  );
}
