import { useUiStore } from '../../store/uiStore';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useUiStore();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="rounded-lg border border-themed px-2.5 py-1.5 font-mono text-xs font-semibold uppercase text-muted transition hover:bg-themed-hover hover:text-themed-fg"
    >
      {language === 'fr' ? 'FR' : 'EN'}
    </button>
  );
}
