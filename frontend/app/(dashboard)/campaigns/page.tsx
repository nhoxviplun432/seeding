import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Chiến dịch" };

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Chiến dịch</h2>
        <Link
          href="/campaigns/new"
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          + Tạo mới
        </Link>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-slate-500">Chưa có chiến dịch nào.</p>
      </div>
    </div>
  );
}
