import type { Metadata } from "next";
import "./globals.css";
import AdminSidebar from "@/components/dashboard/Sidebar";
import AdminHeader from "@/components/dashboard/Header";
import AuthGuard from "./auth";

export const metadata: Metadata = {
  title: {
    default: "Admin | PHG Seeding",
    template: "%s | Admin PHG Seeding",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthGuard>
          <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-50">
            <AdminSidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <AdminHeader />
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
