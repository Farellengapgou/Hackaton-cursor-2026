import { useEffect, useState } from 'react';
import { getRiskColor, getRiskLevel } from '../../styles/theme';
import { useI18n } from '../../i18n';

interface RiskGaugeProps {
  score: number;
  size?: number;
  label?: string;
  animated?: boolean;
}

export default function RiskGauge({
  score,
  size = 180,
  label,
  animated = true,
}: RiskGaugeProps) {
  const { t } = useI18n();
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;
  const color = getRiskColor(displayScore);
  const level = getRiskLevel(displayScore);

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }
    let frame: number;
    const start = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const elapsed = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setDisplayScore(Math.round(score * eased));
      if (elapsed < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score, animated]);

  const levelLabel =
    level === 'critical'
      ? t('risk.critical')
      : level === 'elevated'
        ? t('risk.elevated')
        : t('risk.low');

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--gauge-track)"
            strokeWidth="10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-300"
            style={{ filter: `drop-shadow(0 0 8px ${color}55)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-bold tabular-nums tracking-tight" style={{ color }}>
            {displayScore}
          </span>
          <span className="text-xs uppercase tracking-widest text-muted">/ 100</span>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-themed-fg">{label ?? t('dashboard.globalRisk')}</p>
      <span
        className="mt-1 rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide"
        style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
      >
        {levelLabel}
      </span>
    </div>
  );
}
