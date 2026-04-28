"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  usersAPI,
  type UserItem,
  type UserRole,
  type CreateUserPayload,
  type UpdateUserPayload,
} from "@/lib/users";

// ── Constants ──────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const ROLE_META: Record<UserRole, { label: string; cls: string }> = {
  super_admin: { label: "Super Admin", cls: "bg-rose-500/20    text-rose-300    border-rose-500/30"    },
  admin:       { label: "Admin",       cls: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30" },
  agency:      { label: "Agency",      cls: "bg-indigo-500/20  text-indigo-300  border-indigo-500/30"  },
  staff:       { label: "Staff",       cls: "bg-sky-500/20     text-sky-300     border-sky-500/30"     },
  member:      { label: "Member",      cls: "bg-slate-500/20   text-slate-300   border-slate-500/30"   },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

// ── Small UI atoms ─────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: UserRole }) {
  const m = ROLE_META[role] ?? ROLE_META.member;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-slate-500"}`} />
      <span className={`text-xs ${active ? "text-emerald-400" : "text-slate-500"}`}>
        {active ? "Hoạt động" : "Dừng"}
      </span>
    </span>
  );
}

function Spinner({ sm }: { sm?: boolean }) {
  return (
    <svg className={`animate-spin ${sm ? "h-3.5 w-3.5" : "h-4 w-4"}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
    </svg>
  );
}

function fieldCls(err: boolean) {
  return [
    "w-full rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-white",
    "placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-colors",
    err ? "border-red-500/60 focus:ring-red-500/40" : "border-white/10 focus:ring-fuchsia-500/50",
  ].join(" ");
}

// ── Modal shell ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Add / Edit form ────────────────────────────────────────────────────────────
interface FormData {
  fullname: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  password: string;
  confirmPassword: string;
}

function UserFormModal({ user, onClose, onDone }: {
  user: UserItem | null;
  onClose: () => void;
  onDone: (u: UserItem) => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState<FormData>({
    fullname:        user?.fullname  ?? "",
    email:           user?.email    ?? "",
    role:            user?.role     ?? "member",
    is_active:       user?.is_active ?? true,
    password:        "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [showPw, setShowPw]   = useState(false);
  const [showCp, setShowCp]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [apiErr, setApiErr]   = useState<string | null>(null);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (touched.fullname && !form.fullname.trim())
      e.fullname = "Họ tên không được trống.";
    if (touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email không hợp lệ.";
    if (!isEdit || form.password) {
      if (touched.password && form.password.length < 6)
        e.password = "Mật khẩu ít nhất 6 ký tự.";
      if (touched.confirmPassword && form.confirmPassword !== form.password)
        e.confirmPassword = "Mật khẩu không khớp.";
    }
    return e;
  }, [form, touched, isEdit]);

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }
  function touch(k: keyof FormData) {
    setTouched(p => ({ ...p, [k]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ fullname: true, email: true, password: true, confirmPassword: true });
    setApiErr(null);

    if (!form.fullname.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return;
    if (!isEdit && form.password.length < 6) return;
    if ((!isEdit || form.password) && form.confirmPassword !== form.password) return;

    setSaving(true);
    try {
      let result: UserItem;
      if (isEdit) {
        const payload: UpdateUserPayload = {
          fullname:  form.fullname,
          email:     form.email,
          role:      form.role,
          is_active: form.is_active,
        };
        if (form.password) payload.password = form.password;
        result = await usersAPI.update(user!.id, payload);
      } else {
        const payload: CreateUserPayload = {
          fullname:  form.fullname,
          email:     form.email,
          role:      form.role,
          is_active: form.is_active,
          password:  form.password,
        };
        result = await usersAPI.create(payload);
      }
      onDone(result);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Chỉnh sửa người dùng" : "Thêm người dùng"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {apiErr && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{apiErr}</div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Họ và tên <span className="text-red-400">*</span>
          </label>
          <input value={form.fullname} placeholder="Nguyễn Văn An"
            onChange={e => set("fullname", e.target.value)}
            onBlur={() => touch("fullname")}
            className={fieldCls(!!errors.fullname)} />
          {errors.fullname && <p className="mt-1 text-xs text-red-400">{errors.fullname}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Email <span className="text-red-400">*</span>
          </label>
          <input type="email" value={form.email} placeholder="user@seedapp.vn"
            onChange={e => set("email", e.target.value)}
            onBlur={() => touch("email")}
            className={fieldCls(!!errors.email)} />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Vai trò</label>
            <select value={form.role} onChange={e => set("role", e.target.value as UserRole)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
              {(Object.keys(ROLE_META) as UserRole[]).map(r => (
                <option key={r} value={r} className="bg-slate-900">{ROLE_META[r].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Trạng thái</label>
            <select value={form.is_active ? "active" : "inactive"}
              onChange={e => set("is_active", e.target.value === "active")}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
              <option value="active"   className="bg-slate-900">Hoạt động</option>
              <option value="inactive" className="bg-slate-900">Dừng</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            {isEdit ? "Mật khẩu mới (để trống = giữ nguyên)" : <>Mật khẩu <span className="text-red-400">*</span></>}
          </label>
          <div className="relative">
            <input type={showPw ? "text" : "password"} value={form.password} placeholder="••••••••"
              onChange={e => set("password", e.target.value)}
              onBlur={() => touch("password")}
              className={`${fieldCls(!!errors.password)} pr-10`} />
            <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              <EyeIcon open={showPw} />
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
        </div>

        {(!isEdit || form.password) && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Xác nhận mật khẩu {!isEdit && <span className="text-red-400">*</span>}
            </label>
            <div className="relative">
              <input type={showCp ? "text" : "password"} value={form.confirmPassword} placeholder="••••••••"
                onChange={e => set("confirmPassword", e.target.value)}
                onBlur={() => touch("confirmPassword")}
                className={`${fieldCls(!!errors.confirmPassword)} pr-10`} />
              <button type="button" tabIndex={-1} onClick={() => setShowCp(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                <EyeIcon open={showCp} />
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
            {saving && <Spinner />}
            {isEdit ? "Lưu thay đổi" : "Thêm người dùng"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────────
function DeleteModal({ user, onClose, onDone }: {
  user: UserItem; onClose: () => void; onDone: (id: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [apiErr,   setApiErr]   = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setApiErr(null);
    try {
      await usersAPI.delete(user.id);
      onDone(user.id);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      setDeleting(false);
    }
  }

  return (
    <Modal title="Xóa người dùng" onClose={onClose}>
      <div className="space-y-4">
        {apiErr && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{apiErr}</div>
        )}
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <svg className="h-5 w-5 shrink-0 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-300">Hành động không thể hoàn tác</p>
            <p className="mt-1 text-xs text-slate-400">
              Tài khoản <span className="font-semibold text-white">{user.fullname}</span> ({user.email}) sẽ bị xóa vĩnh viễn.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            Hủy
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {deleting && <Spinner />}
            Xóa người dùng
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Detail drawer ──────────────────────────────────────────────────────────────
function DetailDrawer({ user, onClose }: { user: UserItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mt-4 w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-sm font-semibold text-white">Chi tiết người dùng</h3>
          <button onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-sm font-bold text-white">
              {initials(user.fullname)}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user.fullname}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <div className="ml-auto"><RoleBadge role={user.role} /></div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2.5">
            {[
              { label: "ID",           value: `#${user.id}`                        },
              { label: "Tham gia",     value: fmtDate(user.created_at)             },
              { label: "Cấp trên",     value: user.parent_id ? `#${user.parent_id}` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-slate-400">{label}</span>
                <span className="text-white">{value}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs items-center">
              <span className="text-slate-400">Trạng thái</span>
              <StatusDot active={user.is_active} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [items,      setItems]      = useState<UserItem[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [apiErr,     setApiErr]     = useState<string | null>(null);

  const [search,       setSearch]       = useState("");
  const [filterRole,   setFilterRole]   = useState<UserRole | "all">("all");
  const [filterActive, setFilterActive] = useState<boolean | "all">("all");
  const [pageSize,     setPageSize]     = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);

  const [addOpen,     setAddOpen]     = useState(false);
  const [editUser,    setEditUser]    = useState<UserItem | null>(null);
  const [deleteUser,  setDeleteUser]  = useState<UserItem | null>(null);
  const [detailUser,  setDetailUser]  = useState<UserItem | null>(null);

  // debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setApiErr(null);
    try {
      const res = await usersAPI.list({
        page,
        page_size: pageSize,
        search:    debouncedSearch || undefined,
        role:      filterRole,
        is_active: filterActive,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Không thể tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filterRole, filterActive]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function goPage(n: number) { setPage(Math.max(1, Math.min(n, totalPages))); }

  function handleFilterChange(fn: () => void) { fn(); setPage(1); }

  function onCreated(u: UserItem) {
    setAddOpen(false);
    setTotal(t => t + 1);
    setItems(prev => [u, ...prev.slice(0, pageSize - 1)]);
  }

  function onUpdated(u: UserItem) {
    setEditUser(null);
    setItems(prev => prev.map(x => x.id === u.id ? u : x));
  }

  function onDeleted(id: number) {
    setDeleteUser(null);
    setItems(prev => prev.filter(x => x.id !== id));
    setTotal(t => Math.max(0, t - 1));
  }

  const pageRange = useMemo(() => {
    const delta = 2;
    const range: (number | "…")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== "…") {
        range.push("…");
      }
    }
    return range;
  }, [totalPages, page]);

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Người dùng</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {loading ? "Đang tải…" : `${total} người dùng`}
            </p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity sm:self-auto"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm người dùng
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên hoặc email…"
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors"
            />
          </div>

          <select value={filterRole}
            onChange={e => handleFilterChange(() => setFilterRole(e.target.value as UserRole | "all"))}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
            <option value="all" className="bg-slate-900">Tất cả vai trò</option>
            {(Object.keys(ROLE_META) as UserRole[]).map(r => (
              <option key={r} value={r} className="bg-slate-900">{ROLE_META[r].label}</option>
            ))}
          </select>

          <select
            value={filterActive === "all" ? "all" : filterActive ? "active" : "inactive"}
            onChange={e => handleFilterChange(() =>
              setFilterActive(e.target.value === "all" ? "all" : e.target.value === "active")
            )}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
            <option value="all"      className="bg-slate-900">Tất cả trạng thái</option>
            <option value="active"   className="bg-slate-900">Hoạt động</option>
            <option value="inactive" className="bg-slate-900">Dừng</option>
          </select>
        </div>

        {/* Error banner */}
        {apiErr && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            <span>{apiErr}</span>
            <button onClick={fetchUsers}
              className="ml-4 text-xs underline underline-offset-2 hover:text-red-300">
              Thử lại
            </button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="px-5 py-3 text-left font-medium">#</th>
                  <th className="px-5 py-3 text-left font-medium">Người dùng</th>
                  <th className="px-5 py-3 text-left font-medium">Vai trò</th>
                  <th className="px-5 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-5 py-3 text-left font-medium">Tham gia</th>
                  <th className="px-5 py-3 text-right font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                        <Spinner /><span>Đang tải dữ liệu…</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                      Không tìm thấy người dùng nào.
                    </td>
                  </tr>
                ) : items.map((u, idx) => (
                  <tr key={u.id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 tabular-nums">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/60 to-indigo-500/60 text-xs font-bold text-white">
                          {initials(u.fullname)}
                        </div>
                        <div>
                          <p className="font-medium text-white leading-tight">{u.fullname}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-3.5"><StatusDot active={u.is_active} /></td>
                    <td className="px-5 py-3.5 text-slate-400 tabular-nums">{fmtDate(u.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Detail */}
                        <button onClick={() => setDetailUser(u)} title="Chi tiết"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-sky-300 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {/* Edit */}
                        <button onClick={() => setEditUser(u)} title="Chỉnh sửa"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-fuchsia-300 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Delete */}
                        <button onClick={() => setDeleteUser(u)} title="Xóa"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Hiển thị</span>
              <select value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value) as typeof pageSize); setPage(1); }}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
                {PAGE_SIZE_OPTIONS.map(n => (
                  <option key={n} value={n} className="bg-slate-900">{n}</option>
                ))}
              </select>
              <span>/ trang · {total} bản ghi</span>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => goPage(page - 1)} disabled={page === 1 || loading}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {pageRange.map((p, i) =>
                p === "…" ? (
                  <span key={`e-${i}`} className="flex h-7 w-7 items-center justify-center text-xs text-slate-500">…</span>
                ) : (
                  <button key={p} onClick={() => goPage(p as number)} disabled={loading}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                      p === page
                        ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}>
                    {p}
                  </button>
                )
              )}

              <button onClick={() => goPage(page + 1)} disabled={page === totalPages || loading}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {addOpen   && <UserFormModal user={null}     onClose={() => setAddOpen(false)}    onDone={onCreated} />}
      {editUser  && <UserFormModal user={editUser}  onClose={() => setEditUser(null)}   onDone={onUpdated} />}
      {deleteUser && <DeleteModal  user={deleteUser} onClose={() => setDeleteUser(null)} onDone={onDeleted} />}
      {detailUser && <DetailDrawer user={detailUser} onClose={() => setDetailUser(null)} />}
    </>
  );
}
