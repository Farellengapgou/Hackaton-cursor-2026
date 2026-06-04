import type { Severity } from '../../types';
import { getSeverityBgTailwind, getSeverityTailwind } from '../../styles/theme';
import { useI18n } from '../../i18n';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
}

export default function SeverityBadge({ severity, size = 'sm' }: SeverityBadgeProps) {
  const { t } = useI18n();
  const pad = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10px]';

  return (
    <span
      className={`inline-flex items-center rounded-md border font-semibold uppercase tracking-wide ${pad} ${getSeverityBgTailwind(severity)} ${getSeverityTailwind(severity)}`}
    >
      {t(`severity.${severity}`)}
    </span>
  );
}
