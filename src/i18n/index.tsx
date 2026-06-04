import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import en from './en.json';
import fr from './fr.json';
import { useUiStore } from '../store/uiStore';

type Messages = typeof fr;
type Locale = 'fr' | 'en';

const catalogs: Record<Locale, Messages> = { fr, en };

function getNested(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === 'string' ? cur : path;
}

function interpolate(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

interface I18nContextValue {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { language } = useUiStore();

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = getNested(catalogs[language] as unknown as Record<string, unknown>, key);
      return interpolate(raw, vars);
    },
    [language],
  );

  const value = useMemo(() => ({ locale: language, t }), [language, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
