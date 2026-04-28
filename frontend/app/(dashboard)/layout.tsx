"use client";

import AdminSidebar from "@/components/dashboard/Sidebar";
import AdminHeader from "@/components/dashboard/Header";
import AuthGuard from "@/app/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-50">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-6 relative z-10">
            <div className="pointer-events-none fixed inset-0 z-[1]">
              <div className="absolute -bottom-40 -right-40 h-[320px] w-[320px] rounded-full bg-indigo-500/20 blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.1]"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(255,255,255,.2) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,.2) 1px, transparent 1px)
                  `,
                  backgroundSize: "44px 44px",
                }}
              />
            </div>
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
