"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PLACEHOLDER = [
  { date: "T2", views: 120 },
  { date: "T3", views: 280 },
  { date: "T4", views: 190 },
  { date: "T5", views: 420 },
  { date: "T6", views: 380 },
  { date: "T7", views: 510 },
  { date: "CN", views: 340 },
];

export default function AnalyticsChart() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <p className="mb-4 text-sm font-semibold text-white">Lượt xem theo ngày</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={PLACEHOLDER}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Line type="monotone" dataKey="views" stroke="#a78bfa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
