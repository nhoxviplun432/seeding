"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { friendAPI } from "@/lib/api";
import type { SeedFriend, FriendSyncStatus } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type StatusFilter = FriendSyncStatus | "all";

const STATUS_META: Record<FriendSyncStatus, { label: string; cls: string; dot: string }> = {
  pending:  { label: "Chờ kết bạn",  cls: "bg-amber-500/20  text-amber-300  border-amber-500/30",    dot: "bg-amber-400"   },
  sent:     { label: "Đã gửi",       cls: "bg-sky-500/20    text-sky-300    border-sky-500/30",      dot: "bg-sky-400 animate-pulse" },
  accepted: { label: "Đã kết bạn",   cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  rejected: { label: "Bị từ chối",   cls: "bg-red-500/20    text-red-300    border-red-500/30",      dot: "bg-red-400"     },
  removed:  { label: "Đã xóa",       cls: "bg-slate-500/20  text-slate-300  border-slate-500/30",    dot: "bg-slate-400"   },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", { dateStyle: "short" });
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
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

function StatusBadge({ status }: { status: FriendSyncStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-9 w-9 text-sm" : "h-6 w-6 text-[10px]";
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/60 to-indigo-500/60 font-bold text-white ${dim}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Add Friend Modal ───────────────────────────────────────────────────────────
function AddFriendModal({ onClose, onDone }: { onClose: () => void; onDone: (f: SeedFriend) => void }) {
  const [form, setForm]     = useState({ target_uid: "", account_id: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof typeof form, boolean>>>({});

  const errors = useMemo(() => {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (touched.target_uid && !form.target_uid.trim()) e.target_uid = "UID không được trống.";
    if (touched.account_id && !form.account_id) e.account_id = "Chọn tài khoản gửi.";
    return e;
  }, [form, touched]);

  function field(err?: boolean) {
    return [
      "w-full rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-white",
      "placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-colors",
      err ? "border-red-500/60 focus:ring-red-500/40" : "border-white/10 focus:ring-fuchsia-500/50",
    ].join(" ");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ target_uid: true, account_id: true });
    setApiErr(null);
    if (!form.target_uid.trim() || !form.account_id) return;
    setSaving(true);
    try {
      const result = await friendAPI.create({
        target_uid: form.target_uid.trim(),
        account_id: Number(form.account_id),
        note: form.note.trim() || undefined,
      });
      onDone(result);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-sm font-semibold text-white">Thêm kết bạn tự động</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {apiErr && <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{apiErr}</div>}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              UID Facebook mục tiêu <span className="text-red-400">*</span>
            </label>
            <input value={form.target_uid} placeholder="vd: 100012345678901"
              onChange={e => setForm(p => ({ ...p, target_uid: e.target.value }))}
              onBlur={() => setTouched(p => ({ ...p, target_uid: true }))}
              className={field(!!errors.target_uid)} />
            {errors.target_uid && <p className="mt-1 text-xs text-red-400">{errors.target_uid}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              ID Tài khoản gửi <span className="text-red-400">*</span>
            </label>
            <input value={form.account_id} placeholder="vd: 42" type="number" min="1"
              onChange={e => setForm(p => ({ ...p, account_id: e.target.value }))}
              onBlur={() => setTouched(p => ({ ...p, account_id: true }))}
              className={field(!!errors.account_id)} />
            {errors.account_id && <p className="mt-1 text-xs text-red-400">{errors.account_id}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Ghi chú <span className="text-slate-600">(tuỳ chọn)</span>
            </label>
            <input value={form.note} placeholder="vd: Khách hàng tiềm năng, chiến dịch Q2…"
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              className={field()} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
              {saving && <Spinner sm />}
              Gửi kết bạn
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Bulk Sync Modal ────────────────────────────────────────────────────────────
function BulkSyncModal({ onClose, onDone }: { onClose: () => void; onDone: (count: number) => void }) {
  const [uidsRaw, setUidsRaw] = useState("");
  const [accountId, setAccountId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [apiErr,  setApiErr]  = useState<string | null>(null);

  const uidList = uidsRaw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

  async function handleSync(e: React.FormEvent) {
    e.preventDefault();
    if (!uidList.length || !accountId) return;
    setSyncing(true);
    setApiErr(null);
    try {
      const { synced } = await friendAPI.bulkSync({
        target_uids: uidList,
        account_id: Number(accountId),
      });
      onDone(synced);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setSyncing(false);
    }
  }

  function field() {
    return "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Đồng bộ hàng loạt</h3>
            <p className="mt-0.5 text-xs text-slate-500">Nhập danh sách UID để tự động gửi lời mời kết bạn</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSync} noValidate className="px-6 py-5 space-y-4">
          {apiErr && <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{apiErr}</div>}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-400">Danh sách UID mục tiêu</label>
              {uidList.length > 0 && (
                <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-medium text-fuchsia-300">
                  {uidList.length} UID
                </span>
              )}
            </div>
            <textarea value={uidsRaw} rows={7} placeholder={"100012345678901\n100098765432100\n…"}
              onChange={e => setUidsRaw(e.target.value)}
              className={`${field()} resize-none font-mono text-xs leading-relaxed`} />
            <p className="mt-1 text-[11px] text-slate-600">Mỗi UID một dòng hoặc cách nhau bằng dấu phẩy.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              ID Tài khoản gửi <span className="text-red-400">*</span>
            </label>
            <input value={accountId} placeholder="vd: 42" type="number" min="1"
              onChange={e => setAccountId(e.target.value)}
              className={field()} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={syncing || !uidList.length || !accountId}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
              {syncing && <Spinner sm />}
              {syncing ? "Đang đồng bộ…" : `Đồng bộ ${uidList.length || 0} UID`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Detail Drawer ──────────────────────────────────────────────────────────────
function DetailDrawer({ item, onClose, onRemove }: {
  item: SeedFriend;
  onClose: () => void;
  onRemove: (id: number) => void;
}) {
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      await friendAPI.delete(item.id);
      onRemove(item.id);
    } catch {
      setRemoving(false);
    }
  }

  const canSend   = item.sync_status === "pending";
  const canRemove = item.sync_status === "accepted";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mt-4 w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 shrink-0">
          <h3 className="text-sm font-semibold text-white">Chi tiết bạn bè</h3>
          <button onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Profile */}
          <div className="flex items-center gap-3">
            <Avatar name={item.target_name ?? item.target_uid} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{item.target_name ?? "—"}</p>
              <p className="font-mono text-[11px] text-slate-500">{item.target_uid}</p>
            </div>
            <div className="ml-auto shrink-0"><StatusBadge status={item.sync_status} /></div>
          </div>

          {/* Meta */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2.5">
            {[
              { label: "Tài khoản gửi", value: item.account_name },
              { label: "Ghi chú",       value: item.note ?? "—" },
              { label: "Gửi lúc",       value: fmtDateTime(item.sent_at) },
              { label: "Chấp nhận",     value: fmtDateTime(item.accepted_at) },
              { label: "Tạo lúc",       value: fmtDateTime(item.created_at) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-xs gap-3">
                <span className="text-slate-400 shrink-0">{label}</span>
                <span className="text-white text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {item.error_msg && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-xs font-medium text-red-400 mb-1">Lỗi</p>
              <p className="text-xs text-slate-300">{item.error_msg}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            {canSend && (
              <button
                className="flex items-center justify-center gap-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-2 text-sm font-medium text-fuchsia-300 hover:bg-fuchsia-500/20 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 4v16m8-8H4" />
                </svg>
                Gửi lời mời
              </button>
            )}
            {canRemove && (
              <button onClick={handleRemove} disabled={removing}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                {removing ? <Spinner sm /> : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                  </svg>
                )}
                Hủy kết bạn
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function FriendsPage() {
  const [items,      setItems]      = useState<SeedFriend[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [apiErr,     setApiErr]     = useState<string | null>(null);

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [pageSize,     setPageSize]     = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);

  const [addOpen,     setAddOpen]     = useState(false);
  const [syncOpen,    setSyncOpen]    = useState(false);
  const [detailItem,  setDetailItem]  = useState<SeedFriend | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setApiErr(null);
    try {
      const res = await friendAPI.list({
        page, page_size: pageSize,
        search: debouncedSearch || undefined,
        sync_status: filterStatus,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function goPage(n: number) { setPage(Math.max(1, Math.min(n, totalPages))); }

  function onAdded(f: SeedFriend) {
    setAddOpen(false);
    setItems(prev => [f, ...prev.slice(0, pageSize - 1)]);
    setTotal(t => t + 1);
  }

  function onBulkSynced(count: number) {
    setSyncOpen(false);
    fetchData();
    setTotal(t => t + count);
  }

  function onRemoved(id: number) {
    setDetailItem(null);
    setItems(prev => prev.filter(x => x.id !== id));
    setTotal(t => Math.max(0, t - 1));
  }

  const statusCounts = useMemo(() =>
    (Object.keys(STATUS_META) as FriendSyncStatus[]).reduce((acc, s) => {
      acc[s] = items.filter(i => i.sync_status === s).length;
      return acc;
    }, {} as Record<FriendSyncStatus, number>),
    [items]
  );

  const pageRange = useMemo(() => {
    const delta = 2;
    const range: (number | "…")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta))
        range.push(i);
      else if (range[range.length - 1] !== "…")
        range.push("…");
    }
    return range;
  }, [totalPages, page]);

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Danh sách bạn bè</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {loading ? "Đang tải…" : `${total} liên hệ được quản lý`}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            {/* Bulk sync */}
            <button onClick={() => setSyncOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-500/20 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Đồng bộ hàng loạt
            </button>
            {/* Add single */}
            <button onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Thêm kết bạn
            </button>
          </div>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(Object.keys(STATUS_META) as FriendSyncStatus[]).map(s => (
            <button key={s}
              onClick={() => { setFilterStatus(s); setPage(1); }}
              className={`rounded-2xl border p-3.5 text-left transition-colors ${
                filterStatus === s
                  ? "border-fuchsia-500/40 bg-fuchsia-500/10"
                  : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
              }`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[s].dot.replace(" animate-pulse", "")}`} />
                <p className="text-[11px] text-slate-400 truncate">{STATUS_META[s].label}</p>
              </div>
              <p className="text-xl font-bold text-white">{loading ? "—" : statusCounts[s]}</p>
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
            <input value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên, UID hoặc tài khoản…"
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors"
            />
          </div>
          <select value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value as StatusFilter); setPage(1); }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
            <option value="all" className="bg-slate-900">Tất cả trạng thái</option>
            {(Object.keys(STATUS_META) as FriendSyncStatus[]).map(s => (
              <option key={s} value={s} className="bg-slate-900">{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {apiErr && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            <span>{apiErr}</span>
            <button onClick={fetchData} className="ml-4 text-xs underline underline-offset-2 hover:text-red-300">
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
                  <th className="px-5 py-3 text-left font-medium">Mục tiêu</th>
                  <th className="px-5 py-3 text-left font-medium">Tài khoản gửi</th>
                  <th className="px-5 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-5 py-3 text-left font-medium">Ghi chú</th>
                  <th className="px-5 py-3 text-left font-medium">Gửi lúc</th>
                  <th className="px-5 py-3 text-right font-medium">Chi tiết</th>
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
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-500">
                        <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-sm">Chưa có liên hệ nào.</p>
                        <button onClick={() => setAddOpen(true)}
                          className="rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 px-4 py-1.5 text-xs text-fuchsia-300 hover:bg-fuchsia-500/30 transition-colors">
                          + Thêm kết bạn đầu tiên
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : items.map((item, idx) => (
                  <tr key={item.id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 tabular-nums text-xs">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={item.target_name ?? item.target_uid} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{item.target_name ?? "—"}</p>
                          <p className="font-mono text-[10px] text-slate-500">{item.target_uid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={item.account_name} />
                        <span className="text-xs text-slate-300">{item.account_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={item.sync_status} /></td>
                    <td className="px-5 py-3.5 max-w-[160px]">
                      {item.note ? (
                        <span className="truncate block text-xs text-slate-400">{item.note}</span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 tabular-nums whitespace-nowrap">
                      {fmtDate(item.sent_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end">
                        <button onClick={() => setDetailItem(item)} title="Chi tiết"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-sky-300 transition-colors opacity-0 group-hover:opacity-100">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
              <span>/ trang · {total} liên hệ</span>
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

      {addOpen   && <AddFriendModal onClose={() => setAddOpen(false)} onDone={onAdded} />}
      {syncOpen  && <BulkSyncModal  onClose={() => setSyncOpen(false)} onDone={onBulkSynced} />}
      {detailItem && (
        <DetailDrawer
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onRemove={onRemoved}
        />
      )}
    </>
  );
}