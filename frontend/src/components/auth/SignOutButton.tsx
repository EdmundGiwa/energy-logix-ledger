"use client";

import { useAuth } from "./AuthProvider";

export function SignOutButton({
  className,
  children = "Sign out",
  onComplete,
  ariaLabel,
}: {
  className?: string;
  children?: React.ReactNode;
  onComplete?: () => void;
  ariaLabel?: string;
}) {
  const { logout, loggingOut } = useAuth();
  return (
    <button
      type="button"
      disabled={loggingOut}
      aria-label={ariaLabel}
      title={ariaLabel}
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
