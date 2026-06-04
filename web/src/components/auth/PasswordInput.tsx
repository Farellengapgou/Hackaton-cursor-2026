import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useI18n } from '../../i18n'

type Props = {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  hint?: string
  error?: string
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  hint,
  error,
}: Props) {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`w-full rounded-lg border bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary/30 ${
            error ? 'border-red-400' : 'border-slate-200 focus:border-primary'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && !error && (
        <p className="text-xs leading-relaxed text-slate-500">{hint}</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export const PASSWORD_HINT_FR =
  '8 à 64 caractères, au moins une majuscule, une minuscule et un chiffre. Caractères autorisés : lettres, chiffres, . _ - @'
