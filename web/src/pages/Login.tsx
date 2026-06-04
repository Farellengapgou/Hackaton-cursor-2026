import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import { PasswordInput } from '../components/auth/PasswordInput';
import { useAuthStore } from '../store/authStore';
import { useI18n } from '../i18n';
import { validateUsernameClient } from '../utils/usernamePolicy';

export default function Login() {
  const { t } = useI18n();
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUsernameError('');
    if (!username || !password) {
      setError(t('auth.errors.required'));
      return;
    }
    const uErr = validateUsernameClient(username);
    if (uErr) {
      setUsernameError(uErr);
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.errors.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase text-muted">
            {t('auth.username')}
          </label>
          <input
            type="text"
            autoComplete="username"
            placeholder={t('auth.usernamePlaceholder')}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameError('');
            }}
            className={`w-full rounded-lg border bg-themed px-4 py-3 text-themed-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 ${
              usernameError ? 'border-danger' : 'border-themed'
            }`}
          />
          <p className="mt-1 text-xs text-muted">{t('auth.usernameHint')}</p>
          {usernameError && <p className="mt-1 text-xs text-danger">{usernameError}</p>}
        </div>
        <PasswordInput
          id="login-password"
          label={t('auth.password')}
          value={password}
          onChange={setPassword}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? t('common.loading') : t('auth.signIn')}
        </button>
      </form>
      <p className="text-center text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          {t('auth.register')}
        </Link>
      </p>
    </AuthLayout>
  );
}
