import type { ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  glow?: 'primary' | 'accent';
}

export default function GlassPanel({ children, className = '', glow }: GlassPanelProps) {
  const glowClass =
    glow === 'primary' ? 'shadow-glow' : glow === 'accent' ? 'shadow-glow-accent' : '';
  return (
    <div
      className={`rounded-xl border border-themed bg-themed-panel/80 backdrop-blur-sm shadow-panel ${glowClass} ${className}`}
    >
      {children}
    </div>
  );
}
