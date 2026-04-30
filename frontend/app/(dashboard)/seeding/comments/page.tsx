"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { commentAPI } from "@/lib/api";
import type { SeedComment } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type StatusFilter = SeedComment["status"] | "all";

const STATUS_META: Record<SeedComment["status"], { label: string; cls: string }> = {
  pending:  { label: "Chờ",        cls: "bg-amber-500/20  text-amber-300  border-amber-500/30"  },
  success:  { label: "Thành công", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  failed:   { label: "Thất bại",   cls: "bg-red-500/20    text-red-300    border-red-500/30"    },
  retrying: { label: "Thử lại",    cls: "bg-sky-500/20    text-sky-300    border-sky-500/30"    },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function truncate(str: string, n = 60): string {
  return str.length > n ? str.slice(0, n) + "…" : str;
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

function StatusBadge({ status }: { status: SeedComment["status"] }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

// ── Detail Drawer ──────────────────────────────────────────────────────────────
function DetailDrawer({ item, onClose }: { item: SeedComment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mt-4 w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-sm font-semibold text-white">Chi tiết bình luận</h3>
          <button onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            {[
              { label: "ID",         value: `#${item.id}` },
              { label: "Tài khoản",  value: item.account_name },
              { label: "Trạng thái", value: <StatusBadge status={item.status} /> },
              { label: "Đã bình luận", value: fmtDate(item.commented_at) },
              { label: "Tạo lúc",    value: fmtDate(item.created_at) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs gap-4">
                <span className="text-slate-400 shrink-0">{label}</span>
                <span className="text-white text-right">{value}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-400">URL bài viết</p>
            <a href={item.post_url} target="_blank" rel="noreferrer"
              className="block break-all rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-fuchsia-300 hover:text-fuchsia-200 transition-colors">
              {item.post_url}
            </a>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-400">Nội dung bình luận</p>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white leading-relaxed whitespace-pre-wrap">
              {item.comment_content}
            </div>
          </div>

          {item.error_msg && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-xs font-medium text-red-400 mb-1">Lỗi</p>
              <p className="text-xs text-slate-300">{item.error_msg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CommentsPage() {
  const [items,      setItems]      = useState<SeedComment[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [apiErr,     setApiErr]     = useState<string | null>(null);

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [pageSize,     setPageSize]     = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);

  const [detailItem, setDetailItem] = useState<SeedComment | null>(null);

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
      const res = await commentAPI.list({
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        status: filterStatus,
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
            <h2 className="text-lg font-semibold text-white">Bình luận Seeding</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {loading ? "Đang tải…" : `${total} bình luận đã đồng bộ`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-medium text-fuchsia-300">
              Sync tự động
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(STATUS_META) as SeedComment["status"][]).map((s) => (
            <button key={s}
              onClick={() => { setFilterStatus(s); setPage(1); }}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                filterStatus === s
                  ? "border-fuchsia-500/40 bg-fuchsia-500/10"
                  : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
              }`}>
              <p className="text-xs text-slate-400">{STATUS_META[s].label}</p>
              <p className="mt-1 text-xl font-bold text-white">—</p>
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
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo URL bài viết hoặc nội dung…"
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value as StatusFilter); setPage(1); }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
            <option value="all" className="bg-slate-900">Tất cả trạng thái</option>
            {(Object.keys(STATUS_META) as SeedComment["status"][]).map(s => (
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
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="px-5 py-3 text-left font-medium">#</th>
                  <th className="px-5 py-3 text-left font-medium">URL bài viết</th>
                  <th className="px-5 py-3 text-left font-medium">Nội dung</th>
                  <th className="px-5 py-3 text-left font-medium">Tài khoản</th>
                  <th className="px-5 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-5 py-3 text-left font-medium">Thời gian</th>
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
                        <svg className="h-10 w-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <p className="text-sm">Chưa có bình luận nào được đồng bộ.</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map((item, idx) => (
                  <tr key={item.id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 tabular-nums text-xs">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <a href={item.post_url} target="_blank" rel="noreferrer"
                        className="block truncate text-xs text-fuchsia-400 hover:text-fuchsia-300 transition-colors"
                        title={item.post_url}>
                        {item.post_url}
                      </a>
                      <span className="text-[10px] text-slate-600 font-mono">ID: {item.post_id}</span>
                    </td>
                    <td className="px-5 py-3.5 max-w-[220px]">
                      <p className="text-sm text-slate-300 leading-snug">
                        {truncate(item.comment_content)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/60 to-indigo-500/60 text-[10px] font-bold text-white">
                          {item.account_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-slate-300">{item.account_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={item.status} /></td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 tabular-nums whitespace-nowrap">
                      {fmtDate(item.commented_at ?? item.created_at)}
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

      {detailItem && <DetailDrawer item={detailItem} onClose={() => setDetailItem(null)} />}
    </>
  );
}