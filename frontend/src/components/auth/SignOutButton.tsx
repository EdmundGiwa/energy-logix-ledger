"use client";

import { useAuth } from "./AuthProvider";

export function SignOutButton({ className, children = "Sign out", onComplete }: { className?: string; children?: React.ReactNode; onComplete?: () => void }) {
  const { logout, loggingOut } = useAuth();
  return (
    <button
      type="button"
      disabled={loggingOut}
      onClick={async () => {
        await logout();
        onComplete?.();
      }}
      className={className}
    >
      {loggingOut ? "Signing out…" : children}
    </button>
  );
}
