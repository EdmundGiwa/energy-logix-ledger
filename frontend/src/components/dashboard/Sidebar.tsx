"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { Icon, LogoMark, Wordmark } from "@/components/landing/icons";
import { Corners } from "@/components/landing/primitives";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useAuth } from "@/components/auth/AuthProvider";
import { NewBadge } from "@/components/ui/NewBadge";
import { useEntitlements } from "./Entitlements";

/* ------------------------------------------------------------------ */
/* Navigation data                                                     */
/* ------------------------------------------------------------------ */
type IconC = ComponentType<{ size?: number; className?: string }>;

export type NavGroup = "Overview" | "Offshore" | "Marine" | "Pipeline & EPC" | "Depot & Haulage" | "HSE & Compliance" | "Finance";

export type NavItem = {
  href: string;
  label: string;
  color: string;
  icon: IconC;
  group: NavGroup;
  /** Entitlement key (backend organizations.modules). Absent for always-available pages. */
  module?: string;
  exact?: boolean;
  isNew?: boolean;
};

export const moduleNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", color: "#0f172a", icon: Icon.Grid, group: "Overview", exact: true },
  { href: "/dashboard/offshore-link", label: "OffshoreLink", color: "#0f766e", icon: Icon.Cube, group: "Offshore", module: "offshorelink", isNew: true },
  { href: "/dashboard/rig-supply", label: "RigSupply", color: "#1d4ed8", icon: Icon.Barrel, group: "Offshore", module: "rigsupply", isNew: true },
  { href: "/dashboard/crew-transit", label: "CrewTransit", color: "#be185d", icon: Icon.Users, group: "Offshore", module: "crewtransit", isNew: true },
  { href: "/dashboard/vessel-ops", label: "VesselOps", color: "#2563eb", icon: Icon.Anchor, group: "Offshore", module: "vesselops", isNew: true },
  { href: "/dashboard/equip-track", label: "EquipTrack", color: "#a16207", icon: Icon.QR, group: "Offshore", module: "equiptrack", isNew: true },
  { href: "/dashboard/marine-guard", label: "MarineGuard", color: "#9f1239", icon: Icon.Satellite, group: "Offshore", module: "marineguard", isNew: true },
  { href: "/dashboard/bunkerflow", label: "BunkerFlow", color: "#0284c7", icon: Icon.Ship, group: "Marine", module: "bunkerflow" },
  { href: "/dashboard/marine-stores", label: "MarineStores", color: "#0e7490", icon: Icon.Package, group: "Marine", module: "marinestores" },
  { href: "/dashboard/pipe-integrity", label: "PipeIntegrity", color: "#059669", icon: Icon.Pipe, group: "Pipeline & EPC", module: "pipeintegrity" },
  { href: "/dashboard/epc-link", label: "EPC-Link", color: "#0891b2", icon: Icon.Building, group: "Pipeline & EPC", module: "epclink" },
  { href: "/dashboard/tank-works", label: "TankWorks", color: "#ca8a04", icon: Icon.Wrench, group: "Pipeline & EPC", module: "tankworks" },
  { href: "/dashboard/refinery-link", label: "RefineryLink", color: "#d97706", icon: Icon.Tank, group: "Depot & Haulage", module: "refinerylink" },
  { href: "/dashboard/haul-trac", label: "HaulTrac", color: "#7c3aed", icon: Icon.Truck, group: "Depot & Haulage", module: "haultrac" },
  { href: "/dashboard/safe-pass", label: "SafePass", color: "#dc2626", icon: Icon.Shield, group: "HSE & Compliance", module: "safepass" },
  { href: "/dashboard/enviro-ledger", label: "EnviroLedger", color: "#16a34a", icon: Icon.Wind, group: "HSE & Compliance", module: "enviroledger", isNew: true },
  { href: "/dashboard/compliance-shield", label: "Compliance Shield", color: "#4f46e5", icon: Icon.Calendar, group: "HSE & Compliance", module: "compliance_shield" },
  { href: "/dashboard/billing", label: "Billing", color: "#64748b", icon: Icon.Receipt, group: "Finance", module: "billing" },
  { href: "/dashboard/client-portal", label: "Client Portal", color: "#0369a1", icon: Icon.Globe, group: "Finance", module: "client_portal" },
];

export const navGroups: { label: NavGroup; href: string }[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Offshore", href: "/dashboard/offshore-link" },
  { label: "Marine", href: "/dashboard/bunkerflow" },
  { label: "Pipeline & EPC", href: "/dashboard/pipe-integrity" },
  { label: "Depot & Haulage", href: "/dashboard/refinery-link" },
  { label: "HSE & Compliance", href: "/dashboard/safe-pass" },
  { label: "Finance", href: "/dashboard/billing" },
];

/** True when the route belongs to a module flagged as new. */
export function isNewModule(pathname: string) {
  return moduleNav.some((m) => m.isNew && pathname.startsWith(m.href));
}

/** Nav groups that contain at least one new module. */
export const newGroups = new Set(moduleNav.filter((m) => m.isNew).map((m) => m.group));

