const USERNAME_REGEX = /^[A-Za-z0-9_-]{3,32}$/;

export const USERNAME_HINT_FR =
  'Nom choisi pour vous connecter (pas une adresse e-mail). 3 à 32 caractères : lettres, chiffres, tiret ou underscore. Ex. marie_audit';

export const USERNAME_RULES_MESSAGE =
  'Identifiant de connexion invalide. Choisissez un nom pour vous connecter (3 à 32 caractères : lettres, chiffres, tiret ou underscore). Exemple : marie_audit. Ce n\'est pas votre adresse e-mail.';

export function validateUsernameClient(username: string): string | null {
  const u = (username || '').trim();
  if (!u) return 'Identifiant de connexion requis.';
  if (u.includes('@')) return 'L\'identifiant ne doit pas contenir @ (ce n\'est pas une adresse e-mail).';
  if (u.length < 3 || u.length > 32) {
    return 'L\'identifiant doit contenir entre 3 et 32 caractères.';
  }
  if (!USERNAME_REGEX.test(u)) {
    return USERNAME_RULES_MESSAGE;
  }
  return null;
}
