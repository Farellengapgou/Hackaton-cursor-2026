export const PASSWORD_RULES_MESSAGE =
  'Le mot de passe doit contenir entre 8 et 64 caractères, au moins une majuscule (A-Z), une minuscule (a-z) et un chiffre (0-9). Caractères autorisés : lettres, chiffres et . _ - @'

export function validatePasswordClient(password: string): string | null {
  if (!password || password.length < 8 || password.length > 64) {
    return PASSWORD_RULES_MESSAGE
  }
  if (!/[A-Z]/.test(password)) return PASSWORD_RULES_MESSAGE
  if (!/[a-z]/.test(password)) return PASSWORD_RULES_MESSAGE
  if (!/\d/.test(password)) return PASSWORD_RULES_MESSAGE
  if (!/^[A-Za-z0-9._@-]+$/.test(password)) return PASSWORD_RULES_MESSAGE
  return null
}

export function parseApiError(detail: unknown): string {
  if (!detail) return 'Une erreur est survenue.'
  if (typeof detail === 'string') return detail
  if (typeof detail === 'object' && detail !== null && 'message' in detail) {
    return String((detail as { message: string }).message)
  }
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === 'object' && d?.msg ? d.msg : String(d))).join(' ')
  }
  return 'Une erreur est survenue.'
}
