import AppLogo from "@/components/AppLogo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#080412]">

      {/* ── Left panel ── */}
      <div className="relative hidden lg:flex lg:w-[480px] xl:w-[560px] shrink-0 flex-col overflow-hidden">
        {/* Deep base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0720] via-[#130a2e] to-[#0c0518]" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,1) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
          }}
        />

        {/* Ambient glows */}
        <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-fuchsia-600/20 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-indigo-600/20 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-violet-700/10 blur-[80px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-12 py-12">

          {/* Logo */}
          <AppLogo />

          {/* Hero */}
          <div className="mt-auto mb-auto flex flex-col gap-6 pt-16">
            <div>
              <p className="text-xs font-semibold text-fuchsia-400/80 tracking-[0.2em] uppercase mb-4">Facebook Automation</p>
              <h1 className="text-[38px] xl:text-[44px] font-extrabold text-white leading-[1.15] tracking-tight">
                Automate Your<br />
                <span className="bg-gradient-to-r from-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                  Seeding Campaign
                </span>
              </h1>
              <p className="mt-4 text-sm text-white/40 leading-relaxed max-w-[320px]">
                Manage thousands of accounts at scale. Intelligent scheduling, proxy isolation, and real-time analytics.
              </p>
            </div>

            {/* Stats strip */}
            <div className="flex gap-4 mt-2">
              {[
                { value: "4,800+", label: "Accounts" },
                { value: "98.2%", label: "Success rate" },
                { value: "2.4M", label: "Reach / mo" },
              ].map(s => (
                <div key={s.label} className="flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-[11px] text-white/35 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Active campaign card */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold text-white/40 tracking-widest uppercase">Active Campaign</span>
                <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  Running
                </span>
              </div>
              <p className="text-sm font-semibold text-white mb-3">Summer Launch — Wave 3</p>
              <div className="h-1.5 w-full rounded-full bg-white/[0.07] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500"
                  style={{ width: "62.5%" }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-white/30">1,248 posts done</span>
                <span className="text-[10px] text-white/50 font-medium">62.5%</span>
              </div>
            </div>
          </div>

          {/* Bottom tagline */}
          <p className="text-[11px] text-white/20 mt-auto">
            © 2026 PHG Seeding Platform. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 relative overflow-y-auto">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-fuchsia-700/10 blur-[80px]" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-indigo-700/10 blur-[60px]" />
        </div>

        <div className="relative w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <AppLogo />
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md px-8 py-8 shadow-2xl shadow-black/40">
            {children}
          </div>
        </div>
      </div>

    </div>
  );
}
