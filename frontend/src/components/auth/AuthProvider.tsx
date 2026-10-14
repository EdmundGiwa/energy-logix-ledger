"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, authApi, type CurrentUser } from "@/lib/api";

type AuthContextValue = {
  user: CurrentUser;
  logout: () => Promise<void>;
  loggingOut: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    authApi.me()
      .then((currentUser) => active && setUser(currentUser))
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof ApiError && [401, 403].includes(requestError.status)) {
          router.replace("/login");
          return;
        }
        setError("We could not verify your session. Check the backend connection and try again.");
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    setLoggingOut(true);
    try {
      await authApi.logout();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const value = user ? { user, logout, loggingOut } : null;

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Session check failed</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn-green mt-5 rounded-xl px-4 py-2.5 text-sm font-semibold">
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!value) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f2f3f5]" aria-live="polite">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
          Verifying your session…
        </div>
      </main>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
