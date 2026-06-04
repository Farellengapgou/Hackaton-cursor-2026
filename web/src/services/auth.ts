import { apiUrl } from '../config/apiBase';
import type { AuthResponse, User } from '../types';

const API_BASE = apiUrl('/api/auth');

function parseError(detail: unknown): string {
  if (typeof detail === 'string') {
    if (detail === 'invalid_credentials') return 'Identifiant ou mot de passe incorrect.';
    if (detail === 'username_already_exists') {
      return 'Cet identifiant est déjà utilisé. Choisissez-en un autre.';
    }
    return detail;
  }
  if (typeof detail === 'object' && detail !== null && 'message' in detail) {
    return String((detail as { message: string }).message);
  }
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === 'object' && d && 'msg' in d ? String(d.msg) : '')).join(', ');
  }
  return 'Une erreur est survenue.';
}

async function request<T>(path: string, options?: RequestInit, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = parseError(body.detail ?? body.message ?? message);
    } catch {
      message = await res.text().catch(() => message);
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function toUser(username: string, userId: string): User {
  return {
    id: userId,
    email: username,
    name: username,
  };
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const data = await request<{
    access_token: string;
    user_id: string;
    username: string;
  }>('/login', {
    method: 'POST',
    body: JSON.stringify({ username: username.trim(), password }),
  });
  return {
    token: data.access_token,
    user: toUser(data.username, data.user_id),
  };
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  const u = username.trim();
  await request<{ user_id: string; username: string; message: string }>('/register', {
    method: 'POST',
    body: JSON.stringify({ username: u, password }),
  });
  return login(u, password);
}

export async function fetchMe(token: string): Promise<User> {
  const data = await request<{ user_id: string; username: string }>('/me', {}, token);
  return toUser(data.username, data.user_id);
}

export async function logout(token: string): Promise<void> {
  await request<{ status: string }>('/logout', { method: 'POST' }, token);
}
