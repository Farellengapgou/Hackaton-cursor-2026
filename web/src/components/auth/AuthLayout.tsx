import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import LanguageToggle from '../shared/LanguageToggle';
import ThemeToggle from '../shared/ThemeToggle';
import { useI18n } from '../../i18n';
import AuthBackground from './AuthBackground';

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthLayout({ title, subtitle, children, footer }: Props) {
  const { t } = useI18n();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <AuthBackground />

      <div className="absolute right-4 top-4 z-20 flex gap-2 sm:right-6 sm:top-6">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <Link
        to="/"
        className="relative z-10 mb-8 text-center transition hover:opacity-80"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">FinAudit</p>
        <p className="mt-1 text-sm text-muted">{t('app.tagline')}</p>
      </Link>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-themed bg-themed-panel/90 p-8 shadow-panel backdrop-blur-sm sm:p-10">
        <h2 className="text-2xl font-bold text-themed-fg">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}
