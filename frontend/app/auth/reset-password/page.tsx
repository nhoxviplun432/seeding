"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/auth";
import { ErrorMsg } from "@/components/package/ErrorMsg";

function fieldClass(hasError: boolean) {
  return [
    "w-full rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-white",
    "placeholder:text-gray-600 focus:outline-none focus:ring-1 transition-colors",
    hasError
      ? "border-red-500/60 focus:ring-red-500/40"
      : "border-white/10 focus:ring-fuchsia-500/50",
  ].join(" ");
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
    </svg>
  );
}

type Fields = { current: boolean; password: boolean; confirm: boolean };

export default function ResetPasswordPage() {
  const router = useRouter();

  const [current,  setCurrent]  = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");

  const [show,    setShow]    = useState<{ current: boolean; password: boolean; confirm: boolean }>({ current: false, password: false, confirm: false });
  const [touched, setTouched] = useState<Partial<Fields>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof Fields, string>> = {};
    if (touched.current  && !current)  e.current  = "Vui lòng nhập mật khẩu hiện tại.";
    if (touched.password) {
      if (!password)             e.password = "Vui lòng nhập mật khẩu mới.";
      else if (password.length < 6) e.password = "Mật khẩu ít nhất 6 ký tự.";
      else if (password === current) e.password = "Mật khẩu mới phải khác mật khẩu hiện tại.";
    }
    if (touched.confirm) {
      if (!confirm)              e.confirm = "Vui lòng xác nhận mật khẩu mới.";
      else if (confirm !== password) e.confirm = "Mật khẩu xác nhận không khớp.";
    }
    return e;
  }, [current, password, confirm, touched]);

  function validate() {
    const e: Partial<Record<keyof Fields, string>> = {};
    if (!current)  e.current  = "Vui lòng nhập mật khẩu hiện tại.";
    if (!password)             e.password = "Vui lòng nhập mật khẩu mới.";
    else if (password.length < 6) e.password = "Mật khẩu ít nhất 6 ký tự.";
    else if (password === current) e.password = "Mật khẩu mới phải khác mật khẩu hiện tại.";
    if (!confirm)              e.confirm = "Vui lòng xác nhận mật khẩu mới.";
    else if (confirm !== password) e.confirm = "Mật khẩu xác nhận không khớp.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ current: true, password: true, confirm: true });
    setApiError(null);
    if (Object.keys(validate()).length > 0) return;

    setLoading(true);
    try {
      await resetPassword(current, password, confirm);
      setDone(true);
      setTimeout(() => router.replace("/auth/login"), 2500);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Đổi mật khẩu thất bại.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <CheckIcon />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Đổi mật khẩu thành công</h2>
          <p className="text-sm text-gray-400">Đang chuyển hướng đến trang đăng nhập…</p>
        </div>
        <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-2">
          <div className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 animate-[shrink_2.5s_linear_forwards]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Đổi mật khẩu</h2>
      <p className="text-sm text-gray-400 mb-6">Nhập mật khẩu hiện tại để xác nhận danh tính</p>

      {apiError && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Current password */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Mật khẩu hiện tại</label>
          <div className="relative">
            <input
              type={show.current ? "text" : "password"}
              value={current}
              placeholder="••••••••"
              onChange={e => setCurrent(e.target.value)}
              onBlur={() => setTouched(p => ({ ...p, current: true }))}
              className={`${fieldClass(!!errors.current)} pr-10`}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setShow(s => ({ ...s, current: !s.current }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              <EyeIcon open={show.current} />
            </button>
          </div>
          <ErrorMsg msg={errors.current} />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[10px] text-gray-600 uppercase tracking-widest">Mật khẩu mới</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* New password */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Mật khẩu mới</label>
          <div className="relative">
            <input
              type={show.password ? "text" : "password"}
              value={password}
              placeholder="Tối thiểu 6 ký tự"
              onChange={e => setPassword(e.target.value)}
              onBlur={() => setTouched(p => ({ ...p, password: true }))}
              className={`${fieldClass(!!errors.password)} pr-10`}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setShow(s => ({ ...s, password: !s.password }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              <EyeIcon open={show.password} />
            </button>
          </div>
          <ErrorMsg msg={errors.password} />
        </div>

        {/* Confirm */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Xác nhận mật khẩu mới</label>
          <div className="relative">
            <input
              type={show.confirm ? "text" : "password"}
              value={confirm}
              placeholder="Nhập lại mật khẩu mới"
              onChange={e => setConfirm(e.target.value)}
              onBlur={() => setTouched(p => ({ ...p, confirm: true }))}
              className={`${fieldClass(!!errors.confirm)} pr-10`}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              <EyeIcon open={show.confirm} />
            </button>
          </div>
          <ErrorMsg msg={errors.confirm} />
        </div>

        <button type="submit" disabled={loading}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500
                     text-sm font-semibold text-white hover:opacity-90 transition-opacity mt-2
                     disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <><Spinner />Đang cập nhật…</> : "Đổi mật khẩu"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-gray-500">
        <Link href="/auth/login"
          className="text-fuchsia-400 hover:text-fuchsia-300 font-medium transition-colors">
          ← Quay lại đăng nhập
        </Link>
      </p>
    </>
  );
}
