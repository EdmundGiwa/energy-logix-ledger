"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/landing/icons";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useAuth } from "@/components/auth/AuthProvider";
import { navItemFor } from "./Sidebar";

// Prototype notifications until the notifications service exists.
const notifications = [
  { id: 1, title: "Certificate expiry alert", desc: "3 crew BOSIET certificates expire within 30 days", time: "12 min ago", tone: "crit" as const },
  { id: 2, title: "Reconciliation complete", desc: "Depot BK-04 discharge reconciled at 0.12% variance", time: "1 hr ago", tone: "ok" as const },
  { id: 3, title: "PTW pending approval", desc: "Hot work permit HW-2026-0412 awaiting sign-off", time: "2 hr ago", tone: "warn" as const },
];

const iconBtn = "grid h-10 w-10 place-items-center rounded-lg text-slate-600 transition hover:bg-white hover:text-[#0a0f14] hover:shadow-sm";

export function Topbar({
  onOpenSearch,
  onOpenMenu,
}: {
  onOpenSearch?: () => void;
  onOpenAstm?: () => void;
  onOpenMenu?: () => void;
}) {
  const pathname = usePathname();
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [unread, setUnread] = useState(notifications.length);
  const { user } = useAuth();
  const membership = user.memberships[0];
  const initials = `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase() || user.email[0].toUpperCase();
  const current = pathname.startsWith("/dashboard/settings") ? { label: "Settings", group: "Workspace" } : navItemFor(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#f7f8f9]/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button type="button" onClick={onOpenMenu} aria-label="Open menu" className={`${iconBtn} lg:hidden`}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </button>
        <Link href="/dashboard" className="lg:hidden" aria-label="Offshora dashboard">
          <LogoMark size={30} />
        </Link>

        <div className="min-w-0">
          <p className="font-label hidden text-[10.5px] uppercase text-slate-400 sm:block">{current?.group === "Overview" ? membership?.organization.name ?? "Workspace" : current?.group}</p>
          <p className="font-display truncate text-[1.3rem] leading-tight text-[#0a0f14]">{current?.label ?? "Dashboard"}</p>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={onOpenSearch} aria-label="Search (⌘K)" className={`${iconBtn} lg:hidden`}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotif((v) => !v);
                setShowUser(false);
              }}
              aria-label="Notifications"
              aria-expanded={showNotif}
              className={`${iconBtn} relative`}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[#f7f8f9]" />}
            </button>
            {showNotif && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                <div className="modal-in absolute right-0 top-[calc(100%+10px)] z-50 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-24px_rgba(10,15,20,0.35)]">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                    <p className="font-display text-[1.1rem] text-[#0a0f14]">Notifications</p>
                    <button type="button" onClick={() => setUnread(0)} className="font-label text-[11px] text-emerald-700 hover:text-emerald-800">
                      MARK ALL READ
                    </button>
                  </div>
                  <div className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.tone === "ok" ? "bg-emerald-500" : n.tone === "crit" ? "bg-rose-500" : "bg-amber-500"}`} />
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-medium text-[#0a0f14]">{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-[12.5px] text-slate-500">{n.desc}</p>
                          <p className="font-label mt-1 text-[10.5px] text-slate-400">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowUser((v) => !v);
                setShowNotif(false);
              }}
              aria-label="Account menu"
              aria-expanded={showUser}
              className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-[#0a0f14] text-[12px] font-semibold text-emerald-300 ring-2 ring-white transition hover:ring-emerald-200"
            >
              {initials}
            </button>
            {showUser && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUser(false)} />
                <div className="modal-in absolute right-0 top-[calc(100%+10px)] z-50 w-[250px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_24px_60px_-24px_rgba(10,15,20,0.35)]">
                  <div className="px-3 py-2.5">
                    <p className="text-[13.5px] font-medium text-[#0a0f14]">{user.name}</p>
                    <p className="text-[12px] text-slate-500">{user.email}</p>
                    {membership && (
                      <span className="font-label mt-2 inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] uppercase text-emerald-700">
                        {membership.organization.requested_plan} · {membership.role}
                      </span>
                    )}
                  </div>
                  <div className="my-1 border-t border-slate-100" />
                  {[
                    { label: "Roles & access", href: "/dashboard/settings#roles" },
                    { label: "Field devices & sync", href: "/dashboard/settings#devices" },
                    { label: "Audit log", href: "/dashboard/settings#audit" },
                  ].map((a) => (
                    <Link key={a.label} href={a.href} onClick={() => setShowUser(false)} className="flex rounded-lg px-3 py-2 text-[13.5px] text-slate-600 transition hover:bg-slate-50 hover:text-[#0a0f14]">
                      {a.label}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-slate-100" />
                  <SignOutButton className="flex w-full rounded-lg px-3 py-2 text-left text-[13.5px] text-rose-600 transition hover:bg-rose-50">Sign out</SignOutButton>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
