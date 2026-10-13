"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { moduleNav } from "./Sidebar";
import { LogoMark } from "@/components/landing/icons";

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  function isActive(item: typeof moduleNav[0]) {
    if ((item as { exact?: boolean }).exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-slate-200 shadow-2xl lg:hidden modal-in flex flex-col">
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <LogoMark size={32} />
            <span className="leading-none">
              <span className="block text-[13px] font-extrabold uppercase tracking-[0.08em] text-slate-900">
                Petro<span className="text-emerald-600">Ledger</span>
              </span>
              <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[0.32em] text-emerald-700">
                Energy OS
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
            aria-label="Close menu"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 no-scrollbar">
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Platform
          </p>
          {moduleNav.slice(0, 1).map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition ${
                  active
                    ? "bg-emerald-50/80 text-emerald-800 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: active ? "#059669" : item.color }}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Modules
          </p>
          {moduleNav.slice(1).map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition ${
                  active
                    ? "bg-emerald-50/80 text-emerald-800 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: active ? "#059669" : item.color }}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-slate-100 px-4 py-3">
          <Link
            href="/login"
            className="flex items-center rounded-xl px-3 py-2.5 text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition"
          >
            Sign out
          </Link>
        </div>
      </aside>
    </>
  );
}
