import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'dark' | 'light';
export type Language = 'fr' | 'en';

const THEME_KEY = 'finaudit_theme';
const LANG_KEY = 'finaudit_lang';

interface UiStoreValue {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const UiContext = createContext<UiStoreValue | null>(null);

function readTheme(): Theme {
  const v = localStorage.getItem(THEME_KEY);
  return v === 'light' ? 'light' : 'dark';
}

function readLanguage(): Language {
  const v = localStorage.getItem(LANG_KEY);
  return v === 'en' ? 'en' : 'fr';
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [language, setLanguageState] = useState<Language>(readLanguage);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, language);
  }, [language]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    [],
  );
  const setLanguage = useCallback((l: Language) => setLanguageState(l), []);
  const toggleLanguage = useCallback(
    () => setLanguageState((prev) => (prev === 'fr' ? 'en' : 'fr')),
    [],
  );

  const value = useMemo(
    () => ({ theme, language, setTheme, toggleTheme, setLanguage, toggleLanguage }),
    [theme, language, setTheme, toggleTheme, setLanguage, toggleLanguage],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUiStore() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUiStore must be used within UiProvider');
  return ctx;
}
