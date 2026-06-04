import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const colors = theme === 'dark' ? chartColors : chartColorsLight;

  const colored = data.map((d, i) => ({
    ...d,
    fill: i === 2 ? colors.danger : i === 1 ? colors.accent : colors.primary,
  }));

  return (
    <GlassPanel className="p-5">
      <h3 className="mb-4 text-sm font-semibold text-themed-fg">{t('dashboard.charts.riskScores')}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={colored} margin={{ top: 8, right: 12, left: 8, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          >
            <Label value="Tranche de score" offset={-8} position="insideBottom" fill={colors.muted} fontSize={11} />
          </XAxis>
          <YAxis tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false}>
            <Label
              value="Nombre de transactions"
              angle={-90}
              position="insideLeft"
              fill={colors.muted}
              fontSize={11}
              style={{ textAnchor: 'middle' }}
            />
          </YAxis>
          <Tooltip
            formatter={(value: number) => [`${value}`, 'Transactions']}
            labelFormatter={(label) => `Score ${label}`}
            contentStyle={{
              background: theme === 'dark' ? '#1a323c' : '#fff',
              border: `1px solid ${colors.grid}`,
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            maxBarSize={56}
            cursor="pointer"
            onClick={(bar) => {
              const range = (bar as { range?: string }).range;
              if (range) navigate(`/transactions?riskRange=${encodeURIComponent(range)}`);
            }}
          >
            {colored.map((entry) => (
              <Cell key={entry.range} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </GlassPanel>
  );
}