export function isNavActive(pathname: string, item: { href: string; exact?: boolean }) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/** The nav entry for a route (most specific match). */
export function navItemFor(pathname: string) {
  return moduleNav.find((m) => isNavActive(pathname, m) && !m.exact) ?? moduleNav.find((m) => isNavActive(pathname, m));
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

function NavLink({ item, active, locked, onNavigate }: { item: NavItem; active: boolean; locked?: boolean; onNavigate?: () => void }) {
  const ItemIcon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group flex h-10 items-center gap-3 rounded-lg px-2.5 text-[14px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        active
          ? "bg-[#0a0f14] text-white shadow-[0_10px_24px_-14px_rgba(10,15,20,0.8)]"
          : locked
            ? "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-[#0a0f14]"
      }`}
    >
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${active ? "bg-white/10 text-emerald-300" : "bg-white text-slate-500 ring-1 ring-slate-200/80 group-hover:text-[#0a0f14]"}`}>
        <ItemIcon size={15} />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {locked ? <Icon.Lock size={12} className="text-slate-300" /> : item.isNew && !active ? <NewBadge size="xs" /> : null}
    </Link>
  );
}

export function SidebarContent({ onOpenSearch, onOpenAstm, onNavigate }: { onOpenSearch?: () => void; onOpenAstm?: () => void; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { enabled, requested } = useEntitlements();
  const membership = user.memberships[0];
  const initials = `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase() || user.email[0].toUpperCase();

  const available = (item: NavItem) => !item.module || enabled.has(item.module);
  const groups = navGroups.slice(1)
    .map((g) => ({ label: g.label, items: moduleNav.filter((m) => m.group === g.label && available(m)) }))
    .filter((g) => g.items.length > 0);
  const locked = moduleNav.filter((m) => !available(m));
  const lockedActive = locked.some((m) => isNavActive(pathname, m));

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-5">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5" aria-label="Offshora dashboard">
          <LogoMark size={34} />
          <Wordmark size="sm" />
        </Link>
        {membership && (
          <div className="corners mt-5 px-3.5 py-3 text-slate-300">
            <Corners />
            <p className="font-display truncate text-[1.2rem] leading-tight text-[#0a0f14]">{membership.organization.name}</p>
            <p className="font-label mt-1 truncate text-[10.5px] uppercase text-slate-500">
              {membership.organization.requested_plan} plan · {membership.role}
            </p>
          </div>
        )}
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-1.5">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex h-10 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 text-left text-[13.5px] text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="flex-1">Search</span>
            <kbd className="font-label rounded border border-slate-200 px-1.5 text-[10px] text-slate-400">⌘K</kbd>
          </button>
          <button
            type="button"
            onClick={onOpenAstm}
            title="ASTM 54B calculator"
            aria-label="ASTM 54B calculator"
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
          >
            <Icon.Scale size={16} />
          </button>
        </div>
      </div>

      <nav aria-label="Modules" className="no-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <NavLink item={moduleNav[0]} active={isNavActive(pathname, moduleNav[0])} onNavigate={onNavigate} />
        {groups.map((group) => (
          <section key={group.label} className="mt-5" aria-label={group.label}>
            <p className="font-label px-2.5 pb-1.5 text-[10.5px] uppercase text-slate-400">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} active={isNavActive(pathname, item)} onNavigate={onNavigate} />
              ))}
            </div>
          </section>
        ))}

        {locked.length > 0 && (
          <details className="group mt-6 border-t border-slate-200/80 pt-3" open={lockedActive || undefined}>
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2.5 py-1.5 text-slate-500 transition hover:text-[#0a0f14]">
              <span className="font-label text-[10.5px] uppercase">More modules · {locked.length}</span>
              <span className="text-[18px] font-light leading-none transition group-open:rotate-45">+</span>
            </summary>
            <div className="mt-1 space-y-0.5">
              {locked.map((item) => (
                <div key={item.href} className="relative">
                  <NavLink item={item} active={isNavActive(pathname, item)} locked onNavigate={onNavigate} />
                  {item.module && requested.has(item.module) && (
                    <span className="font-label pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 rounded bg-emerald-50 px-1.5 text-[9.5px] text-emerald-700">REQUESTED</span>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </nav>

      <div className="border-t border-slate-200/80 p-3">
        <NavLink
          item={{ href: "/dashboard/settings", label: "Settings", color: "", icon: Icon.Settings, group: "Overview" }}
          active={pathname.startsWith("/dashboard/settings")}
          onNavigate={onNavigate}
        />
        <div className="mt-2 flex items-center gap-2.5 rounded-lg px-2 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0a0f14] text-[11.5px] font-semibold text-emerald-300">{initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-[#0a0f14]">{user.name}</span>
            <span className="block truncate text-[11.5px] text-slate-500">{user.email}</span>
          </span>
          <SignOutButton ariaLabel="Sign out" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}

export function Sidebar(props: { onOpenSearch?: () => void; onOpenAstm?: () => void }) {
  return (
    <aside aria-label="Primary navigation" className="fixed inset-y-0 left-0 z-40 w-[260px] border-r border-slate-200/80 bg-white/90 backdrop-blur-md">
      <SidebarContent {...props} />
    </aside>
  );
}
