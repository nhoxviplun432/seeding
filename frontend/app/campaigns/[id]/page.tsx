import type { Metadata } from "next";

export const metadata: Metadata = { title: "Chi tiết chiến dịch" };

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Chiến dịch #{params.id}</h2>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
      </div>
    </div>
  );
}
