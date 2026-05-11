"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { fbAccountAPI } from "@/lib/api";
import type { FbAccount, FbAccountType, FbAccountStatus, CreateFbAccountPayload, UpdateFbAccountPayload, LoginStep } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const STATUS_META: Record<FbAccountStatus, { label: string; cls: string; dot: string }> = {
  active:     { label: "Hoạt động",   cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", dot: "bg-emerald-400" },
  checkpoint: { label: "Checkpoint",  cls: "bg-amber-500/15  text-amber-300  border-amber-500/25",    dot: "bg-amber-400"   },
  disabled:   { label: "Vô hiệu",     cls: "bg-red-500/15    text-red-300    border-red-500/25",       dot: "bg-red-400"     },
  warming:    { label: "Làm nóng",    cls: "bg-sky-500/15    text-sky-300    border-sky-500/25",       dot: "bg-sky-400"     },
  inactive:   { label: "Chưa login",  cls: "bg-slate-500/15  text-slate-300  border-slate-500/25",    dot: "bg-slate-400"   },
  banned:     { label: "Bị khóa",     cls: "bg-red-700/15    text-red-400    border-red-700/25",       dot: "bg-red-500"     },
};

const TYPE_META: Record<FbAccountType, { label: string; cls: string }> = {
  via:      { label: "Via",      cls: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25" },
  clone:    { label: "Clone",    cls: "bg-indigo-500/15  text-indigo-300  border-indigo-500/25"  },
  business: { label: "Business", cls: "bg-violet-500/15  text-violet-300  border-violet-500/25"  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return fmtDate(iso);
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
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

function StatusBadge({ status }: { status: FbAccountStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function TypeBadge({ type }: { type: FbAccountType }) {
  const m = TYPE_META[type];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

function fieldCls(err?: boolean) {
  return [
    "w-full rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-white",
    "placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-colors",
    err ? "border-red-500/60 focus:ring-red-500/40" : "border-white/10 focus:ring-fuchsia-500/50",
  ].join(" ");
}

// ── Modal shell ────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, wide }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-white/10 bg-slate-900 shadow-2xl`}>
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button onClick={onClose}
            className="ml-4 rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
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

// ── 2FA Verify Modal ───────────────────────────────────────────────────────────
function TwoFAModal({ account, onClose, onVerified }: {
  account: FbAccount;
  onClose: () => void;
  onVerified: (acc: FbAccount) => void;
}) {
  const [code,    setCode]    = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);
  const [ok,      setOk]      = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleDigit(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    setErr(null);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputs.current[5]?.focus();
    }
  }

  async function handleSubmit() {
    const full = code.join("");
    if (full.length < 6) { setErr("Nhập đủ 6 chữ số."); return; }
    setLoading(true);
    setErr(null);
    try {
      await fbAccountAPI.verify2fa(account.id);
      setOk(true);
      setTimeout(() => {
        onVerified({ ...account, has_2fa: true, status: "active" });
      }, 1000);
    } catch {
      setErr("Mã không đúng hoặc đã hết hạn. Thử lại.");
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Xác thực 2FA" subtitle={`Tài khoản: ${account.name} · ${account.uid}`} onClose={onClose}>
      <div className="space-y-5">
        {/* Icon */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-fuchsia-400">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white">Nhập mã xác thực</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {account.two_fa_secret
                ? "Mã từ ứng dụng Authenticator của bạn"
                : "Nhập mã 2FA nhận được từ Facebook"}
            </p>
          </div>
        </div>

        {/* OTP input */}
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {code.map((d, i) => (
            <input
              key={i}
              ref={el => { inputs.current[i] = el; }}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              maxLength={1}
              inputMode="numeric"
              className={`h-12 w-10 rounded-xl border text-center text-lg font-bold text-white bg-white/5
                focus:outline-none focus:ring-2 transition-all
                ${err ? "border-red-500/60 focus:ring-red-500/40"
                      : d ? "border-fuchsia-500/60 focus:ring-fuchsia-500/40"
                           : "border-white/10 focus:ring-fuchsia-500/40"}`}
            />
          ))}
        </div>

        {err && (
          <p className="text-center text-xs text-red-400">{err}</p>
        )}

        {ok && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-sm text-emerald-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Xác thực thành công!
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            Bỏ qua
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading || ok || code.join("").length < 6}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
            {loading && <Spinner />}
            {ok ? "Đã xác thực" : "Xác nhận"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Account Form Modal ─────────────────────────────────────────────────────────
interface FormData {
  uid: string;
  name: string;
  email: string;
  phone: string;
  account_type: FbAccountType;
  cookie: string;
  user_agent: string;
  two_fa_secret: string;
}

const EMPTY_FORM: FormData = {
  uid: "", name: "", email: "", phone: "",
  account_type: "via", cookie: "", user_agent: "", two_fa_secret: "",
};

function AccountFormModal({ account, onClose, onDone }: {
  account: FbAccount | null;
  onClose: () => void;
  onDone: (acc: FbAccount, isNew: boolean) => void;
}) {
  const isEdit = !!account;
  const [form,    setForm]    = useState<FormData>(account ? {
    uid:           account.uid,
    name:          account.name,
    email:         account.email ?? "",
    phone:         account.phone ?? "",
    account_type:  account.account_type,
    cookie:        account.cookie ?? "",
    user_agent:    account.user_agent ?? "",
    two_fa_secret: account.two_fa_secret ?? "",
  } : EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [saving,  setSaving]  = useState(false);
  const [apiErr,  setApiErr]  = useState<string | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [created, setCreated] = useState<FbAccount | null>(null);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (touched.uid  && !form.uid.trim())  e.uid  = "UID không được trống.";
    if (touched.name && !form.name.trim()) e.name = "Tên không được trống.";
    return e;
  }, [form, touched]);

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }
  function touch(k: keyof FormData) {
    setTouched(p => ({ ...p, [k]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ uid: true, name: true });
    setApiErr(null);
    if (!form.uid.trim() || !form.name.trim()) return;

    setSaving(true);
    try {
      let result: FbAccount;
      if (isEdit) {
        const payload: UpdateFbAccountPayload = {
          name:          form.name || undefined,
          email:         form.email || undefined,
          phone:         form.phone || undefined,
          account_type:  form.account_type,
          cookie:        form.cookie || undefined,
          user_agent:    form.user_agent || undefined,
          two_fa_secret: form.two_fa_secret || undefined,
        };
        result = await fbAccountAPI.update(account!.id, payload);
        onDone(result, false);
      } else {
        const payload: CreateFbAccountPayload = {
          uid:           form.uid,
          name:          form.name,
          email:         form.email || undefined,
          phone:         form.phone || undefined,
          account_type:  form.account_type,
          cookie:        form.cookie || undefined,
          user_agent:    form.user_agent || undefined,
          two_fa_secret: form.two_fa_secret || undefined,
        };
        result = await fbAccountAPI.create(payload);
        setCreated(result);
        setShow2FA(true);
      }
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  if (show2FA && created) {
    return (
      <TwoFAModal
        account={created}
        onClose={() => { onDone(created, true); }}
        onVerified={acc => { onDone(acc, true); }}
      />
    );
  }

  return (
    <Modal
      wide
      title={isEdit ? "Chỉnh sửa tài khoản" : "Thêm tài khoản Facebook"}
      subtitle={isEdit ? `UID: ${account!.uid}` : "Kết nối tài khoản Facebook để seeding"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {apiErr && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{apiErr}</div>
        )}

        {/* Row 1: UID + Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Facebook UID <span className="text-red-400">*</span>
            </label>
            <input value={form.uid} disabled={isEdit} placeholder="100012345678"
              onChange={e => set("uid", e.target.value)} onBlur={() => touch("uid")}
              className={`${fieldCls(!!errors.uid)} ${isEdit ? "opacity-50 cursor-not-allowed" : ""}`} />
            {errors.uid && <p className="mt-1 text-xs text-red-400">{errors.uid}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Tên hiển thị <span className="text-red-400">*</span>
            </label>
            <input value={form.name} placeholder="Nguyễn Văn A"
              onChange={e => set("name", e.target.value)} onBlur={() => touch("name")}
              className={fieldCls(!!errors.name)} />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
          </div>
        </div>

        {/* Row 2: email + phone + type */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
            <input type="email" value={form.email} placeholder="user@email.com"
              onChange={e => set("email", e.target.value)} className={fieldCls()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Số điện thoại</label>
            <input value={form.phone} placeholder="0912345678"
              onChange={e => set("phone", e.target.value)} className={fieldCls()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Loại tài khoản</label>
            <select value={form.account_type} onChange={e => set("account_type", e.target.value as FbAccountType)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
              <option value="via"      className="bg-slate-900">Via</option>
              <option value="clone"    className="bg-slate-900">Clone</option>
              <option value="business" className="bg-slate-900">Business</option>
            </select>
          </div>
        </div>

        {/* Cookie */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Cookie</label>
          <textarea value={form.cookie} rows={3} placeholder="c_user=...; xs=...;"
            onChange={e => set("cookie", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white font-mono
              placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors resize-none" />
        </div>

        {/* 2FA secret */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Secret 2FA
            <span className="ml-1.5 text-slate-600 font-normal">(tuỳ chọn — dùng để tự động tạo OTP)</span>
          </label>
          <input value={form.two_fa_secret} placeholder="JBSWY3DPEHPK3PXP"
            onChange={e => set("two_fa_secret", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white font-mono
              placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors" />
        </div>

        {/* User agent */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">User Agent</label>
          <input value={form.user_agent} placeholder="Mozilla/5.0 ..."
            onChange={e => set("user_agent", e.target.value)} className={fieldCls()} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60">
            {saving && <Spinner />}
            {isEdit ? "Lưu thay đổi" : "Thêm & Xác thực 2FA"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete Modal ───────────────────────────────────────────────────────────────
function DeleteModal({ account, onClose, onDone }: {
  account: FbAccount;
  onClose: () => void;
  onDone: (id: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    try {
      await fbAccountAPI.delete(account.id);
      onDone(account.id);
    } catch {
      setErr("Không thể xóa tài khoản."); setLoading(false);
    }
  }

  return (
    <Modal title="Xóa tài khoản" onClose={onClose}>
      <div className="space-y-4">
        {err && <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{err}</div>}
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <svg className="h-5 w-5 shrink-0 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-300">Không thể hoàn tác</p>
            <p className="mt-1 text-xs text-slate-400">
              Tài khoản <span className="font-semibold text-white">{account.name}</span> (UID: {account.uid}) và toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            Hủy
          </button>
          <button onClick={handleDelete} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-60">
            {loading && <Spinner />}
            Xóa tài khoản
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Detail Drawer ──────────────────────────────────────────────────────────────
function DetailDrawer({ account, onClose, onEdit, on2FA }: {
  account: FbAccount;
  onClose: () => void;
  onEdit: () => void;
  on2FA: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mt-4 w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 shrink-0">
          <h3 className="text-sm font-semibold text-white">Chi tiết tài khoản</h3>
          <button onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-sm font-bold text-white">
              {initials(account.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{account.name}</p>
              <p className="text-xs text-slate-400">UID: {account.uid}</p>
            </div>
            <div className="ml-auto shrink-0"><StatusBadge status={account.status} /></div>
          </div>

          {/* Info grid */}
          <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
            {[
              { label: "Loại",        value: <TypeBadge type={account.account_type} /> },
              { label: "Email",       value: account.email   ?? "—" },
              { label: "SĐT",         value: account.phone   ?? "—" },
              { label: "Proxy",       value: account.proxy_label ?? "—" },
              { label: "2FA",         value: account.has_2fa
                ? <span className="text-emerald-400 text-xs">Đã bật</span>
                : <span className="text-slate-500 text-xs">Chưa bật</span> },
              { label: "Hoạt động",   value: fmtRelative(account.last_active_at) },
              { label: "Tham gia",    value: fmtDate(account.created_at) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="text-slate-400">{label}</span>
                <span className="text-white">{value}</span>
              </div>
            ))}
          </div>

          {/* Cookie preview */}
          {account.cookie && (
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Cookie</p>
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[10px] text-slate-400 font-mono break-all line-clamp-3">
                {account.cookie}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-white/10 p-4 shrink-0 flex gap-2">
          {!account.has_2fa && (
            <button onClick={on2FA}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 py-2 text-xs font-medium text-fuchsia-300 hover:bg-fuchsia-500/15 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Bật 2FA
            </button>
          )}
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Chỉnh sửa
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ApiSettingsPage() {
  const [items,      setItems]      = useState<FbAccount[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [apiErr,     setApiErr]     = useState<string | null>(null);

  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState<FbAccountStatus | "all">("all");
  const [filterType,    setFilterType]    = useState<FbAccountType | "all">("all");
  const [pageSize,      setPageSize]      = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);

  const [addOpen,      setAddOpen]      = useState(false);
  const [editAccount,  setEditAccount]  = useState<FbAccount | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<FbAccount | null>(null);
  const [detailAccount, setDetailAccount] = useState<FbAccount | null>(null);
  const [twoFAAccount,  setTwoFAAccount]  = useState<FbAccount | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const fetchAccounts = useCallback(async () => {
    setLoading(true); setApiErr(null);
    try {
      const res = await fbAccountAPI.list({
        page, page_size: pageSize,
        search: debouncedSearch || undefined,
        status: filterStatus,
        account_type: filterType,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Không thể tải danh sách.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filterStatus, filterType]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  function goPage(n: number) { setPage(Math.max(1, Math.min(n, totalPages))); }
  function filterChange(fn: () => void) { fn(); setPage(1); }

  function onCreated(acc: FbAccount) {
    setAddOpen(false); setTwoFAAccount(null);
    setItems(p => [acc, ...p.slice(0, pageSize - 1)]);
    setTotal(t => t + 1);
  }
  function onUpdated(acc: FbAccount) {
    setEditAccount(null);
    setItems(p => p.map(x => x.id === acc.id ? acc : x));
  }
  function onDeleted(id: number) {
    setDeleteAccount(null);
    setItems(p => p.filter(x => x.id !== id));
    setTotal(t => Math.max(0, t - 1));
  }
  function on2FAVerified(acc: FbAccount) {
    setTwoFAAccount(null); setDetailAccount(null);
    setItems(p => p.map(x => x.id === acc.id ? acc : x));
  }

  const pageRange = useMemo(() => {
    const delta = 2, range: (number | "…")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== "…") range.push("…");
    }
    return range;
  }, [totalPages, page]);

  // Status summary counts
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: total };
    items.forEach(a => { c[a.status] = (c[a.status] ?? 0) + 1; });
    return c;
  }, [items, total]);

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Tài khoản Facebook</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {loading ? "Đang tải…" : `${total} tài khoản được kết nối`}
            </p>
          </div>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity sm:self-auto">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm tài khoản
          </button>
        </div>

        {/* Status summary chips */}
        <div className="flex flex-wrap gap-2">
          {([
            { key: "all",        label: "Tất cả"    },
            { key: "active",     label: "Hoạt động" },
            { key: "checkpoint", label: "Checkpoint" },
            { key: "warming",    label: "Làm nóng"  },
            { key: "disabled",   label: "Vô hiệu"   },
          ] as const).map(({ key, label }) => (
            <button key={key}
              onClick={() => filterChange(() => setFilterStatus(key))}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors
                ${filterStatus === key
                  ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300"
                  : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              {key !== "all" && <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[key as FbAccountStatus]?.dot}`} />}
              {label}
              <span className="rounded-md bg-white/5 px-1.5 py-0.5 tabular-nums">
                {statusCounts[key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên, UID, email…"
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors" />
          </div>
          <select value={filterType}
            onChange={e => filterChange(() => setFilterType(e.target.value as FbAccountType | "all"))}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
            <option value="all"      className="bg-slate-900">Tất cả loại</option>
            <option value="via"      className="bg-slate-900">Via</option>
            <option value="clone"    className="bg-slate-900">Clone</option>
            <option value="business" className="bg-slate-900">Business</option>
          </select>
        </div>

        {/* Error */}
        {apiErr && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            <span>{apiErr}</span>
            <button onClick={fetchAccounts} className="ml-4 text-xs underline underline-offset-2 hover:text-red-300">Thử lại</button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="px-5 py-3 text-left font-medium">#</th>
                  <th className="px-5 py-3 text-left font-medium">Tài khoản</th>
                  <th className="px-5 py-3 text-left font-medium">Loại</th>
                  <th className="px-5 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-5 py-3 text-left font-medium">2FA</th>
                  <th className="px-5 py-3 text-left font-medium">Hoạt động</th>
                  <th className="px-5 py-3 text-right font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                        <Spinner /><span>Đang tải dữ liệu…</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-600">
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <p className="text-sm text-slate-500">Chưa có tài khoản nào.</p>
                        <button onClick={() => setAddOpen(true)}
                          className="text-xs text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-2">
                          Thêm tài khoản đầu tiên
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : items.map((acc, idx) => (
                  <tr key={acc.id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 tabular-nums text-xs">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/60 to-indigo-500/60 text-xs font-bold text-white">
                          {initials(acc.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white leading-tight truncate">{acc.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono">{acc.uid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><TypeBadge type={acc.account_type} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={acc.status} /></td>
                    <td className="px-5 py-3.5">
                      {acc.has_2fa ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Bật
                        </span>
                      ) : (
                        <button onClick={() => setTwoFAAccount(acc)}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-fuchsia-400 transition-colors">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Bật 2FA
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">{fmtRelative(acc.last_active_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setDetailAccount(acc)} title="Chi tiết"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-sky-300 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button onClick={() => setEditAccount(acc)} title="Chỉnh sửa"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-fuchsia-300 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeleteAccount(acc)} title="Xóa"
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
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white focus:outline-none">
                {PAGE_SIZE_OPTIONS.map(n => (
                  <option key={n} value={n} className="bg-slate-900">{n}</option>
                ))}
              </select>
              <span>/ trang · {total} bản ghi</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => goPage(page - 1)} disabled={page === 1 || loading}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 transition-colors">
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
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 transition-colors">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {addOpen       && <AccountFormModal account={null}        onClose={() => setAddOpen(false)}       onDone={(acc, isNew) => isNew ? onCreated(acc) : onUpdated(acc)} />}
      {editAccount   && <AccountFormModal account={editAccount}  onClose={() => setEditAccount(null)}   onDone={(acc) => onUpdated(acc)} />}
      {deleteAccount && <DeleteModal      account={deleteAccount} onClose={() => setDeleteAccount(null)} onDone={onDeleted} />}
      {detailAccount && (
        <DetailDrawer
          account={detailAccount}
          onClose={() => setDetailAccount(null)}
          onEdit={() => { setEditAccount(detailAccount); setDetailAccount(null); }}
          on2FA={() => { setTwoFAAccount(detailAccount); setDetailAccount(null); }}
        />
      )}
      {twoFAAccount && (
        <TwoFAModal
          account={twoFAAccount}
          onClose={() => setTwoFAAccount(null)}
          onVerified={on2FAVerified}
        />
      )}
    </>
  );
}
