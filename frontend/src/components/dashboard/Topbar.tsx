"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/landing/icons";
import { BRAND } from "@/lib/brand";
import { moduleNav, navGroups, newGroups } from "./Sidebar";
import { NewBadge } from "@/components/ui/NewBadge";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useAuth } from "@/components/auth/AuthProvider";

const notifications = [
  { id: 1, title: "Certificate expiry alert", desc: "3 crew BOSIET certificates expire within 30 days", time: "12 min ago", tone: "crit" as const },
  { id: 2, title: "Reconciliation complete", desc: "Depot BK-04 discharge reconciled at 0.12% variance", time: "1 hr ago", tone: "ok" as const },
  { id: 3, title: "PTW pending approval", desc: "Hot work permit HW-2026-0412 awaiting sign-off", time: "2 hr ago", tone: "warn" as const },
];

const pill = "rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

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

  const current = moduleNav.find((m) => (m.exact ? pathname === m.href : pathname.startsWith(m.href)));
  const activeGroup = current?.group ?? null;

  return (
    <header className="sticky top-0 z-40 bg-[#f2f3f5]/55 px-3 pb-3 pt-3 backdrop-blur-md sm:px-4">
      <div className="flex items-center gap-3">
        {/* Logo */}
        <Link href="/dashboard" className={`${pill} flex h-[60px] shrink-0 items-center gap-2.5 pl-2.5 pr-5`}>
          <LogoMark size={40} />
          <span className="hidden text-[15px] font-bold tracking-tight text-slate-900 sm:block">
            {BRAND.lead}<span className="text-emerald-600">{BRAND.accent}</span>
          </span>
        </Link>

        {/* Mobile menu */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className={`${pill} grid h-[60px] w-[60px] place-items-center text-slate-700 lg:hidden`}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        {/* Group tabs */}
        <nav aria-label="Sections" className={`${pill} no-scrollbar mx-auto hidden h-[60px] items-center gap-1 overflow-x-auto px-2 md:flex`}>
          {navGroups.map((g) => {
            const on = g.label === activeGroup;
            return (
              <Link
                key={g.label}
                href={g.href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-[14px] transition ${
                  on ? "bg-[#0b1523] font-medium text-white" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {g.label}
                {newGroups.has(g.label) && <NewBadge size="xs" />}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className={`${pill} ml-auto hidden h-[60px] items-center gap-1 px-2 sm:flex md:ml-0`}>
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search (⌘K)"
            className="grid h-11 w-11 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100"
          >
            <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
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
              className="relative grid h-11 w-11 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100"
            >
              <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />}
            </button>
            {showNotif && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                <div className="modal-in absolute right-0 top-[calc(100%+12px)] z-50 w-[340px] overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)]">
                  <div className="flex items-center justify-between px-5 py-4">
                    <p className="text-[14px] font-semibold text-slate-900">Notifications</p>
                    <button type="button" onClick={() => setUnread(0)} className="text-[12px] font-medium text-emerald-700 hover:text-emerald-800">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto px-2 pb-2">
                    {notifications.map((n) => (
                      <div key={n.id} className="flex items-start gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50">
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            n.tone === "ok" ? "bg-emerald-500" : n.tone === "crit" ? "bg-rose-500" : "bg-amber-500"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-slate-800">{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-[12px] text-slate-500">{n.desc}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <Link
            href="/dashboard/settings"
            aria-label="Help and settings"
            className="grid h-11 w-11 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100"
          >
            <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16.5h.01" />
            </svg>
          </Link>
        </div>

        {/* User */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowUser((v) => !v);
              setShowNotif(false);
            }}
            className={`${pill} flex h-[60px] items-center gap-3 pl-2 pr-4`}
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-[13px] font-bold text-white">
              {initials}
            </span>
            <span className="hidden text-left lg:block">
              <span className="block text-[14px] font-medium text-slate-900">{user.name}</span>
              <span className="block text-[12px] text-slate-500">{membership?.organization.name} · {membership?.job_title || membership?.role}</span>
            </span>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="hidden text-slate-400 lg:block">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {showUser && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUser(false)} />
              <div className="modal-in absolute right-0 top-[calc(100%+12px)] z-50 w-[240px] overflow-hidden rounded-3xl bg-white p-2 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)]">
                <div className="mb-1 px-3 py-2.5">
                  <p className="text-[13px] font-semibold text-slate-900">{user.name}</p>
                  <p className="text-[12px] text-slate-500">{user.email}</p>
                  <span className="mt-1.5 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold capitalize text-emerald-700">{membership?.organization.requested_plan} tier · {membership?.role}</span>
                </div>
                {[
                  { label: "Roles & access", href: "/dashboard/settings#roles" },
                  { label: "Field devices & sync", href: "/dashboard/settings#devices" },
                  { label: "Audit log", href: "/dashboard/settings#audit" },
                ].map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    onClick={() => setShowUser(false)}
                    className="flex items-center rounded-2xl px-3 py-2.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    {a.label}
                  </Link>
                ))}
                <div className="my-1 border-t border-slate-100" />
                <SignOutButton className="flex w-full items-center rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium text-rose-600 transition hover:bg-rose-50">
                  Sign out
                </SignOutButton>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
