import GlassPanel from '../shared/GlassPanel';
import { useI18n } from '../../i18n';

interface QuickInsightsProps {
  insights: string[];
}

export default function QuickInsights({ insights }: QuickInsightsProps) {
  const { t } = useI18n();

  return (
    <GlassPanel className="p-5">
      <h3 className="mb-4 text-sm font-semibold text-themed-fg">{t('dashboard.insights')}</h3>
      <ul className="space-y-3">
        {insights.map((line, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-themed-fg/85">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {line}
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
