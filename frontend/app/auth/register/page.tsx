"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register, type AccountType } from "@/lib/auth";
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

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName]       = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [showPw, setShowPw]           = useState(false);
  const [showCPw, setShowCPw]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [apiError, setApiError]       = useState<string | null>(null);
  const [touched, setTouched]         = useState<{
    fullName?: boolean; email?: boolean; password?: boolean; confirmPw?: boolean;
  }>({});

  const errors = useMemo(() => {
    const e: { fullName?: string; email?: string; password?: string; confirmPw?: string } = {};
    if (touched.fullName) {
      const n = fullName.trim();
      if (!n) e.fullName = "Vui lòng nhập họ và tên.";
      else if (n.length < 2) e.fullName = "Họ tên ít nhất 2 ký tự.";
      else if (/[0-9!@#$%^&*()_+=[\]{};':"\\|,.<>/?]/.test(n))
        e.fullName = "Họ tên không chứa số hoặc ký tự đặc biệt.";
    }
    if (touched.email) {
      if (!email.trim()) e.email = "Vui lòng nhập email.";
      else if (!isValidEmail(email)) e.email = "Email không hợp lệ.";
    }
    if (touched.password) {
      if (!password) e.password = "Vui lòng nhập mật khẩu.";
      else if (password.length < 6) e.password = "Mật khẩu ít nhất 6 ký tự.";
    }
    if (touched.confirmPw) {
      if (!confirmPw) e.confirmPw = "Vui lòng xác nhận mật khẩu.";
      else if (confirmPw !== password) e.confirmPw = "Mật khẩu xác nhận không khớp.";
    }
    return e;
  }, [fullName, email, password, confirmPw, touched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ fullName: true, email: true, password: true, confirmPw: true });
    setApiError(null);

    const e2: typeof errors = {};
    const n = fullName.trim();
    if (!n) e2.fullName = "Vui lòng nhập họ và tên.";
    else if (n.length < 2) e2.fullName = "Họ tên ít nhất 2 ký tự.";
    if (!email.trim()) e2.email = "Vui lòng nhập email.";
    else if (!isValidEmail(email)) e2.email = "Email không hợp lệ.";
    if (!password) e2.password = "Vui lòng nhập mật khẩu.";
    else if (password.length < 6) e2.password = "Mật khẩu ít nhất 6 ký tự.";
    if (!confirmPw) e2.confirmPw = "Vui lòng xác nhận mật khẩu.";
    else if (confirmPw !== password) e2.confirmPw = "Mật khẩu xác nhận không khớp.";
    if (Object.keys(e2).length > 0) return;

    setLoading(true);
    try {
      await register(fullName.trim(), email, password, confirmPw, accountType);
      router.replace("/");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Đăng ký thất bại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Tạo tài khoản</h2>
      <p className="text-sm text-gray-400 mb-6">Mở rộng marketing từ mạng xã hội của bạn</p>

      {apiError && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Họ và tên</label>
          <input
            type="text" value={fullName} placeholder="Nguyễn Văn A"
            onChange={e => setFullName(e.target.value)}
            onBlur={() => setTouched(p => ({ ...p, fullName: true }))}
            className={fieldClass(!!errors.fullName)}
          />
          <ErrorMsg msg={errors.fullName} />
        </div>

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
              type={showPw ? "text" : "password"} value={password} placeholder="Tối thiểu 6 ký tự"
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

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Xác nhận mật khẩu</label>
          <div className="relative">
            <input
              type={showCPw ? "text" : "password"} value={confirmPw} placeholder="Nhập lại mật khẩu"
              onChange={e => setConfirmPw(e.target.value)}
              onBlur={() => setTouched(p => ({ ...p, confirmPw: true }))}
              className={`${fieldClass(!!errors.confirmPw)} pr-10`}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowCPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              <EyeIcon open={showCPw} />
            </button>
          </div>
          <ErrorMsg msg={errors.confirmPw} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Loại tài khoản</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "personal", label: "Cá nhân", desc: "Dùng cho bản thân", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
              { value: "company",  label: "Doanh nghiệp", desc: "Dùng cho nhóm/công ty", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
            ] as const).map(({ value, label, desc, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAccountType(value)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                  accountType === value
                    ? "border-fuchsia-500/50 bg-fuchsia-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className={`h-4 w-4 ${accountType === value ? "text-fuchsia-300" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                  </svg>
                  <span className={`text-sm font-medium ${accountType === value ? "text-fuchsia-300" : "text-white"}`}>{label}</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500
                     text-sm font-semibold text-white hover:opacity-90 transition-opacity
                     disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <><Spinner />Đang tạo tài khoản…</> : "Đăng ký"}
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
        <GoogleIcon />Đăng ký với Google
      </button>

      <p className="mt-5 text-center text-xs text-gray-500">
        Đã có tài khoản?{" "}
        <Link href="/auth/login"
          className="text-fuchsia-400 hover:text-fuchsia-300 font-medium transition-colors">
          Đăng nhập
        </Link>
      </p>
    </>
  );
}
