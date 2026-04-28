"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  // Persist auth result across navigations — don't re-verify on every route change
  const verified = useRef(false);

  useEffect(() => {
    if (verified.current) {
      setChecked(true);
      return;
    }
    getMe().then((user) => {
      if (!user) {
        router.replace("/auth/login");
      } else {
        verified.current = true;
        setChecked(true);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
