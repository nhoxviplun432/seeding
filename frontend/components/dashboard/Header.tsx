export default function AdminHeader({ title }: { title?: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-black px-6 backdrop-blur">
      {/* Page title */}
      <h1 className="text-sm font-semibold text-white">
        {title ?? "Dashboard"}
      </h1>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          type="button"
          className="relative rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Thông báo"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Badge */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-fuchsia-500" />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-xs font-bold text-white">
            A
          </div>
          <span className="hidden text-sm font-medium text-slate-300 sm:block">Admin</span>
        </div>
      </div>
    </header>
  );
}
