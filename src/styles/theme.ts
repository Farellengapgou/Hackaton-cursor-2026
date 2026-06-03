import type { Severity } from '../types';

export const colors = {
  primary: '#1D9E75',
  background: '#0F2027',
  backgroundLight: '#F7F7F2',
  accent: '#F5A623',
  danger: '#E74C3C',
  safe: '#1D9E75',
  suspicious: '#F5A623',
  critical: '#E74C3C',
} as const;

export function getSeverityColor(severity: Severity): string {
  if (severity === 'critique') return colors.critical;
  if (severity === 'suspect') return colors.suspicious;
  return colors.primary;
}

export function getRiskColor(score: number): string {
  if (score >= 70) return colors.critical;
  if (score >= 40) return colors.suspicious;
  return colors.safe;
}

export function getRiskLevel(score: number): 'critical' | 'elevated' | 'low' {
  if (score >= 70) return 'critical';
  if (score >= 40) return 'elevated';
  return 'low';
}

export function getSeverityTailwind(severity: Severity): string {
  if (severity === 'critique') return 'text-danger';
  if (severity === 'suspect') return 'text-accent';
  return 'text-primary';
}

export function getSeverityBgTailwind(severity: Severity): string {
  if (severity === 'critique') return 'bg-danger/15 border-danger/40';
  if (severity === 'suspect') return 'bg-accent/15 border-accent/40';
  return 'bg-primary/15 border-primary/40';
}

export function getRiskTailwind(score: number): string {
  if (score >= 70) return 'text-danger';
  if (score >= 40) return 'text-accent';
  return 'text-primary';
}

export function getRiskBgTailwind(score: number): string {
  if (score >= 70) return 'bg-danger/15 border-danger/40';
  if (score >= 40) return 'bg-accent/15 border-accent/40';
  return 'bg-primary/15 border-primary/40';
}

export const chartColors = {
  primary: '#1D9E75',
  accent: '#F5A623',
  danger: '#E74C3C',
  muted: '#8ba3ad',
  grid: 'rgba(255,255,255,0.06)',
};

export const chartColorsLight = {
  primary: '#1D9E75',
  accent: '#F5A623',
  danger: '#E74C3C',
  muted: '#6b7280',
  grid: 'rgba(0,0,0,0.06)',
};
