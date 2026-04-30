"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { postAPI } from "@/lib/api";
import type {
  SeedPost, PostStatus, PostTarget, AITone,
  CreatePostPayload, UpdatePostPayload,
} from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const STATUS_META: Record<PostStatus, { label: string; cls: string; dot: string }> = {
  draft:     { label: "Nháp",       cls: "bg-slate-500/20  text-slate-300  border-slate-500/30",   dot: "bg-slate-400"   },
  scheduled: { label: "Đã lên lịch",cls: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",  dot: "bg-indigo-400"  },
  running:   { label: "Đang chạy",  cls: "bg-sky-500/20    text-sky-300    border-sky-500/30",     dot: "bg-sky-400 animate-pulse" },
  success:   { label: "Thành công", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  failed:    { label: "Thất bại",   cls: "bg-red-500/20    text-red-300    border-red-500/30",     dot: "bg-red-400"     },
  paused:    { label: "Tạm dừng",   cls: "bg-amber-500/20  text-amber-300  border-amber-500/30",   dot: "bg-amber-400"   },
};

const TARGET_META: Record<PostTarget, { label: string; cls: string; icon: string }> = {
  profile: { label: "Trang cá nhân", cls: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  group:   { label: "Nhóm",          cls: "bg-violet-500/20  text-violet-300  border-violet-500/30",  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
};

const AI_TONES: { value: AITone; label: string; desc: string }[] = [
  { value: "neutral",      label: "Trung lập",      desc: "Khách quan, cân bằng"      },
  { value: "friendly",     label: "Thân thiện",     desc: "Gần gũi, dễ mến"           },
  { value: "professional", label: "Chuyên nghiệp",  desc: "Trang trọng, tin cậy"      },
  { value: "persuasive",   label: "Thuyết phục",    desc: "Kêu gọi hành động"         },
  { value: "humorous",     label: "Hài hước",       desc: "Vui vẻ, tạo tương tác"     },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function fieldCls(err?: boolean) {
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

function StatusBadge({ status }: { status: PostStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function TargetBadge({ target }: { target: PostTarget }) {
  const m = TARGET_META[target];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={m.icon} />
      </svg>
      {m.label}
    </span>
  );
}

function ProgressBar({ success, fail, total }: { success: number; fail: number; total: number }) {
  if (total === 0) return <span className="text-xs text-slate-600">—</span>;
  const sp = Math.round((success / total) * 100);
  const fp = Math.round((fail / total) * 100);
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full flex">
          <div className="bg-emerald-500 transition-all" style={{ width: `${sp}%` }} />
          <div className="bg-red-500 transition-all"     style={{ width: `${fp}%` }} />
        </div>
      </div>
      <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">{success}/{total}</span>
    </div>
  );
}

// ── Modal shell ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 shrink-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── AI Tone Picker ─────────────────────────────────────────────────────────────
function TonePicker({ value, onChange }: { value: AITone; onChange: (t: AITone) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {AI_TONES.map(t => (
        <button key={t.value} type="button" onClick={() => onChange(t.value)}
          className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-colors ${
            value === t.value
              ? "border-fuchsia-500/50 bg-fuchsia-500/10"
              : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
          }`}>
          <span className={`text-xs font-medium ${value === t.value ? "text-fuchsia-300" : "text-white"}`}>
            {t.label}
          </span>
          <span className="text-[10px] text-slate-500 leading-tight">{t.desc}</span>
        </button>
      ))}
    </div>
  );
}

// ── Post Form Modal ────────────────────────────────────────────────────────────
interface PostForm {
  title: string;
  content: string;
  ai_tone: AITone;
  target: PostTarget;
  target_ids_raw: string;
  account_id: string;
  scheduled_at: string;
}

const EMPTY_FORM: PostForm = {
  title: "", content: "", ai_tone: "friendly",
  target: "profile", target_ids_raw: "",
  account_id: "", scheduled_at: "",
};

function PostFormModal({ post, onClose, onDone }: {
  post: SeedPost | null;
  onClose: () => void;
  onDone: (p: SeedPost) => void;
}) {
  const isEdit = !!post;
  const [form, setForm] = useState<PostForm>(post ? {
    title:          post.title,
    content:        post.content,
    ai_tone:        post.ai_tone,
    target:         post.target,
    target_ids_raw: post.target_ids.join("\n"),
    account_id:     String(post.account_id),
    scheduled_at:   post.scheduled_at?.slice(0, 16) ?? "",
  } : EMPTY_FORM);

  const [touched,   setTouched]   = useState<Partial<Record<keyof PostForm, boolean>>>({});
  const [saving,    setSaving]    = useState(false);
  const [apiErr,    setApiErr]    = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof PostForm, string>> = {};
    if (touched.title && !form.title.trim())
      e.title = "Tiêu đề không được trống.";
    if (touched.content && form.content.trim().length < 10)
      e.content = "Nội dung ít nhất 10 ký tự.";
    if (touched.account_id && !form.account_id)
      e.account_id = "Chọn tài khoản đăng.";
    return e;
  }, [form, touched]);

  function set<K extends keyof PostForm>(k: K, v: PostForm[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  function touchAll() {
    setTouched({ title: true, content: true, account_id: true });
  }

  async function handleGenerate() {
    if (!form.title.trim()) {
      setTouched(p => ({ ...p, title: true }));
      return;
    }
    setAiLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    const samples: Record<AITone, string> = {
      neutral:      `${form.title}\n\nChúng tôi muốn chia sẻ với bạn những thông tin hữu ích về chủ đề này. Hãy tham khảo và để lại ý kiến của bạn bên dưới.`,
      friendly:     `${form.title} 🌟\n\nBạn ơi, hôm nay mình muốn chia sẻ một điều thú vị! Đây là nội dung mà mình nghĩ sẽ rất có ích cho bạn. Cùng khám phá nhé! 💪`,
      professional: `${form.title}\n\nTheo nghiên cứu và kinh nghiệm thực tiễn, đây là những thông tin quan trọng mà các chuyên gia trong ngành đánh giá cao. Chúng tôi cam kết mang đến giá trị thực sự cho bạn.`,
      persuasive:   `${form.title} — Đừng bỏ lỡ! ⚡\n\nHàng nghìn người đã thực hiện điều này và thay đổi cuộc sống của họ. Bạn có sẵn sàng bước vào hành trình tương tự? Hành động ngay hôm nay — cơ hội không chờ đợi ai!`,
      humorous:     `${form.title} 😄\n\nNghiêm túc mà nói... không nghiêm túc lắm đâu! Nhưng thực ra nội dung này CỰC KỲ hữu ích. Đọc xong bạn sẽ thấy mình thông minh hẳn ra. Cam kết không lừa! 🤣`,
    };
    set("content", samples[form.ai_tone]);
    setAiLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    touchAll();
    setApiErr(null);
    if (!form.title.trim() || form.content.trim().length < 10 || !form.account_id) return;

    const targetIds = form.target_ids_raw
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      let result: SeedPost;
      if (isEdit) {
        const payload: UpdatePostPayload = {
          title:        form.title.trim(),
          content:      form.content.trim(),
          ai_tone:      form.ai_tone,
          target:       form.target,
          target_ids:   targetIds,
          scheduled_at: form.scheduled_at || null,
        };
        result = await postAPI.update(post!.id, payload);
      } else {
        const payload: CreatePostPayload = {
          title:        form.title.trim(),
          content:      form.content.trim(),
          ai_tone:      form.ai_tone,
          target:       form.target,
          target_ids:   targetIds,
          account_id:   Number(form.account_id),
          scheduled_at: form.scheduled_at || null,
        };
        result = await postAPI.create(payload);
      }
      onDone(result);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Chỉnh sửa bài đăng" : "Tạo bài đăng tự động"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {apiErr && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{apiErr}</div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Tiêu đề / Chủ đề <span className="text-red-400">*</span>
          </label>
          <input value={form.title} placeholder="vd: Mẹo tiết kiệm chi phí marketing hiệu quả"
            onChange={e => set("title", e.target.value)}
            onBlur={() => setTouched(p => ({ ...p, title: true }))}
            className={fieldCls(!!errors.title)} />
          {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
        </div>

        {/* AI Tone */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Giọng điệu AI
          </label>
          <TonePicker value={form.ai_tone} onChange={v => set("ai_tone", v)} />
        </div>

        {/* Content + Generate */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-400">
              Nội dung bài đăng <span className="text-red-400">*</span>
            </label>
            <button type="button" onClick={handleGenerate} disabled={aiLoading}
              className="flex items-center gap-1.5 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium text-fuchsia-300 hover:bg-fuchsia-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {aiLoading ? <Spinner sm /> : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {aiLoading ? "Đang tạo…" : "Tạo bằng AI"}
            </button>
          </div>
          <textarea value={form.content} rows={6}
            placeholder="Nhập nội dung hoặc nhấn 'Tạo bằng AI' để generate tự động…"
            onChange={e => set("content", e.target.value)}
            onBlur={() => setTouched(p => ({ ...p, content: true }))}
            className={`${fieldCls(!!errors.content)} resize-none leading-relaxed`} />
          <div className="flex items-center justify-between mt-1">
            {errors.content
              ? <p className="text-xs text-red-400">{errors.content}</p>
              : <span />}
            <span className="text-[11px] text-slate-600">{form.content.length} ký tự</span>
          </div>
        </div>

        {/* Target + Account */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Đăng lên</label>
            <div className="grid grid-cols-2 gap-2">
              {(["profile", "group"] as PostTarget[]).map(t => (
                <button key={t} type="button" onClick={() => set("target", t)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                    form.target === t
                      ? "border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-300"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/[0.08] hover:text-white"
                  }`}>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={TARGET_META[t].icon} />
                  </svg>
                  {TARGET_META[t].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              ID Tài khoản <span className="text-red-400">*</span>
            </label>
            <input value={form.account_id} placeholder="vd: 42"
              type="number" min="1"
              onChange={e => set("account_id", e.target.value)}
              onBlur={() => setTouched(p => ({ ...p, account_id: true }))}
              className={fieldCls(!!errors.account_id)} />
            {errors.account_id && <p className="mt-1 text-xs text-red-400">{errors.account_id}</p>}
          </div>
        </div>

        {/* Target IDs */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            {form.target === "group" ? "ID nhóm" : "ID trang cá nhân"}{" "}
            <span className="text-slate-600">(mỗi dòng hoặc cách nhau bằng dấu phẩy)</span>
          </label>
          <textarea value={form.target_ids_raw} rows={3}
            placeholder={form.target === "group"
              ? "123456789\n987654321\n…"
              : "Để trống = đăng lên trang cá nhân của tài khoản"}
            onChange={e => set("target_ids_raw", e.target.value)}
            className={`${fieldCls()} resize-none font-mono text-xs`} />
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Lên lịch đăng{" "}
            <span className="text-slate-600">(để trống = đăng ngay)</span>
          </label>
          <input type="datetime-local" value={form.scheduled_at}
            onChange={e => set("scheduled_at", e.target.value)}
            className={`${fieldCls()} [color-scheme:dark]`} />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
            {saving && <Spinner sm />}
            {isEdit ? "Lưu thay đổi" : "Tạo bài đăng"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete Modal ───────────────────────────────────────────────────────────────
function DeleteModal({ post, onClose, onDone }: {
  post: SeedPost; onClose: () => void; onDone: (id: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [apiErr,   setApiErr]   = useState<string | null>(null);

  async function handle() {
    setDeleting(true);
    try {
      await postAPI.delete(post.id);
      onDone(post.id);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      setDeleting(false);
    }
  }

  return (
    <Modal title="Xóa bài đăng" onClose={onClose}>
      <div className="space-y-4">
        {apiErr && <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{apiErr}</div>}
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <svg className="h-5 w-5 shrink-0 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-300">Xác nhận xóa</p>
            <p className="mt-1 text-xs text-slate-400">
              Bài đăng <span className="font-semibold text-white">"{post.title}"</span> sẽ bị xóa vĩnh viễn.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            Hủy
          </button>
          <button onClick={handle} disabled={deleting}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {deleting && <Spinner sm />}Xóa bài đăng
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Detail Drawer ──────────────────────────────────────────────────────────────
function DetailDrawer({ post, onClose, onRun, onPause }: {
  post: SeedPost; onClose: () => void;
  onRun: (id: number) => void; onPause: (id: number) => void;
}) {
  const [acting, setActing] = useState(false);

  async function handleRun() {
    setActing(true);
    try { await postAPI.run(post.id); onRun(post.id); }
    catch { /* swallow, parent refreshes */ }
    finally { setActing(false); }
  }

  async function handlePause() {
    setActing(true);
    try { await postAPI.pause(post.id); onPause(post.id); }
    catch { }
    finally { setActing(false); }
  }

  const canRun   = ["draft", "paused", "failed"].includes(post.status);
  const canPause = post.status === "running";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mt-4 w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 shrink-0">
          <h3 className="text-sm font-semibold text-white">Chi tiết bài đăng</h3>
          <button onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Status + actions */}
          <div className="flex items-center justify-between">
            <StatusBadge status={post.status} />
            <div className="flex gap-2">
              {canRun && (
                <button onClick={handleRun} disabled={acting}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                  {acting ? <Spinner sm /> : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  Chạy
                </button>
              )}
              {canPause && (
                <button onClick={handlePause} disabled={acting}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                  {acting ? <Spinner sm /> : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  Dừng
                </button>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Tiến độ</span>
              <span className="text-white">{post.success_count} / {post.post_count}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full flex">
                <div className="bg-emerald-500 transition-all" style={{ width: `${post.post_count ? (post.success_count / post.post_count) * 100 : 0}%` }} />
                <div className="bg-red-500   transition-all" style={{ width: `${post.post_count ? (post.fail_count    / post.post_count) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-emerald-400">{post.success_count} thành công</span>
              <span className="text-red-400">{post.fail_count} thất bại</span>
            </div>
          </div>

          {/* Meta */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2.5">
            {[
              { label: "Tài khoản",   value: post.account_name },
              { label: "Đăng lên",    value: <TargetBadge target={post.target} /> },
              { label: "Giọng AI",    value: AI_TONES.find(t => t.value === post.ai_tone)?.label ?? post.ai_tone },
              { label: "Lên lịch",   value: fmtDate(post.scheduled_at) },
              { label: "Đăng lúc",   value: fmtDate(post.published_at) },
              { label: "Tạo lúc",    value: fmtDate(post.created_at)   },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-xs gap-3">
                <span className="text-slate-400 shrink-0">{label}</span>
                <span className="text-white text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Target IDs */}
          {post.target_ids.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1.5">Target IDs ({post.target_ids.length})</p>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs text-slate-300 space-y-0.5 max-h-28 overflow-y-auto">
                {post.target_ids.map(id => <div key={id}>{id}</div>)}
              </div>
            </div>
          )}

          {/* Content preview */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1.5">Nội dung</p>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
              {post.content}
            </div>
          </div>

          {/* Error */}
          {post.error_msg && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-xs font-medium text-red-400 mb-1">Lỗi</p>
              <p className="text-xs text-slate-300">{post.error_msg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PostsPage() {
  const [items,      setItems]      = useState<SeedPost[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [apiErr,     setApiErr]     = useState<string | null>(null);

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<PostStatus | "all">("all");
  const [filterTarget, setFilterTarget] = useState<PostTarget | "all">("all");
  const [pageSize,     setPageSize]     = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);

  const [addOpen,     setAddOpen]     = useState(false);
  const [editItem,    setEditItem]    = useState<SeedPost | null>(null);
  const [deleteItem,  setDeleteItem]  = useState<SeedPost | null>(null);
  const [detailItem,  setDetailItem]  = useState<SeedPost | null>(null);

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
      const res = await postAPI.list({
        page, page_size: pageSize,
        search: debouncedSearch || undefined,
        status: filterStatus,
        target: filterTarget,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filterStatus, filterTarget]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function goPage(n: number) { setPage(Math.max(1, Math.min(n, totalPages))); }

  function onCreated(p: SeedPost) {
    setAddOpen(false);
    setItems(prev => [p, ...prev.slice(0, pageSize - 1)]);
    setTotal(t => t + 1);
  }
  function onUpdated(p: SeedPost) {
    setEditItem(null);
    setItems(prev => prev.map(x => x.id === p.id ? p : x));
    if (detailItem?.id === p.id) setDetailItem(p);
  }
  function onDeleted(id: number) {
    setDeleteItem(null);
    setDetailItem(null);
    setItems(prev => prev.filter(x => x.id !== id));
    setTotal(t => Math.max(0, t - 1));
  }
  function onStatusChange(id: number, status: PostStatus) {
    setItems(prev => prev.map(x => x.id === id ? { ...x, status } : x));
    if (detailItem?.id === id) setDetailItem(p => p ? { ...p, status } : p);
  }

  const statusCounts = useMemo(() =>
    (Object.keys(STATUS_META) as PostStatus[]).reduce((acc, s) => {
      acc[s] = items.filter(i => i.status === s).length;
      return acc;
    }, {} as Record<PostStatus, number>),
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Đăng bài Automation</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {loading ? "Đang tải…" : `${total} bài đăng`}
            </p>
          </div>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity sm:self-auto">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tạo bài đăng
          </button>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {(Object.keys(STATUS_META) as PostStatus[]).map(s => (
            <button key={s}
              onClick={() => { setFilterStatus(s); setPage(1); }}
              className={`rounded-2xl border p-3 text-left transition-colors ${
                filterStatus === s
                  ? "border-fuchsia-500/40 bg-fuchsia-500/10"
                  : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
              }`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[s].dot.replace(" animate-pulse", "")}`} />
                <p className="text-[11px] text-slate-400 truncate">{STATUS_META[s].label}</p>
              </div>
              <p className="text-lg font-bold text-white">{loading ? "—" : statusCounts[s]}</p>
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
              placeholder="Tìm theo tiêu đề hoặc nội dung…"
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors"
            />
          </div>
          <select value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value as PostStatus | "all"); setPage(1); }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
            <option value="all" className="bg-slate-900">Tất cả trạng thái</option>
            {(Object.keys(STATUS_META) as PostStatus[]).map(s => (
              <option key={s} value={s} className="bg-slate-900">{STATUS_META[s].label}</option>
            ))}
          </select>
          <select value={filterTarget}
            onChange={e => { setFilterTarget(e.target.value as PostTarget | "all"); setPage(1); }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
            <option value="all" className="bg-slate-900">Tất cả đích</option>
            {(Object.keys(TARGET_META) as PostTarget[]).map(t => (
              <option key={t} value={t} className="bg-slate-900">{TARGET_META[t].label}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {apiErr && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            <span>{apiErr}</span>
            <button onClick={fetchData} className="ml-4 text-xs underline underline-offset-2 hover:text-red-300">Thử lại</button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="px-5 py-3 text-left font-medium">#</th>
                  <th className="px-5 py-3 text-left font-medium">Bài đăng</th>
                  <th className="px-5 py-3 text-left font-medium">Đăng lên</th>
                  <th className="px-5 py-3 text-left font-medium">Tài khoản</th>
                  <th className="px-5 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-5 py-3 text-left font-medium">Tiến độ</th>
                  <th className="px-5 py-3 text-left font-medium">Lên lịch</th>
                  <th className="px-5 py-3 text-right font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                        <Spinner /><span>Đang tải dữ liệu…</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-500">
                        <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <p className="text-sm">Chưa có bài đăng nào.</p>
                        <button onClick={() => setAddOpen(true)}
                          className="rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 px-4 py-1.5 text-xs text-fuchsia-300 hover:bg-fuchsia-500/30 transition-colors">
                          + Tạo bài đăng đầu tiên
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : items.map((item, idx) => (
                  <tr key={item.id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 tabular-nums text-xs">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-5 py-3.5 max-w-[220px]">
                      <p className="text-sm font-medium text-white truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{item.content.slice(0, 60)}…</p>
                      <span className="mt-1 inline-flex items-center rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {AI_TONES.find(t => t.value === item.ai_tone)?.label ?? item.ai_tone}
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><TargetBadge target={item.target} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/60 to-indigo-500/60 text-[10px] font-bold text-white">
                          {item.account_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-slate-300">{item.account_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={item.status} /></td>
                    <td className="px-5 py-3.5">
                      <ProgressBar success={item.success_count} fail={item.fail_count} total={item.post_count} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap tabular-nums">
                      {fmtDate(item.scheduled_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* View */}
                        <button onClick={() => setDetailItem(item)} title="Chi tiết"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-sky-300 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {/* Run / Pause inline */}
                        {["draft","paused","failed"].includes(item.status) && (
                          <button title="Chạy"
                            onClick={async () => { await postAPI.run(item.id); onStatusChange(item.id, "running"); }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        {item.status === "running" && (
                          <button title="Dừng"
                            onClick={async () => { await postAPI.pause(item.id); onStatusChange(item.id, "paused"); }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400 transition-colors">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        {/* Edit */}
                        <button onClick={() => setEditItem(item)} title="Chỉnh sửa"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-fuchsia-300 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Delete */}
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
              <span>/ trang · {total} bài đăng</span>
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

      {addOpen    && <PostFormModal post={null}    onClose={() => setAddOpen(false)}    onDone={onCreated} />}
      {editItem   && <PostFormModal post={editItem} onClose={() => setEditItem(null)}   onDone={onUpdated} />}
      {deleteItem && <DeleteModal  post={deleteItem} onClose={() => setDeleteItem(null)} onDone={onDeleted} />}
      {detailItem && (
        <DetailDrawer
          post={detailItem}
          onClose={() => setDetailItem(null)}
          onRun={id   => onStatusChange(id, "running")}
          onPause={id => onStatusChange(id, "paused")}
        />
      )}
    </>
  );
}