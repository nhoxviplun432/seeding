import { getToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export type UserRole = "super_admin" | "admin" | "agency" | "staff" | "member";
export type UserStatus = "active" | "inactive";

export interface UserItem {
  id: number;
  fullname: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  parent_id: number | null;
  created_at: string | null;
}

export interface UserListResponse {
  items: UserItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateUserPayload {
  fullname: string;
  email: string;
  password: string;
  role: UserRole;
  is_active: boolean;
  parent_id?: number | null;
}

export interface UpdateUserPayload {
  fullname?: string;
  email?: string;
  role?: UserRole;
  is_active?: boolean;
  parent_id?: number | null;
  password?: string;
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
    const msg =
      body?.detail ??
      body?.message ??
      (body?.errors ? Object.values(body.errors).flat().join(" ") : null) ??
      `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const usersAPI = {
  list: (params: {
    page?: number;
    page_size?: number;
    search?: string;
    role?: UserRole | "all";
    is_active?: boolean | "all";
  }): Promise<UserListResponse> => {
    const q = new URLSearchParams();
    if (params.page)                              q.set("page",      String(params.page));
    if (params.page_size)                         q.set("page_size", String(params.page_size));
    if (params.search)                            q.set("search",    params.search);
    if (params.role && params.role !== "all")     q.set("role",      params.role);
    if (params.is_active !== undefined && params.is_active !== "all")
                                                  q.set("is_active", String(params.is_active));
    return apiFetch<UserListResponse>(`/users?${q}`);
  },

  get: (id: number): Promise<UserItem> =>
    apiFetch<UserItem>(`/users/${id}`),

  create: (payload: CreateUserPayload): Promise<UserItem> =>
    apiFetch<UserItem>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: number, payload: UpdateUserPayload): Promise<UserItem> =>
    apiFetch<UserItem>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: number): Promise<void> =>
    apiFetch<void>(`/users/${id}`, { method: "DELETE" }),
};
