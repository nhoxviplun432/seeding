"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] select-none">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[400px] rounded-full bg-fuchsia-700/10 blur-[100px]" />
      </div>

      <div className="relative flex flex-col items-center gap-6 text-center max-w-md">
        {/* 404 number */}
        <p className="text-[96px] font-extrabold leading-none tracking-tight bg-gradient-to-br from-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
          404
        </p>

        {/* Icon */}
        <div className="h-16 w-16 rounded-2xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center -mt-2">
          <svg className="h-7 w-7 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>

        <div>
          <h1 className="text-xl font-bold text-white mb-2">Trang không tồn tại</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <Link
            href="/"
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500
                       text-sm font-semibold text-white hover:opacity-90 transition-opacity
                       flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/>
            </svg>
            Về trang chủ
          </Link>
          <button
            onClick={() => history.back()}
            className="h-10 px-5 rounded-xl border border-white/[0.08] bg-white/[0.03]
                       text-sm font-medium text-slate-300 hover:bg-white/[0.06] transition-colors"
          >
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
