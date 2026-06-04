import { NavLink, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import AssistantFab from '../ai-button/AssistantFab';
import LanguageToggle from '../shared/LanguageToggle';
import ThemeToggle from '../shared/ThemeToggle';
import { useTransactionContext } from '../../context/TransactionContext';
import { useAuthStore } from '../../store/authStore';
import { useI18n } from '../../i18n';

const NAV = [
  { to: '/', labelKey: 'nav.dashboard', icon: DashboardIcon },
  { to: '/transactions', labelKey: 'nav.transactions', icon: TableIcon },
  { to: '/report', labelKey: 'nav.report', icon: ReportIcon },
  { to: '/help', labelKey: 'nav.help', icon: HelpIcon },
] as const;

export default function AppLayout() {
  const { summary, dataSource, refreshFromApi } = useTransactionContext();
  const { user, logout } = useAuthStore();
  const { t } = useI18n();

  useEffect(() => {
    refreshFromApi();
  }, [refreshFromApi]);

  return (
    <div className="flex min-h-screen bg-themed text-themed-fg">
      <aside className="flex w-64 shrink-0 flex-col border-r border-themed bg-themed-light/90 backdrop-blur-sm">
        <div className="border-b border-themed px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/40">
              <ShieldIcon />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{t('app.name')}</h1>
              <p className="text-xs text-muted">{t('app.tagline')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/20 text-primary shadow-glow'
                    : 'text-muted hover:bg-themed-hover hover:text-themed-fg'
                }`
              }
            >
              <Icon />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-themed p-4 space-y-3">
          <div className="rounded-lg border border-themed bg-themed-panel/60 p-3">
            <p className="text-xs uppercase tracking-wider text-muted">{t('common.liveStatus')}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-primary">
              {summary.anomalyCount}
              <span className="text-sm font-normal text-muted"> {t('common.anomaliesCount')}</span>
            </p>
            <p className="mt-1 text-xs text-muted capitalize">
              {t('common.source')}: {dataSource}
            </p>
          </div>
          {user && (
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-muted">{user.email}</span>
              <button type="button" onClick={() => logout()} className="text-primary hover:underline">
                {t('auth.logout')}
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-themed bg-themed-light/50 px-8 py-4 backdrop-blur-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              {t('app.console')}
            </p>
            <p className="text-sm text-muted">
              Benford · Outliers · Duplications · Scoring
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs text-muted">{t('common.engineActive')}</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>

      <AssistantFab />
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6h18v12H3z" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
