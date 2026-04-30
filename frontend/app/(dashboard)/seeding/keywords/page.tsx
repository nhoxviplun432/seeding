"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { keywordAPI, type CreateKeywordPayload, type UpdateKeywordPayload } from "@/lib/api";
import type { SeedKeyword, KeywordTarget } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const TARGET_META: Record<KeywordTarget, { label: string; cls: string }> = {
  group_search:  { label: "Tìm nhóm",   cls: "bg-indigo-500/20  text-indigo-300  border-indigo-500/30"  },
  post_comment:  { label: "Bình luận",   cls: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30" },
  group_join:    { label: "Vào nhóm",    cls: "bg-sky-500/20     text-sky-300     border-sky-500/30"     },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
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

function TargetBadge({ target }: { target: KeywordTarget }) {
  const m = TARGET_META[target];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

function ActiveDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-slate-500"}`} />
      <span className={`text-xs ${active ? "text-emerald-400" : "text-slate-500"}`}>
        {active ? "Hoạt động" : "Tắt"}
      </span>
    </span>
  );
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

// ── Keyword Form Modal ─────────────────────────────────────────────────────────
interface KwForm { keyword: string; target: KeywordTarget; is_active: boolean; }

function KeywordFormModal({ item, onClose, onDone }: {
  item: SeedKeyword | null;
  onClose: () => void;
  onDone: (k: SeedKeyword) => void;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState<KwForm>({
    keyword:   item?.keyword   ?? "",
    target:    item?.target    ?? "group_search",
    is_active: item?.is_active ?? true,
  });
  const [touched, setTouched] = useState<Partial<Record<keyof KwForm, boolean>>>({});
  const [saving,  setSaving]  = useState(false);
  const [apiErr,  setApiErr]  = useState<string | null>(null);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof KwForm, string>> = {};
    if (touched.keyword && !form.keyword.trim())
      e.keyword = "Từ khóa không được trống.";
    if (touched.keyword && form.keyword.trim().length < 2)
      e.keyword = "Từ khóa ít nhất 2 ký tự.";
    return e;
  }, [form, touched]);

  function set<K extends keyof KwForm>(k: K, v: KwForm[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ keyword: true });
    setApiErr(null);
    if (!form.keyword.trim() || form.keyword.trim().length < 2) return;
    setSaving(true);
    try {
      let result: SeedKeyword;
      if (isEdit) {
        const payload: UpdateKeywordPayload = { keyword: form.keyword.trim(), target: form.target, is_active: form.is_active };
        result = await keywordAPI.update(item!.id, payload);
      } else {
        const payload: CreateKeywordPayload = { keyword: form.keyword.trim(), target: form.target, is_active: form.is_active };
        result = await keywordAPI.create(payload);
      }
      onDone(result);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Sửa từ khóa" : "Thêm từ khóa"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {apiErr && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{apiErr}</div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Từ khóa <span className="text-red-400">*</span>
          </label>
          <input
            value={form.keyword}
            placeholder="vd: mua bán nhà đất"
            onChange={e => set("keyword", e.target.value)}
            onBlur={() => setTouched(p => ({ ...p, keyword: true }))}
            className={fieldCls(!!errors.keyword)}
          />
          {errors.keyword && <p className="mt-1 text-xs text-red-400">{errors.keyword}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Mục tiêu</label>
            <select value={form.target} onChange={e => set("target", e.target.value as KeywordTarget)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
              {(Object.keys(TARGET_META) as KeywordTarget[]).map(t => (
                <option key={t} value={t} className="bg-slate-900">{TARGET_META[t].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Trạng thái</label>
            <select value={form.is_active ? "on" : "off"} onChange={e => set("is_active", e.target.value === "on")}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
              <option value="on"  className="bg-slate-900">Hoạt động</option>
              <option value="off" className="bg-slate-900">Tắt</option>
            </select>
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
            {isEdit ? "Lưu thay đổi" : "Thêm từ khóa"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────
function DeleteModal({ item, onClose, onDone }: {
  item: SeedKeyword; onClose: () => void; onDone: (id: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [apiErr,   setApiErr]   = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setApiErr(null);
    try {
      await keywordAPI.delete(item.id);
      onDone(item.id);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      setDeleting(false);
    }
  }

  return (
    <Modal title="Xóa từ khóa" onClose={onClose}>
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
            <p className="text-sm font-medium text-red-300">Xác nhận xóa</p>
            <p className="mt-1 text-xs text-slate-400">
              Từ khóa <span className="font-semibold text-white">"{item.keyword}"</span> sẽ bị xóa và ngừng automation.
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
            {deleting && <Spinner sm />}
            Xóa từ khóa
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function KeywordsPage() {
  const [items,      setItems]      = useState<SeedKeyword[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [apiErr,     setApiErr]     = useState<string | null>(null);

  const [search,       setSearch]       = useState("");
  const [filterTarget, setFilterTarget] = useState<KeywordTarget | "all">("all");
  const [filterActive, setFilterActive] = useState<boolean | "all">("all");
  const [pageSize,     setPageSize]     = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);

  const [addOpen,     setAddOpen]     = useState(false);
  const [editItem,    setEditItem]    = useState<SeedKeyword | null>(null);
  const [deleteItem,  setDeleteItem]  = useState<SeedKeyword | null>(null);

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
      const res = await keywordAPI.list({
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        target: filterTarget,
        is_active: filterActive,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filterTarget, filterActive]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function goPage(n: number) { setPage(Math.max(1, Math.min(n, totalPages))); }

  function onCreated(k: SeedKeyword) {
    setAddOpen(false);
    setTotal(t => t + 1);
    setItems(prev => [k, ...prev.slice(0, pageSize - 1)]);
  }

  function onUpdated(k: SeedKeyword) {
    setEditItem(null);
    setItems(prev => prev.map(x => x.id === k.id ? k : x));
  }

  function onDeleted(id: number) {
    setDeleteItem(null);
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
            <h2 className="text-lg font-semibold text-white">Từ khóa Automation</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {loading ? "Đang tải…" : `${total} từ khóa đã cấu hình`}
            </p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity sm:self-auto">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm từ khóa
          </button>
        </div>

        {/* Target cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(Object.keys(TARGET_META) as KeywordTarget[]).map(t => (
            <button key={t}
              onClick={() => { setFilterTarget(t); setPage(1); }}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                filterTarget === t
                  ? "border-fuchsia-500/40 bg-fuchsia-500/10"
                  : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
              }`}>
              <p className="text-xs text-slate-400">{TARGET_META[t].label}</p>
              <p className="mt-1 text-xl font-bold text-white">
                {loading ? "—" : items.filter(i => i.target === t).length}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-600">{t}</p>
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
              placeholder="Tìm từ khóa…"
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors"
            />
          </div>
          <select
            value={filterTarget}
            onChange={e => { setFilterTarget(e.target.value as KeywordTarget | "all"); setPage(1); }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
            <option value="all" className="bg-slate-900">Tất cả mục tiêu</option>
            {(Object.keys(TARGET_META) as KeywordTarget[]).map(t => (
              <option key={t} value={t} className="bg-slate-900">{TARGET_META[t].label}</option>
            ))}
          </select>
          <select
            value={filterActive === "all" ? "all" : filterActive ? "on" : "off"}
            onChange={e => setFilterActive(e.target.value === "all" ? "all" : e.target.value === "on")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
            <option value="all" className="bg-slate-900">Tất cả trạng thái</option>
            <option value="on"  className="bg-slate-900">Hoạt động</option>
            <option value="off" className="bg-slate-900">Tắt</option>
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
                  <th className="px-5 py-3 text-left font-medium">Từ khóa</th>
                  <th className="px-5 py-3 text-left font-medium">Mục tiêu</th>
                  <th className="px-5 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-5 py-3 text-left font-medium">Đã quét</th>
                  <th className="px-5 py-3 text-left font-medium">Lần cuối</th>
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
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-500">
                        <svg className="h-10 w-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        <p className="text-sm">Chưa có từ khóa nào. Thêm từ khóa để bắt đầu automation.</p>
                        <button onClick={() => setAddOpen(true)}
                          className="rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 px-4 py-1.5 text-xs text-fuchsia-300 hover:bg-fuchsia-500/30 transition-colors">
                          + Thêm từ khóa đầu tiên
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : items.map((item, idx) => (
                  <tr key={item.id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 tabular-nums text-xs">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                          <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-white">{item.keyword}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><TargetBadge target={item.target} /></td>
                    <td className="px-5 py-3.5"><ActiveDot active={item.is_active} /></td>
                    <td className="px-5 py-3.5">
                      <span className="tabular-nums text-sm text-white font-medium">
                        {item.match_count.toLocaleString("vi-VN")}
                      </span>
                      <span className="ml-1 text-xs text-slate-500">lần</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 tabular-nums whitespace-nowrap">
                      {fmtDate(item.last_scanned_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditItem(item)} title="Sửa"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-fuchsia-300 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeleteItem(item)} title="Xóa"
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

      {addOpen    && <KeywordFormModal item={null}      onClose={() => setAddOpen(false)}    onDone={onCreated} />}
      {editItem   && <KeywordFormModal item={editItem}  onClose={() => setEditItem(null)}    onDone={onUpdated} />}
      {deleteItem && <DeleteModal      item={deleteItem} onClose={() => setDeleteItem(null)} onDone={onDeleted} />}
    </>
  );
}