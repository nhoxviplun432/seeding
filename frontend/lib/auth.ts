const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export interface AuthUser {
  id: number;
  fullname: string;
  email: string;
  avatar_url?: string | null;
}

const TOKEN_KEY = "auth_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      body?.message ??
      (body?.errors ? Object.values(body.errors).flat().join(" ") : null) ??
      `HTTP ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function register(
  fullname: string,
  email: string,
  password: string,
  password_confirmation: string
): Promise<AuthUser> {
  const data = await apiFetch<{ user: AuthUser; token: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ fullname, email, password, password_confirmation }),
  });
  setToken(data.token);
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<{ user: AuthUser; token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
  clearToken();
}

export async function getMe(): Promise<AuthUser | null> {
  if (!getToken()) return null;
  return apiFetch<AuthUser>("/auth/me").catch(() => null);
}

export async function updateProfile(fullname: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify({ fullname }),
  });
}

export async function updateAvatar(file: File): Promise<AuthUser> {
  const token = getToken();
  const form = new FormData();
  form.append("avatar", file);
  const res = await fetch(`${API_BASE}/auth/avatar`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      body?.message ??
      (body?.errors ? Object.values(body.errors).flat().join(" ") : null) ??
      `HTTP ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<AuthUser>;
}

export async function resetPassword(
  current_password: string,
  password: string,
  password_confirmation: string
): Promise<void> {
  await apiFetch("/auth/reset-password", {
    method: "PUT",
    body: JSON.stringify({ current_password, password, password_confirmation }),
  });
}
