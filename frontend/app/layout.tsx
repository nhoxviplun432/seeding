import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PHG Seeding",
    template: "%s | PHG Seeding",
  },
  description: "Hệ thống tự động hóa seeding video Facebook — quản lý tài khoản, chiến dịch và phân tích hiệu suất.",
  keywords: ["facebook seeding", "video automation", "social media", "campaign management"],
  authors: [{ name: "PHG" }],
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0f172a" />
        {/* AppLogo SVG — diamond + circle on fuchsia→indigo gradient */}
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23d946ef'/%3E%3Cstop offset='1' stop-color='%236366f1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='8' fill='url(%23g)'/%3E%3Cpath d='M16 4L28 16L16 28L4 16Z' fill='white' opacity='.9'/%3E%3Ccircle cx='16' cy='16' r='5' fill='white'/%3E%3C/svg%3E" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
