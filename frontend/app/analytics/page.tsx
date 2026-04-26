import type { Metadata } from "next";
import AnalyticsChart from "@/components/AnalyticsChart";

export const metadata: Metadata = { title: "Phân tích" };

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Phân tích</h2>
        <p className="mt-1 text-sm text-slate-400">Thống kê hiệu suất chiến dịch.</p>
      </div>
      <AnalyticsChart />
    </div>
  );
}
