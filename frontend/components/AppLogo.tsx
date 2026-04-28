const APP_NAME = "PHG Seeding";

export default function AppLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const textClass = size === "sm" ? "text-sm font-bold text-white" : "text-[15px] font-bold text-white tracking-tight";

  return (
    <div className="flex items-center gap-3">
      <div className={`${iconSize} rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-fuchsia-900/40`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L22 12L12 22L2 12Z" fill="white" opacity="0.9"/>
          <circle cx="12" cy="12" r="4" fill="white"/>
        </svg>
      </div>
      <span className={textClass}>{APP_NAME}</span>
    </div>
  );
}
