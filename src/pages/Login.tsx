import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useI18n } from '../i18n';
import LanguageToggle from '../components/shared/LanguageToggle';
import ThemeToggle from '../components/shared/ThemeToggle';

export default function Login() {
  const { t } = useI18n();
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError(t('auth.errors.required'));
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      setError(t('auth.errors.invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-themed">
      <div className="hidden w-1/2 flex-col justify-between border-r border-themed bg-themed-panel p-12 lg:flex">
        <div>
          <h1 className="text-3xl font-bold text-themed-fg">{t('app.name')}</h1>
          <p className="mt-2 text-muted">{t('app.tagline')}</p>
        </div>
        <div className="space-y-4">
          <div className="h-1 w-24 rounded bg-primary" />
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Plateforme d&apos;audit forensic · Benford · Outliers · Duplications · Scoring de risque
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="absolute right-6 top-6 flex gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-themed-fg">{t('auth.loginTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('auth.loginSubtitle')}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase text-muted">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-themed bg-themed-panel px-4 py-3 text-themed-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase text-muted">{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-themed bg-themed-panel px-4 py-3 text-themed-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('auth.signIn')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
