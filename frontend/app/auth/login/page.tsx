"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";
import { ErrorMsg } from "@/components/package/ErrorMsg";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

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

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [touched, setTouched]   = useState<{ email?: boolean; password?: boolean }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const errors = useMemo(() => {
    const e: { email?: string; password?: string } = {};
    if (touched.email) {
      if (!email.trim()) e.email = "Vui lòng nhập email.";
      else if (!isValidEmail(email)) e.email = "Email không hợp lệ.";
    }
    if (touched.password) {
      if (!password) e.password = "Vui lòng nhập mật khẩu.";
      else if (password.length < 6) e.password = "Mật khẩu ít nhất 6 ký tự.";
    }
    return e;
  }, [email, password, touched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setApiError(null);

    const e2: typeof errors = {};
    if (!email.trim()) e2.email = "Vui lòng nhập email.";
    else if (!isValidEmail(email)) e2.email = "Email không hợp lệ.";
    if (!password) e2.password = "Vui lòng nhập mật khẩu.";
    else if (password.length < 6) e2.password = "Mật khẩu ít nhất 6 ký tự.";
    if (Object.keys(e2).length > 0) return;

    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Đăng nhập</h2>
      <p className="text-sm text-gray-400 mb-6">Chào mừng bạn quay trở lại</p>

      {apiError && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
          <input
            type="email" value={email} placeholder="you@example.com"
            onChange={e => setEmail(e.target.value)}
            onBlur={() => setTouched(p => ({ ...p, email: true }))}
            className={fieldClass(!!errors.email)}
          />
          <ErrorMsg msg={errors.email} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Mật khẩu</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"} value={password} placeholder="••••••••"
              onChange={e => setPassword(e.target.value)}
              onBlur={() => setTouched(p => ({ ...p, password: true }))}
              className={`${fieldClass(!!errors.password)} pr-10`}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              <EyeIcon open={showPw} />
            </button>
          </div>
          <ErrorMsg msg={errors.password} />
        </div>

        <div className="flex justify-end">
          <Link href="/auth/reset-password"
            className="text-xs text-fuchsia-400 hover:text-fuchsia-300 transition-colors">
            Quên mật khẩu?
          </Link>
        </div>

        <button type="submit" disabled={loading}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500
                     text-sm font-semibold text-white hover:opacity-90 transition-opacity
                     disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <><Spinner />Đang đăng nhập…</> : "Đăng nhập"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-gray-500">hoặc</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <button type="button"
        className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-white/10
                   bg-white/5 text-sm font-medium text-white hover:bg-white/10 transition-colors">
        <GoogleIcon />Tiếp tục với Google
      </button>

      <p className="mt-5 text-center text-xs text-gray-500">
        Chưa có tài khoản?{" "}
        <Link href="/auth/register"
          className="text-fuchsia-400 hover:text-fuchsia-300 font-medium transition-colors">
          Đăng ký ngay
        </Link>
      </p>
    </>
  );
}
