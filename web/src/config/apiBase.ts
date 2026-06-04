/** Origine API : vide = même domaine (nginx/Docker). Sinon URL Render (ex. https://finaudit-api.onrender.com). */
const origin = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return origin ? `${origin}${p}` : p;
}
