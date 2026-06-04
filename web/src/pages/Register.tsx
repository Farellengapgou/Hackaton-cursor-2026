import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import { PasswordInput, PASSWORD_HINT_FR } from '../components/auth/PasswordInput';
import { useAuthStore } from '../store/authStore';
import { useI18n } from '../i18n';
import { validatePasswordClient } from '../utils/passwordPolicy';
import { validateUsernameClient } from '../utils/usernamePolicy';

export default function Register() {
  const { t } = useI18n();
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUsernameError('');
    setPasswordError('');
    if (!username || !password) {
      setError(t('auth.errors.required'));
      return;
    }
    const uErr = validateUsernameClient(username);
    if (uErr) {
      setUsernameError(uErr);
      return;
    }
    const pwdErr = validatePasswordClient(password);
    if (pwdErr) {
      setPasswordError(pwdErr);
      return;
    }
    if (password !== confirm) {
      setError(t('auth.errors.mismatch'));
      return;
    }
    setLoading(true);
    try {
      await register(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.errors.invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
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
              setUsernameError(validateUsernameClient(e.target.value) ?? '');
            }}
            className={`w-full rounded-lg border bg-themed px-4 py-3 text-themed-fg outline-none focus:border-primary ${
              usernameError ? 'border-danger' : 'border-themed'
            }`}
          />
          <p className="mt-1 text-xs text-muted">{t('auth.usernameHint')}</p>
          {usernameError && <p className="mt-1 text-xs text-danger">{usernameError}</p>}
        </div>
        <PasswordInput
          id="register-password"
          label={t('auth.password')}
          value={password}
          onChange={(pwd) => {
            setPassword(pwd);
            setPasswordError(validatePasswordClient(pwd) ?? '');
          }}
          autoComplete="new-password"
          hint={PASSWORD_HINT_FR}
          error={passwordError || undefined}
        />
        <PasswordInput
          id="register-confirm"
          label={t('auth.confirmPassword')}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? t('common.loading') : t('auth.signUp')}
        </button>
      </form>
      <p className="text-center text-sm text-muted">
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </AuthLayout>
  );
}
