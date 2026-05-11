"use client";

import { useState, useRef, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface GeneralSettings {
  siteTitle: string;
  siteDescription: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  timezone: string;
  dateFormat: string;
  language: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const TIMEZONES = [
  { value: "Asia/Ho_Chi_Minh", label: "Hà Nội / TP.HCM (GMT+7)" },
  { value: "Asia/Bangkok",     label: "Bangkok (GMT+7)" },
  { value: "Asia/Singapore",   label: "Singapore (GMT+8)" },
  { value: "Asia/Tokyo",       label: "Tokyo (GMT+9)" },
  { value: "Europe/London",    label: "London (GMT+0)" },
  { value: "America/New_York", label: "New York (GMT-5)" },
  { value: "UTC",              label: "UTC (GMT+0)" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY — 31/12/2024" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY — 12/31/2024" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD — 2024-12-31" },
];

const LANGUAGES = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

const PRESET_COLORS = [
  { name: "Fuchsia",  primary: "#d946ef", accent: "#818cf8" },
  { name: "Blue",     primary: "#3b82f6", accent: "#06b6d4" },
  { name: "Emerald",  primary: "#10b981", accent: "#6366f1" },
  { name: "Orange",   primary: "#f97316", accent: "#eab308" },
  { name: "Rose",     primary: "#f43f5e", accent: "#fb923c" },
];

const DEFAULTS: GeneralSettings = {
  siteTitle:       "SeedApp",
  siteDescription: "Facebook Video Automation SaaS",
  logoUrl:         "",
  faviconUrl:      "",
  primaryColor:    "#d946ef",
  accentColor:     "#818cf8",
  timezone:        "Asia/Ho_Chi_Minh",
  dateFormat:      "DD/MM/YYYY",
  language:        "vi",
};

// ── Atoms ──────────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-slate-400 mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function InputField({ value, onChange, placeholder, className = "" }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white
        placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors ${className}`}
    />
  );
}

function SelectField({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white
        focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors"
    >
      {options.map(o => (
        <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
      ))}
    </select>
  );
}

// ── Section wrapper with icon header ──────────────────────────────────────────
function Section({ icon, title, description, children }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
      <div className="lg:pt-1">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="text-fuchsia-400">{icon}</span>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-white/5" />;
}

// ── Logo Upload ────────────────────────────────────────────────────────────────
function LogoUpload({ label, hint, value, onChange }: {
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        onClick={() => !value && fileRef.current?.click()}
        className={`relative flex items-center gap-4 rounded-xl border p-4 transition-colors
          ${value
            ? "border-white/10 bg-white/5"
            : "border-dashed border-white/10 bg-white/[0.02] hover:border-fuchsia-500/40 hover:bg-white/5 cursor-pointer"
          }`}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 overflow-hidden">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain p-1" />
          ) : (
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-300 font-medium truncate">{value ? "Đã tải lên" : "Nhấn để chọn file"}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">{hint}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
            className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            {value ? "Thay" : "Chọn"}
          </button>
          {value && (
            <button type="button" onClick={e => { e.stopPropagation(); onChange(""); }}
              className="rounded-lg border border-red-500/20 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
              Xóa
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

// ── Color picker ───────────────────────────────────────────────────────────────
function ColorField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="relative h-9 w-9 shrink-0 cursor-pointer rounded-xl border border-white/10 overflow-hidden shadow-inner">
        <div className="absolute inset-0" style={{ backgroundColor: value }} />
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
      </label>
      <div className="flex-1">
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        <input
          value={value}
          onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white font-mono uppercase
            placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

// ── Live clock ─────────────────────────────────────────────────────────────────
function LiveClock({ timezone }: { timezone: string }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString("vi-VN", {
        timeZone: timezone,
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
      }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timezone]);

  const date = new Date().toLocaleDateString("vi-VN", {
    timeZone: timezone,
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
        <div>
            <p className="text-base font-mono font-semibold text-white tabular-nums tracking-wider">{time}</p>
            <p className="text-[11px] text-slate-500 capitalize">{date}</p>
        </div>
    </div>
  );
}

// ── Settings sidebar nav ───────────────────────────────────────────────────────
// function SettingsNav() {
//   const pathname = usePathname();
//   return (
//     <nav className="flex flex-row gap-1 lg:flex-col">
//       {SETTINGS_NAV.map(({ href, label, icon }) => {
//         const active = pathname === href || (href !== "/settings" && pathname.startsWith(href));
//         return (
//           <Link key={href} href={href}
//             className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors
//               ${active
//                 ? "bg-fuchsia-500/15 text-fuchsia-300"
//                 : "text-slate-400 hover:bg-white/5 hover:text-white"
//               }`}
//           >
//             {icon}
//             <span className="hidden sm:inline">{label}</span>
//           </Link>
//         );
//       })}
//     </nav>
//   );
// }

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULTS);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [dirty,    setDirty]    = useState(false);

  function set<K extends keyof GeneralSettings>(k: K, v: GeneralSettings[K]) {
    setSettings(p => ({ ...p, [k]: v }));
    setDirty(true);
    setSaved(false);
  }

  function applyPreset(p: typeof PRESET_COLORS[number]) {
    setSettings(prev => ({ ...prev, primaryColor: p.primary, accentColor: p.accent }));
    setDirty(true);
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    setSaved(true);
    setDirty(false);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold text-white">Cài đặt</h2>
        <p className="mt-0.5 text-sm text-slate-400">Quản lý cấu hình hệ thống và tuỳ chọn hiển thị</p>
      </div>

      {/* Two-column layout: settings nav + content */}
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">

        {/* Left nav */}
        

        {/* Right content */}
        <form onSubmit={handleSave} className="flex-1 min-w-0 space-y-8">

          {/* Section: Branding */}
          <Section
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
            title="Thương hiệu"
            description="Tên, mô tả và logo hiển thị trên toàn hệ thống"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel required>Tên hệ thống</FieldLabel>
                <InputField value={settings.siteTitle} onChange={v => set("siteTitle", v)} placeholder="SeedApp" />
              </div>
              <div>
                <FieldLabel>Mô tả ngắn</FieldLabel>
                <InputField value={settings.siteDescription} onChange={v => set("siteDescription", v)} placeholder="Facebook Video Automation" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1">
              <LogoUpload label="Logo" hint="PNG, SVG · tối đa 2MB · nền trong suốt" value={settings.logoUrl} onChange={v => set("logoUrl", v)} />
              <LogoUpload label="Favicon" hint="ICO, PNG · 32×32px khuyến nghị" value={settings.faviconUrl} onChange={v => set("faviconUrl", v)} />
            </div>
          </Section>

          <Divider />

          {/* Section: Appearance */}
          <Section
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            }
            title="Giao diện"
            description="Bộ màu chủ đạo áp dụng cho toàn bộ dashboard"
          >
            {/* Quick presets */}
            <div>
              <FieldLabel>Bộ màu nhanh</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(p => {
                  const active = settings.primaryColor === p.primary && settings.accentColor === p.accent;
                  return (
                    <button key={p.name} type="button" onClick={() => applyPreset(p)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all
                        ${active
                          ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300"
                          : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                    >
                      <span className="flex gap-0.5">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.primary }} />
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.accent }} />
                      </span>
                      {p.name}
                      {active && (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual pickers */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ColorField label="Màu chính" value={settings.primaryColor} onChange={v => set("primaryColor", v)} />
              <ColorField label="Màu phụ"   value={settings.accentColor}  onChange={v => set("accentColor", v)} />
            </div>

            {/* Live preview */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Xem trước</p>
              <div className="flex flex-wrap items-center gap-4">
                <button type="button"
                  className="h-8 px-4 rounded-xl text-xs font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.accentColor})` }}
                >
                  Hành động
                </button>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-32 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full w-3/4 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${settings.primaryColor}, ${settings.accentColor})` }} />
                  </div>
                  <span className="text-xs text-slate-400">75%</span>
                </div>
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    borderColor: settings.primaryColor + "55",
                    color: settings.primaryColor,
                    backgroundColor: settings.primaryColor + "18",
                  }}
                >
                  Active
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.accentColor})` }}>
                  AB
                </div>
              </div>
            </div>
          </Section>

          <Divider />

          {/* Section: Locale */}
          <Section
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Múi giờ & Ngôn ngữ"
            description="Địa phương hoá dữ liệu hiển thị cho toàn hệ thống"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Ngôn ngữ</FieldLabel>
                <SelectField value={settings.language} onChange={v => set("language", v)} options={LANGUAGES} />
              </div>
              <div>
                <FieldLabel>Định dạng ngày</FieldLabel>
                <SelectField value={settings.dateFormat} onChange={v => set("dateFormat", v)} options={DATE_FORMATS} />
              </div>
            </div>
            <div>
              <FieldLabel>Múi giờ</FieldLabel>
              <SelectField value={settings.timezone} onChange={v => set("timezone", v)} options={TIMEZONES} />
            </div>
            <LiveClock timezone={settings.timezone} />
          </Section>

          {/* Save bar */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-xs text-slate-500">
              {saved ? (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Đã lưu thành công
                </span>
              ) : dirty ? "Có thay đổi chưa lưu" : "Không có thay đổi"}
            </p>
            <div className="flex items-center gap-2">
              {dirty && (
                <button type="button"
                  onClick={() => { setSettings(DEFAULTS); setDirty(false); setSaved(false); }}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                  Đặt lại
                </button>
              )}
              <button type="submit" disabled={saving || !dirty}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                {saving && <Spinner />}
                {saving ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
