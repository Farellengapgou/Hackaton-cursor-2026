import type { Language } from '../store/uiStore';

export function formatFCFA(amount: number, locale: Language = 'fr'): string {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string, locale: Language = 'fr'): string {
  return new Date(iso).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string, locale: Language = 'fr'): string {
  return new Date(iso).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US');
}
