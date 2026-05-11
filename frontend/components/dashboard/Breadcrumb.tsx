"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SEGMENT_LABELS: Record<string, string> = {
  "":              "Dashboard",
  users:           "Người dùng",
  groups:          "Nhóm",
  analytics:       "Phân tích",
  campaigns:       "Chiến dịch",
  videos:          "Video",
  seeding:         "Seeding",
  comments:        "Bình luận",
  keywords:        "Từ khóa",
  posts:           "Đăng bài",
  friends:         "Danh sách bạn bè",
  settings:        "Cài đặt",
  general:         "Chung",
  api:             "API Social",
  "api-settings":  "API Social",
  "proxies-settings": "Proxies",
  "user-settings": "Người dùng",
  new:             "Tạo mới",
};

function label(seg: string): string {
  return SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
}

export default function Breadcrumb() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  // Build crumbs: [{label, href}]
  const crumbs = [
    { label: "Dashboard", href: "/" },
    ...segments.map((seg, i) => ({
      label: label(seg),
      href: "/" + segments.slice(0, i + 1).join("/"),
    })),
  ];

  // Single-segment (home) — nothing to show
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 px-6 py-2 border-b border-white/5 bg-black/20 relative z-20">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg className="h-3 w-3 shrink-0 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {isLast ? (
              <span className="text-xs font-medium text-slate-300">{crumb.label}</span>
            ) : (
              <Link href={crumb.href}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
