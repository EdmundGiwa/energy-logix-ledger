"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { Icon } from "@/components/landing/icons";

/* ------------------------------------------------------------------ */
/* Navigation data                                                     */
/* ------------------------------------------------------------------ */
type IconC = ComponentType<{ size?: number; className?: string }>;

export type NavGroup = "Overview" | "Marine" | "Pipeline & EPC" | "Depot & Haulage" | "HSE & Compliance" | "Finance";

export const moduleNav: { href: string; label: string; color: string; icon: IconC; group: NavGroup; exact?: boolean }[] = [
  { href: "/dashboard", label: "Overview", color: "#0f172a", icon: Icon.Grid, group: "Overview", exact: true },
  { href: "/dashboard/bunkerflow", label: "BunkerFlow", color: "#0284c7", icon: Icon.Ship, group: "Marine" },
  { href: "/dashboard/marine-stores", label: "MarineStores", color: "#0e7490", icon: Icon.Package, group: "Marine" },
  { href: "/dashboard/pipe-integrity", label: "PipeIntegrity", color: "#059669", icon: Icon.Pipe, group: "Pipeline & EPC" },
  { href: "/dashboard/epc-link", label: "EPC-Link", color: "#0891b2", icon: Icon.Building, group: "Pipeline & EPC" },
  { href: "/dashboard/tank-works", label: "TankWorks", color: "#ca8a04", icon: Icon.Wrench, group: "Pipeline & EPC" },
  { href: "/dashboard/refinery-link", label: "RefineryLink", color: "#d97706", icon: Icon.Tank, group: "Depot & Haulage" },
  { href: "/dashboard/haul-trac", label: "HaulTrac", color: "#7c3aed", icon: Icon.Truck, group: "Depot & Haulage" },
  { href: "/dashboard/safe-pass", label: "SafePass", color: "#dc2626", icon: Icon.Shield, group: "HSE & Compliance" },
  { href: "/dashboard/compliance-shield", label: "Compliance Shield", color: "#4f46e5", icon: Icon.Calendar, group: "HSE & Compliance" },
  { href: "/dashboard/billing", label: "Billing", color: "#64748b", icon: Icon.Receipt, group: "Finance" },
  { href: "/dashboard/client-portal", label: "Client Portal", color: "#0369a1", icon: Icon.Globe, group: "Finance" },
];

export const navGroups: { label: NavGroup; href: string }[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Marine", href: "/dashboard/bunkerflow" },
  { label: "Pipeline & EPC", href: "/dashboard/pipe-integrity" },
  { label: "Depot & Haulage", href: "/dashboard/refinery-link" },
  { label: "HSE & Compliance", href: "/dashboard/safe-pass" },
  { label: "Finance", href: "/dashboard/billing" },
];

export function isNavActive(pathname: string, item: { href: string; exact?: boolean }) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/* ------------------------------------------------------------------ */
/* Rail button                                                         */
/* ------------------------------------------------------------------ */
function RailItem({
  label,
  active,
  children,
  href,
  onClick,
}: {
  label: string;
  active?: boolean;
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const cls = `group relative grid h-11 w-11 place-items-center rounded-full transition duration-200 ${
    active ? "bg-[#0b1523] text-white shadow-[0_8px_20px_-8px_rgba(11,21,35,0.6)]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
  }`;
  const tip = (
    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#0b1523] px-2.5 py-1 text-[11.5px] font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
      {label}
    </span>
  );
  return href ? (
    <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className={cls}>
      {children}
      {tip}
    </Link>
  ) : (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      {children}
      {tip}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Floating icon rail                                                  */
/* ------------------------------------------------------------------ */
export function Sidebar({ onOpenSearch, onOpenAstm }: { onOpenSearch?: () => void; onOpenAstm?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="fixed bottom-4 left-4 top-[96px] z-40 flex w-[60px] flex-col items-center justify-between gap-3">
      <div className="flex w-full flex-col items-center gap-3 overflow-y-auto no-scrollbar">
        {/* Quick tools */}
        <div className="flex flex-col items-center gap-1 rounded-full bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <RailItem label="Search records (⌘K)" onClick={onOpenSearch}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </RailItem>
          <RailItem label="ASTM 54B / 56 calculator" onClick={onOpenAstm}>
            <Icon.Scale size={18} />
          </RailItem>
        </div>

        {/* Modules */}
        <nav aria-label="Modules" className="flex flex-col items-center gap-1 rounded-full bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {moduleNav.map((m) => {
            const I = m.icon;
            return (
              <RailItem key={m.href} href={m.href} label={m.label} active={isNavActive(pathname, m)}>
                <I size={18} />
              </RailItem>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-1 rounded-full bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <RailItem label="Settings" href="/dashboard/settings" active={pathname.startsWith("/dashboard/settings")}>
          <Icon.Settings size={18} />
        </RailItem>
        <RailItem label="Sign out" href="/login">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </RailItem>
      </div>
    </aside>
  );
}
