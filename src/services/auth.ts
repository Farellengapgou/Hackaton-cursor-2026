import type { AuthResponse, User } from '../types';

const API_BASE = '/api';
const DEMO_USERS_KEY = 'finaudit_demo_users';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

function loadDemoUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(DEMO_USERS_KEY) ?? '[]') as StoredUser[];
  } catch {
    return [];
  }
}

function saveDemoUsers(users: StoredUser[]) {
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
}

function demoToken(email: string) {
  return `demo.${btoa(email)}.${Date.now()}`;
}

function demoAuth(email: string, password: string, name?: string): AuthResponse {
  const users = loadDemoUsers();
  let user = users.find((u) => u.email === email);

  if (name) {
    if (user) throw new Error('Email already registered');
    user = { id: `usr-${Date.now()}`, name, email, password };
    users.push(user);
    saveDemoUsers(users);
  } else {
    if (!user || user.password !== password) throw new Error('Invalid credentials');
  }

  return {
    token: demoToken(email),
    user: { id: user!.id, email: user!.email, name: user!.name },
  };
}

async function request<T>(path: string, options?: RequestInit, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    return await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return demoAuth(email, password);
  }
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    return await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  } catch {
    return demoAuth(email, password, name);
  }
}

export async function fetchMe(token: string): Promise<User> {
  if (token.startsWith('demo.')) {
    const email = atob(token.split('.')[1] ?? '');
    const user = loadDemoUsers().find((u) => u.email === email);
    if (!user) throw new Error('Session expired');
    return { id: user.id, email: user.email, name: user.name };
  }
  return request<User>('/auth/me', {}, token);
}

export async function logout(token: string): Promise<void> {
  if (token.startsWith('demo.')) return;
  await request<{ ok: boolean }>('/auth/logout', { method: 'POST' }, token);
}
