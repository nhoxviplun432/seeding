import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Videos" };

export default function VideosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Videos</h2>
        <Link
          href="/videos/new"
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          + Tải lên
        </Link>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-slate-500">Chưa có video nào.</p>
      </div>
    </div>
  );
}
