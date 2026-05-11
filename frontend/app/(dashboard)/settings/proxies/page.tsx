"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { proxyAPI } from "@/lib/api";
import type {
  Proxy, ProxyProtocol, ProxyStatus,
  CreateProxyPayload, UpdateProxyPayload,
} from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const STATUS_META: Record<ProxyStatus, { label: string; cls: string; dot: string }> = {
  active:   { label: "Hoạt động", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", dot: "bg-emerald-400" },
  dead:     { label: "Chết",      cls: "bg-red-500/15    text-red-300    border-red-500/25",       dot: "bg-red-400"     },
  untested: { label: "Chưa test", cls: "bg-slate-500/15  text-slate-300  border-slate-500/25",     dot: "bg-slate-400"   },
  rotating: { label: "Rotating",  cls: "bg-sky-500/15    text-sky-300    border-sky-500/25",       dot: "bg-sky-400"     },
};

const PROTOCOLS: ProxyProtocol[] = ["http", "https", "socks4", "socks5"];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function latencyColor(ms?: number | null): string {
  if (ms == null) return "text-slate-500";
  if (ms < 300)   return "text-emerald-400";
  if (ms < 800)   return "text-amber-400";
  return "text-red-400";
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

function StatusBadge({ status }: { status: ProxyStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function ProtoTag({ protocol }: { protocol: ProxyProtocol }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-300 uppercase">
      {protocol}
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
function Modal({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
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

// ── Proxy Form ─────────────────────────────────────────────────────────────────
interface FormState {
  label: string;
  protocol: ProxyProtocol;
  host: string;
  port: string;
  username: string;
  password: string;
  is_rotating: boolean;
  rotate_url: string;
  country: string;
}

const EMPTY: FormState = {
  label: "", protocol: "http", host: "", port: "",
  username: "", password: "", is_rotating: false, rotate_url: "", country: "",
};

function ProxyFormModal({ proxy, onClose, onDone }: {
  proxy: Proxy | null;
  onClose: () => void;
  onDone: (p: Proxy, isNew: boolean) => void;
}) {
  const isEdit = !!proxy;
  const [form,    setForm]    = useState<FormState>(proxy ? {
    label:       proxy.label,
    protocol:    proxy.protocol,
    host:        proxy.host,
    port:        String(proxy.port),
    username:    proxy.username ?? "",
    password:    proxy.password ?? "",
    is_rotating: proxy.is_rotating,
    rotate_url:  proxy.rotate_url ?? "",
    country:     proxy.country ?? "",
  } : EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [saving,  setSaving]  = useState(false);
  const [apiErr,  setApiErr]  = useState<string | null>(null);
  const [showPw,  setShowPw]  = useState(false);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (touched.label && !form.label.trim()) e.label = "Tên không được trống.";
    if (touched.host  && !form.host.trim())  e.host  = "Host không được trống.";
    if (touched.port) {
      const p = Number(form.port);
      if (!form.port || isNaN(p) || p < 1 || p > 65535) e.port = "Port không hợp lệ (1–65535).";
    }
    if (form.is_rotating && touched.rotate_url && !form.rotate_url.trim())
      e.rotate_url = "Cần nhập Rotate URL.";
    return e;
  }, [form, touched]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }
  function touch(k: keyof FormState) {
    setTouched(p => ({ ...p, [k]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ label: true, host: true, port: true, rotate_url: true });
    setApiErr(null);

    if (!form.label.trim() || !form.host.trim()) return;
    const portNum = Number(form.port);
    if (!form.port || isNaN(portNum) || portNum < 1 || portNum > 65535) return;
    if (form.is_rotating && !form.rotate_url.trim()) return;

    setSaving(true);
    try {
      const base = {
        label:       form.label,
        protocol:    form.protocol,
        host:        form.host,
        port:        portNum,
        username:    form.username || undefined,
        password:    form.password || undefined,
        is_rotating: form.is_rotating,
        rotate_url:  form.is_rotating ? form.rotate_url : undefined,
        country:     form.country || undefined,
      };
      const result = isEdit
        ? await proxyAPI.update(proxy!.id, base as UpdateProxyPayload)
        : await proxyAPI.create(base as CreateProxyPayload);
      onDone(result, !isEdit);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Chỉnh sửa Proxy" : "Thêm Proxy"}
      subtitle={isEdit ? `${proxy!.protocol.toUpperCase()} · ${proxy!.host}:${proxy!.port}` : "Thêm proxy tĩnh hoặc rotating"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {apiErr && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{apiErr}</div>
        )}

        {/* Label */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Nhãn <span className="text-red-400">*</span>
          </label>
          <input value={form.label} placeholder="VN Proxy #1"
            onChange={e => set("label", e.target.value)} onBlur={() => touch("label")}
            className={fieldCls(!!errors.label)} />
          {errors.label && <p className="mt-1 text-xs text-red-400">{errors.label}</p>}
        </div>

        {/* Protocol + Host + Port */}
        <div className="grid grid-cols-[120px_1fr_90px] gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Protocol</label>
            <select value={form.protocol} onChange={e => set("protocol", e.target.value as ProxyProtocol)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
              {PROTOCOLS.map(p => (
                <option key={p} value={p} className="bg-slate-900 uppercase">{p.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Host <span className="text-red-400">*</span>
            </label>
            <input value={form.host} placeholder="192.168.1.1 hoặc proxy.example.com"
              onChange={e => set("host", e.target.value)} onBlur={() => touch("host")}
              className={fieldCls(!!errors.host)} />
            {errors.host && <p className="mt-1 text-xs text-red-400">{errors.host}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Port <span className="text-red-400">*</span>
            </label>
            <input value={form.port} placeholder="8080" inputMode="numeric"
              onChange={e => set("port", e.target.value)} onBlur={() => touch("port")}
              className={fieldCls(!!errors.port)} />
            {errors.port && <p className="mt-1 text-xs text-red-400">{errors.port}</p>}
          </div>
        </div>

        {/* Auth */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
            <input value={form.username} placeholder="(tuỳ chọn)"
              onChange={e => set("username", e.target.value)} className={fieldCls()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={form.password} placeholder="(tuỳ chọn)"
                onChange={e => set("password", e.target.value)}
                className={`${fieldCls()} pr-10`} />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showPw
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  }
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Country */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Quốc gia</label>
          <input value={form.country} placeholder="VN, US, SG… (tuỳ chọn)"
            onChange={e => set("country", e.target.value.toUpperCase().slice(0, 2))}
            className={fieldCls()} />
        </div>

        {/* Rotating toggle */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set("is_rotating", !form.is_rotating)}
              className={`relative h-5 w-9 rounded-full transition-colors ${form.is_rotating ? "bg-fuchsia-500" : "bg-white/10"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_rotating ? "translate-x-4" : ""}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Proxy Rotating</p>
              <p className="text-xs text-slate-500">IP thay đổi theo mỗi request hoặc theo thời gian</p>
            </div>
          </label>

          {form.is_rotating && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Rotate URL <span className="text-red-400">*</span>
                <span className="ml-1.5 font-normal text-slate-600">— gọi URL này để đổi IP</span>
              </label>
              <input value={form.rotate_url} placeholder="https://api.provider.com/rotate?key=xxx"
                onChange={e => set("rotate_url", e.target.value)} onBlur={() => touch("rotate_url")}
                className={fieldCls(!!errors.rotate_url)} />
              {errors.rotate_url && <p className="mt-1 text-xs text-red-400">{errors.rotate_url}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60">
            {saving && <Spinner />}
            {isEdit ? "Lưu thay đổi" : "Thêm Proxy"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete Modal ───────────────────────────────────────────────────────────────
function DeleteModal({ proxy, onClose, onDone }: {
  proxy: Proxy; onClose: () => void; onDone: (id: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    try {
      await proxyAPI.delete(proxy.id);
      onDone(proxy.id);
    } catch {
      setErr("Không thể xóa proxy."); setLoading(false);
    }
  }

  return (
    <Modal title="Xóa Proxy" onClose={onClose}>
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
              Proxy <span className="font-semibold text-white">{proxy.label}</span>{" "}
              ({proxy.host}:{proxy.port}) và các liên kết với tài khoản sẽ bị xóa vĩnh viễn.
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
            Xóa Proxy
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ProxiesPage() {
  const [items,      setItems]      = useState<Proxy[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [apiErr,     setApiErr]     = useState<string | null>(null);

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<ProxyStatus | "all">("all");
  const [filterProto,  setFilterProto]  = useState<ProxyProtocol | "all">("all");
  const [pageSize,     setPageSize]     = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);

  const [addOpen,      setAddOpen]      = useState(false);
  const [editProxy,    setEditProxy]    = useState<Proxy | null>(null);
  const [deleteProxy,  setDeleteProxy]  = useState<Proxy | null>(null);
  const [checking,     setChecking]     = useState<Record<number, boolean>>({});
  const [rotating,     setRotating]     = useState<Record<number, boolean>>({});

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const fetchProxies = useCallback(async () => {
    setLoading(true); setApiErr(null);
    try {
      const res = await proxyAPI.list({
        page, page_size: pageSize,
        search: debouncedSearch || undefined,
        status: filterStatus,
        protocol: filterProto,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Không thể tải danh sách.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filterStatus, filterProto]);

  useEffect(() => { fetchProxies(); }, [fetchProxies]);

  function goPage(n: number) { setPage(Math.max(1, Math.min(n, totalPages))); }
  function filterChange(fn: () => void) { fn(); setPage(1); }

  async function handleCheck(proxy: Proxy) {
    setChecking(p => ({ ...p, [proxy.id]: true }));
    try {
      const res = await proxyAPI.check(proxy.id);
      setItems(prev => prev.map(x => x.id === proxy.id
        ? { ...x, status: res.status, latency_ms: res.latency_ms, last_checked_at: new Date().toISOString() }
        : x
      ));
    } catch { /* silently ignore */ }
    finally { setChecking(p => ({ ...p, [proxy.id]: false })); }
  }

  async function handleRotate(proxy: Proxy) {
    setRotating(p => ({ ...p, [proxy.id]: true }));
    try {
      await proxyAPI.rotate(proxy.id);
    } catch { /* silently ignore */ }
    finally { setRotating(p => ({ ...p, [proxy.id]: false })); }
  }

  function onSaved(p: Proxy, isNew: boolean) {
    setAddOpen(false); setEditProxy(null);
    if (isNew) {
      setItems(prev => [p, ...prev.slice(0, pageSize - 1)]);
      setTotal(t => t + 1);
    } else {
      setItems(prev => prev.map(x => x.id === p.id ? p : x));
    }
  }

  function onDeleted(id: number) {
    setDeleteProxy(null);
    setItems(prev => prev.filter(x => x.id !== id));
    setTotal(t => Math.max(0, t - 1));
  }

  const pageRange = useMemo(() => {
    const delta = 2, range: (number | "…")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) range.push(i);
      else if (range[range.length - 1] !== "…") range.push("…");
    }
    return range;
  }, [totalPages, page]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach(p => { c[p.status] = (c[p.status] ?? 0) + 1; });
    return c;
  }, [items]);

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Quản lý Proxies</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {loading ? "Đang tải…" : `${total} proxy`}
            </p>
          </div>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity sm:self-auto">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm Proxy
          </button>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-2">
          {([
            { key: "all",      label: "Tất cả"    },
            { key: "active",   label: "Hoạt động" },
            { key: "rotating", label: "Rotating"  },
            { key: "untested", label: "Chưa test" },
            { key: "dead",     label: "Chết"      },
          ] as const).map(({ key, label }) => (
            <button key={key}
              onClick={() => filterChange(() => setFilterStatus(key))}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors
                ${filterStatus === key
                  ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300"
                  : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              {key !== "all" && <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[key as ProxyStatus]?.dot}`} />}
              {label}
              <span className="rounded-md bg-white/5 px-1.5 py-0.5 tabular-nums">
                {key === "all" ? total : (statusCounts[key] ?? 0)}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo nhãn, host, quốc gia…"
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors" />
          </div>
          <select value={filterProto}
            onChange={e => filterChange(() => setFilterProto(e.target.value as ProxyProtocol | "all"))}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
            <option value="all" className="bg-slate-900">Tất cả protocol</option>
            {PROTOCOLS.map(p => (
              <option key={p} value={p} className="bg-slate-900">{p.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {apiErr && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            <span>{apiErr}</span>
            <button onClick={fetchProxies} className="ml-4 text-xs underline underline-offset-2 hover:text-red-300">Thử lại</button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="px-5 py-3 text-left font-medium">#</th>
                  <th className="px-5 py-3 text-left font-medium">Proxy</th>
                  <th className="px-5 py-3 text-left font-medium">Auth</th>
                  <th className="px-5 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-5 py-3 text-left font-medium">Latency</th>
                  <th className="px-5 py-3 text-left font-medium">Tài khoản</th>
                  <th className="px-5 py-3 text-left font-medium">Kiểm tra lần cuối</th>
                  <th className="px-5 py-3 text-right font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                        <Spinner /><span>Đang tải…</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-600">
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                          </svg>
                        </div>
                        <p className="text-sm text-slate-500">Chưa có proxy nào.</p>
                        <button onClick={() => setAddOpen(true)}
                          className="text-xs text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-2">
                          Thêm proxy đầu tiên
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : items.map((proxy, idx) => (
                  <tr key={proxy.id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 tabular-nums text-xs">
                      {(page - 1) * pageSize + idx + 1}
                    </td>

                    {/* Proxy info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white text-sm truncate">{proxy.label}</p>
                            {proxy.country && (
                              <span className="text-[10px] text-slate-500 font-mono">{proxy.country}</span>
                            )}
                            {proxy.is_rotating && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-400">
                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                rotating
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <ProtoTag protocol={proxy.protocol} />
                            <span className="text-xs text-slate-400 font-mono">{proxy.host}:{proxy.port}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Auth */}
                    <td className="px-5 py-3.5">
                      {proxy.username ? (
                        <span className="text-xs text-slate-300 font-mono">{proxy.username}</span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5"><StatusBadge status={proxy.status} /></td>

                    {/* Latency */}
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-mono tabular-nums font-medium ${latencyColor(proxy.latency_ms)}`}>
                        {proxy.latency_ms != null ? `${proxy.latency_ms}ms` : "—"}
                      </span>
                    </td>

                    {/* Assigned accounts */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {proxy.assigned_count}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-xs text-slate-500 tabular-nums">{fmtDate(proxy.last_checked_at)}</td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Check */}
                        <button onClick={() => handleCheck(proxy)} disabled={checking[proxy.id]} title="Kiểm tra"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-emerald-400 transition-colors disabled:opacity-40">
                          {checking[proxy.id]
                            ? <Spinner sm />
                            : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                          }
                        </button>
                        {/* Rotate */}
                        {proxy.is_rotating && (
                          <button onClick={() => handleRotate(proxy)} disabled={rotating[proxy.id]} title="Đổi IP"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-sky-400 transition-colors disabled:opacity-40">
                            {rotating[proxy.id]
                              ? <Spinner sm />
                              : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            }
                          </button>
                        )}
                        {/* Edit */}
                        <button onClick={() => setEditProxy(proxy)} title="Chỉnh sửa"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-fuchsia-300 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Delete */}
                        <button onClick={() => setDeleteProxy(proxy)} title="Xóa"
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

      {addOpen     && <ProxyFormModal proxy={null}      onClose={() => setAddOpen(false)}    onDone={onSaved} />}
      {editProxy   && <ProxyFormModal proxy={editProxy}  onClose={() => setEditProxy(null)}  onDone={onSaved} />}
      {deleteProxy && <DeleteModal    proxy={deleteProxy} onClose={() => setDeleteProxy(null)} onDone={onDeleted} />}
    </>
  );
}
