import type { Language } from '../store/uiStore';

export function formatFCFA(amount: number, locale: Language = 'fr'): string {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Affichage compact pour cellules de tableau (grands montants). */
export function formatFCFACompact(amount: number, locale: Language = 'fr'): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const m = amount / 1_000_000;
    const s = Number.isInteger(m) ? String(m) : m.toFixed(1).replace('.', locale === 'fr' ? ',' : '.');
    return locale === 'fr' ? `${s}\u00a0M\u00a0FCFA` : `${s}M XAF`;
  }
  if (abs >= 100_000) {
    const k = amount / 1_000;
    const s = Number.isInteger(k) ? String(k) : k.toFixed(1).replace('.', locale === 'fr' ? ',' : '.');
    return locale === 'fr' ? `${s}\u00a0k\u00a0FCFA` : `${s}k XAF`;
  }
  return formatFCFA(amount, locale);
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
