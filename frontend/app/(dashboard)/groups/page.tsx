"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  usersAPI,
  type UserItem,
  type UserRole,
  type CreateUserPayload,
} from "@/lib/users";

// ── Constants ──────────────────────────────────────────────────────────────────
const ROLE_META: Record<UserRole, { label: string; cls: string }> = {
  super_admin: { label: "Super Admin", cls: "bg-rose-500/20    text-rose-300    border-rose-500/30"    },
  admin:       { label: "Admin",       cls: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30" },
  agency:      { label: "Agency",      cls: "bg-indigo-500/20  text-indigo-300  border-indigo-500/30"  },
  staff:       { label: "Staff",       cls: "bg-sky-500/20     text-sky-300     border-sky-500/30"     },
  member:      { label: "Member",      cls: "bg-slate-500/20   text-slate-300   border-slate-500/30"   },
};

const MEMBER_ROLES: UserRole[] = ["staff", "member"];

// ── Helpers ────────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function fieldCls(err: boolean) {
  return [
    "w-full rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-white",
    "placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-colors",
    err ? "border-red-500/60 focus:ring-red-500/40" : "border-white/10 focus:ring-fuchsia-500/50",
  ].join(" ");
}

// ── Atoms ──────────────────────────────────────────────────────────────────────
function Spinner({ sm }: { sm?: boolean }) {
  return (
    <svg className={`animate-spin ${sm ? "h-3.5 w-3.5" : "h-4 w-4"}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

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
    <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-slate-600"}`} />
  );
}

// ── Modal shell ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${wide ? "max-w-lg" : "max-w-md"} rounded-2xl border border-white/10 bg-slate-900 shadow-2xl`}>
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

// ── Add Member Modal ───────────────────────────────────────────────────────────
interface AddMemberForm {
  fullname: string;
  email: string;
  password: string;
  role: "staff" | "member";
}

