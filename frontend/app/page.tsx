import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

const STATS = [
  { label: "Tổng tra cứu",      value: "2,400+", change: "+12%"  },
  { label: "Hôm nay",           value: "38",      change: "+5%"   },
  { label: "Người dùng mới",    value: "124",     change: "+8%"   },
  { label: "Tỉ lệ hoàn thành",  value: "94%",     change: "+2%"   },
] as const;

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Tổng quan</h2>
        <p className="mt-1 text-sm text-slate-400">Dữ liệu hoạt động của hệ thống.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map(({ label, value, change }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <p className="text-xs font-semibold text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs font-medium text-emerald-400">{change} so với tuần trước</p>
          </div>
        ))}
      </div>

      {/* Placeholder table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm font-semibold text-white">Tra cứu gần nhất</p>
        <p className="mt-2 text-sm text-slate-500">Chưa có dữ liệu — sẽ kết nối Laravel API.</p>
      </div>
    </div>
  );
}
