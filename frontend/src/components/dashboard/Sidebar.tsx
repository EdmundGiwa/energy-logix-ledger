"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { Icon } from "@/components/landing/icons";
import { SignOutButton } from "@/components/auth/SignOutButton";

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

function SidebarItem({
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
  const cls = `group flex min-h-10 w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left text-[13px] font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group-hover/sidebar:px-3 group-focus-within/sidebar:px-3 ${
    active ? "bg-[#0b1523] font-semibold text-white shadow-[0_8px_20px_-12px_rgba(11,21,35,0.65)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
  }`;
  const content = <><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? "bg-white/10" : "bg-slate-50 group-hover:bg-white"}`}>{children}</span><span className="invisible min-w-0 flex-1 truncate opacity-0 transition-opacity duration-150 group-hover/sidebar:visible group-hover/sidebar:opacity-100 group-focus-within/sidebar:visible group-focus-within/sidebar:opacity-100">{label}</span></>;
  return href ? (
    <Link href={href} title={label} aria-current={active ? "page" : undefined} className={cls}>{content}</Link>
  ) : (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={cls}>{content}</button>
  );
}

export function Sidebar({ onOpenSearch, onOpenAstm }: { onOpenSearch?: () => void; onOpenAstm?: () => void }) {
  const pathname = usePathname();
  const groupedModules = navGroups.slice(1).map((group) => ({
    label: group.label,
    items: moduleNav.filter((item) => item.group === group.label),
  }));

  return (
    <aside aria-label="Primary navigation" className="group/sidebar fixed bottom-[72px] left-4 top-[96px] z-40 flex w-[60px] flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-[0_10px_35px_-20px_rgba(15,23,42,0.28)] backdrop-blur transition-[width] duration-200 ease-out hover:w-[220px] focus-within:w-[220px] motion-reduce:transition-none">
      <div className="border-b border-slate-100 p-2.5">
        <p className="invisible h-0 overflow-hidden whitespace-nowrap px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 opacity-0 transition-opacity group-hover/sidebar:visible group-hover/sidebar:h-auto group-hover/sidebar:pb-1.5 group-hover/sidebar:pt-1 group-hover/sidebar:opacity-100 group-focus-within/sidebar:visible group-focus-within/sidebar:h-auto group-focus-within/sidebar:pb-1.5 group-focus-within/sidebar:pt-1 group-focus-within/sidebar:opacity-100">Quick tools</p>
        <div className="space-y-1">
          <SidebarItem label="Search records" onClick={onOpenSearch}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </SidebarItem>
          <SidebarItem label="ASTM calculator" onClick={onOpenAstm}>
            <Icon.Scale size={18} />
          </SidebarItem>
        </div>
      </div>

      <nav aria-label="Product modules" className="min-h-0 flex-1 overflow-y-auto p-2.5 no-scrollbar">
        <div className="space-y-1">
          {moduleNav.slice(0, 1).map((item) => { const I = item.icon; return <SidebarItem key={item.href} href={item.href} label={item.label} active={isNavActive(pathname, item)}><I size={17} /></SidebarItem>; })}
        </div>
        {groupedModules.map((group) => <section key={group.label} aria-labelledby={`sidebar-${group.label.replaceAll(" ", "-").toLowerCase()}`} className="mt-4">
          <h2 id={`sidebar-${group.label.replaceAll(" ", "-").toLowerCase()}`} className="invisible h-0 overflow-hidden whitespace-nowrap px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 opacity-0 transition-opacity group-hover/sidebar:visible group-hover/sidebar:h-auto group-hover/sidebar:pb-1.5 group-hover/sidebar:opacity-100 group-focus-within/sidebar:visible group-focus-within/sidebar:h-auto group-focus-within/sidebar:pb-1.5 group-focus-within/sidebar:opacity-100">{group.label}</h2>
          <div className="space-y-1">{group.items.map((item) => { const I = item.icon; return <SidebarItem key={item.href} href={item.href} label={item.label} active={isNavActive(pathname, item)}><I size={17} /></SidebarItem>; })}</div>
        </section>)}
      </nav>

      <div className="space-y-1 border-t border-slate-100 p-2.5">
        <SidebarItem label="Settings" href="/dashboard/settings" active={pathname.startsWith("/dashboard/settings")}>
          <Icon.Settings size={18} />
        </SidebarItem>
        <SignOutButton className="group flex min-h-10 w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left text-[13px] font-medium text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 group-hover/sidebar:px-3 group-focus-within/sidebar:px-3">
          <><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-50"><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg></span><span className="invisible min-w-0 flex-1 truncate opacity-0 transition-opacity duration-150 group-hover/sidebar:visible group-hover/sidebar:opacity-100 group-focus-within/sidebar:visible group-focus-within/sidebar:opacity-100">Sign out</span></>
        </SignOutButton>
      </div>
    </aside>
  );
}