function AddMemberModal({ parent, onClose, onDone }: {
  parent: UserItem;
  onClose: () => void;
  onDone: (u: UserItem) => void;
}) {
  const [form, setForm] = useState<AddMemberForm>({
    fullname: "", email: "", password: "", role: "staff",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof AddMemberForm, boolean>>>({});
  const [showPw,  setShowPw]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [apiErr,  setApiErr]  = useState<string | null>(null);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof AddMemberForm, string>> = {};
    if (touched.fullname && !form.fullname.trim())
      e.fullname = "Họ tên không được trống.";
    if (touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email không hợp lệ.";
    if (touched.password && form.password.length < 6)
      e.password = "Mật khẩu ít nhất 6 ký tự.";
    return e;
  }, [form, touched]);

  function set<K extends keyof AddMemberForm>(k: K, v: AddMemberForm[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ fullname: true, email: true, password: true });
    setApiErr(null);
    if (!form.fullname.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return;
    if (form.password.length < 6) return;

    setSaving(true);
    try {
      const payload: CreateUserPayload = {
        fullname:  form.fullname.trim(),
        email:     form.email.trim(),
        password:  form.password,
        role:      form.role,
        is_active: true,
        parent_id: parent.id,
      };
      const result = await usersAPI.create(payload);
      onDone(result);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Thêm thành viên vào: ${parent.fullname}`} onClose={onClose}>
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
            onBlur={() => setTouched(p => ({ ...p, fullname: true }))}
            className={fieldCls(!!errors.fullname)} />
          {errors.fullname && <p className="mt-1 text-xs text-red-400">{errors.fullname}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Email <span className="text-red-400">*</span>
          </label>
          <input type="email" value={form.email} placeholder="staff@company.vn"
            onChange={e => set("email", e.target.value)}
            onBlur={() => setTouched(p => ({ ...p, email: true }))}
            className={fieldCls(!!errors.email)} />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Vai trò</label>
            <select value={form.role} onChange={e => set("role", e.target.value as "staff" | "member")}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
              <option value="staff"  className="bg-slate-900">Staff</option>
              <option value="member" className="bg-slate-900">Member</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Mật khẩu <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={form.password} placeholder="••••••••"
                onChange={e => set("password", e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, password: true }))}
                className={`${fieldCls(!!errors.password)} pr-10`} />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showPw
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                  }
                </svg>
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
            {saving && <Spinner sm />}
            Thêm thành viên
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Remove Member Confirm ──────────────────────────────────────────────────────
function RemoveModal({ member, onClose, onDone }: {
  member: UserItem; onClose: () => void; onDone: (id: number) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [apiErr,   setApiErr]   = useState<string | null>(null);

  async function handle() {
    setRemoving(true);
    setApiErr(null);
    try {
      await usersAPI.update(member.id, { parent_id: null });
      onDone(member.id);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      setRemoving(false);
    }
  }

  return (
    <Modal title="Xoá khỏi nhóm" onClose={onClose}>
      <div className="space-y-4">
        {apiErr && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{apiErr}</div>
        )}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <svg className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-300">Xác nhận xoá khỏi nhóm</p>
            <p className="mt-1 text-xs text-slate-400">
              <span className="font-semibold text-white">{member.fullname}</span> sẽ không còn thuộc nhóm này. Tài khoản vẫn tồn tại trong hệ thống.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            Hủy
          </button>
          <button onClick={handle} disabled={removing}
            className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {removing && <Spinner sm />}
            Xoá khỏi nhóm
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Group Card ─────────────────────────────────────────────────────────────────
interface GroupNode {
  parent: UserItem;
  members: UserItem[];
}

function GroupCard({
  group,
  onAddMember,
  onRemoveMember,
}: {
  group: GroupNode;
  onAddMember: (parent: UserItem) => void;
  onRemoveMember: (member: UserItem) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const { parent, members } = group;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-4 px-5 py-4">
        <button onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left group">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-fuchsia-900/30">
            {initials(parent.fullname)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{parent.fullname}</p>
              <RoleBadge role={parent.role} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{parent.email}</p>
          </div>
          <svg
            className={`ml-auto mr-2 h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {members.length} thành viên
          </span>
          <button
            onClick={() => onAddMember(parent)}
            className="flex items-center gap-1.5 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-medium text-fuchsia-300 hover:bg-fuchsia-500/20 transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm
          </button>
        </div>
      </div>

      {/* Member list */}
      {expanded && (
        <div className="border-t border-white/5">
          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-600">
              <svg className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <p className="text-xs">Chưa có thành viên. Nhấn Thêm để bắt đầu.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {members.map(member => (
                <div key={member.id}
                  className="group flex items-center gap-4 px-5 py-3 hover:bg-white/[0.03] transition-colors">
                  {/* Indent line */}
                  <div className="flex shrink-0 items-center gap-2 pl-2">
                    <div className="h-4 w-px bg-white/10" />
                    <div className="h-px w-3 bg-white/10" />
                  </div>

                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/50 to-indigo-500/50 text-[11px] font-bold text-white">
                    {initials(member.fullname)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusDot active={member.is_active} />
                      <p className="text-sm font-medium text-white truncate">{member.fullname}</p>
                      <RoleBadge role={member.role} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{member.email}</p>
                  </div>

                  <div className="shrink-0 text-xs text-slate-600 tabular-nums">
                    {fmtDate(member.created_at)}
                  </div>

                  <button
                    onClick={() => onRemoveMember(member)}
                    title="Xoá khỏi nhóm"
                    className="shrink-0 rounded-lg p-1.5 text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function GroupsPage() {
  const [allUsers,  setAllUsers]  = useState<UserItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [apiErr,    setApiErr]    = useState<string | null>(null);
  const [search,    setSearch]    = useState("");

  const [addTarget,    setAddTarget]    = useState<UserItem | null>(null);
  const [removeTarget, setRemoveTarget] = useState<UserItem | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setApiErr(null);
    try {
      const first = await usersAPI.list({ page: 1, page_size: 100 });
      const all = [...first.items];
      const remaining = first.total_pages - 1;
      if (remaining > 0) {
        const pages = await Promise.all(
          Array.from({ length: remaining }, (_, i) =>
            usersAPI.list({ page: i + 2, page_size: 100 })
          )
        );
        pages.forEach(r => all.push(...r.items));
      }
      setAllUsers(all);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build group tree: parents (admin/agency/staff who have children) → their members
  const groups = useMemo((): GroupNode[] => {
    const memberMap = new Map<number, UserItem[]>();
    const parentSet = new Set<number>();

    for (const u of allUsers) {
      if (u.parent_id != null) {
        if (!memberMap.has(u.parent_id)) memberMap.set(u.parent_id, []);
        memberMap.get(u.parent_id)!.push(u);
        parentSet.add(u.parent_id);
      }
    }

    // Parents = users who have at least one child
    const parents = allUsers.filter(u => parentSet.has(u.id));

    return parents
      .sort((a, b) => a.fullname.localeCompare(b.fullname, "vi"))
      .map(p => ({ parent: p, members: memberMap.get(p.id) ?? [] }));
  }, [allUsers]);

  // Ungrouped members (parent_id == null, not a parent themselves)
  const ungrouped = useMemo(() => {
    const parentIds = new Set(groups.map(g => g.parent.id));
    const memberIds = new Set(groups.flatMap(g => g.members.map(m => m.id)));
    return allUsers.filter(u =>
      !parentIds.has(u.id) &&
      !memberIds.has(u.id) &&
      MEMBER_ROLES.includes(u.role)
    );
  }, [allUsers, groups]);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map(g => ({
        parent: g.parent,
        members: g.members.filter(m =>
          m.fullname.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
        ),
      }))
      .filter(g =>
        g.parent.fullname.toLowerCase().includes(q) ||
        g.parent.email.toLowerCase().includes(q) ||
        g.members.length > 0
      );
  }, [groups, search]);

  const totalMembers = groups.reduce((s, g) => s + g.members.length, 0);

  function onMemberAdded(u: UserItem) {
    setAddTarget(null);
    setAllUsers(prev => [...prev, u]);
  }

  function onMemberRemoved(id: number) {
    setRemoveTarget(null);
    setAllUsers(prev => prev.map(u => u.id === id ? { ...u, parent_id: null } : u));
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Quản lý Nhóm</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {loading
                ? "Đang tải…"
                : `${groups.length} nhóm · ${totalMembers} thành viên`}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Tổng nhóm",       value: groups.length,   icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
            { label: "Tổng thành viên", value: totalMembers,    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
            { label: "Chưa phân nhóm",  value: ungrouped.length, icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                </svg>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{loading ? "—" : value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm nhóm hoặc thành viên…"
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors"
          />
        </div>

        {/* Error */}
        {apiErr && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            <span>{apiErr}</span>
            <button onClick={fetchAll} className="ml-4 text-xs underline underline-offset-2 hover:text-red-300">
              Thử lại
            </button>
          </div>
        )}

        {/* Group list */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
            <Spinner /><span>Đang tải dữ liệu…</span>
          </div>
        ) : filtered.length === 0 && !search ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-600">
            <svg className="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-sm">Chưa có nhóm nào. Tạo user và gán parent_id để tạo nhóm.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Không tìm thấy kết quả cho &ldquo;{search}&rdquo;
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(g => (
              <GroupCard
                key={g.parent.id}
                group={g}
                onAddMember={setAddTarget}
                onRemoveMember={setRemoveTarget}
              />
            ))}
          </div>
        )}

        {/* Ungrouped section */}
        {!loading && ungrouped.length > 0 && !search && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Chưa phân nhóm · {ungrouped.length}
              </p>
            </div>
            <div className="divide-y divide-white/5">
              {ungrouped.map(u => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-slate-400">
                    {initials(u.fullname)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusDot active={u.is_active} />
                      <p className="text-sm text-white truncate">{u.fullname}</p>
                      <RoleBadge role={u.role} />
                    </div>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {addTarget    && <AddMemberModal parent={addTarget}  onClose={() => setAddTarget(null)}    onDone={onMemberAdded}   />}
      {removeTarget && <RemoveModal   member={removeTarget} onClose={() => setRemoveTarget(null)} onDone={onMemberRemoved} />}
    </>
  );
}