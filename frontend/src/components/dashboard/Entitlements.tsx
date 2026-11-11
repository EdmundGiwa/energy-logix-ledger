"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { organizationApi } from "@/lib/api";

type EntitlementsValue = {
  /** Module keys the organization can use (core + purchased). Mirrors the server's check. */
  enabled: ReadonlySet<string>;
  /** Modules with an open "Request access" waiting on Offshora. */
  requested: ReadonlySet<string>;
  /** Only owners and admins may request modules (the API enforces the same rule). */
  canRequest: boolean;
  requestAccess: (module: string, message?: string) => Promise<void>;
};

const EntitlementsContext = createContext<EntitlementsValue | null>(null);

/**
 * What this organization has switched on. Visibility only: the API refuses modules the
 * organization lacks, so hiding or showing a link here is never the access control.
 */
export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const membership = user.memberships[0];
  const enabled = useMemo(() => new Set(membership?.organization.enabled_modules ?? []), [membership]);
  const canRequest = membership?.role === "owner" || membership?.role === "admin";
  const [requested, setRequested] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!membership) return;
    let active = true;
    organizationApi
      .moduleRequests()
      .then((list) => active && setRequested(new Set(list.filter((r) => r.status === "open").map((r) => r.module))))
      .catch(() => undefined); // non-critical: the button simply shows as requestable
    return () => {
      active = false;
    };
  }, [membership]);

  const requestAccess = useCallback(async (module: string, message = "") => {
    await organizationApi.requestModule({ module, message });
    setRequested((prev) => new Set(prev).add(module));
  }, []);

  const value = useMemo(() => ({ enabled, requested, canRequest, requestAccess }), [enabled, requested, canRequest, requestAccess]);
  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

export function useEntitlements() {
  const value = useContext(EntitlementsContext);
  if (!value) throw new Error("useEntitlements must be used inside EntitlementsProvider");
  return value;
}
