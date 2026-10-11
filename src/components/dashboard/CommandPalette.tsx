"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { moduleNav } from "./Sidebar";

export function CommandPalette({
  open,
  onClose,
  onOpenAstm,
}: {
  open: boolean;
  onClose: () => void;
  onOpenAstm?: () => void;
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
        else onClose(); // parent can toggle
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const quickNavItems = moduleNav.filter((m) =>
    m.label.toLowerCase().includes(query.toLowerCase())
  );

  const mockRecords = [
    { title: "e-BDN BDN-2026-0419 (MT Sea Venture)", href: "/dashboard/bunkerflow", tag: "BunkerFlow" },
    { title: "Hydrotest Log HT-2026-88 (Escravos-Lagos TL)", href: "/dashboard/pipe-integrity", tag: "PipeIntegrity" },
    { title: "Dispatch NG-LAG-4418 (Lekki Corridor)", href: "/dashboard/haul-trac", tag: "HaulTrac" },
    { title: "Gantry Meter Ticket TK-8801 (AGO Batch 14)", href: "/dashboard/refinery-link", tag: "RefineryLink" },
    { title: "PTW Hot Work HW-2026-0413 (H2S Safe)", href: "/dashboard/safe-pass", tag: "SafePass" },
    { title: "NCFCC Readiness Dossier (NOGIC-JQS)", href: "/dashboard/epc-link", tag: "EPC-Link" },
    { title: "IOC Client Portal Audit Dossier", href: "/dashboard/client-portal", tag: "Client Portal" },
  ].filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase()) ||
    r.tag.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 p-4">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-slate-400 shrink-0">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules, records, BDNs, permits, trucks..."
            className="flex-1 bg-transparent text-[14.5px] text-slate-900 placeholder:text-slate-400 outline-none"
          />
          <kbd className="text-[11px] font-mono text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-4">
          {/* Quick Actions */}
          {onOpenAstm && !query && (
            <div>
              <p className="px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Quick Tools
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAstm();
                }}
                className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-900 transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  <span>Launch ASTM 54B / 56 Density Calculator</span>
                </div>
                <span className="text-[11px] font-mono text-sky-600 bg-sky-100/70 px-2 py-0.5 rounded-md">Tool</span>
              </button>
            </div>
          )}

          {/* Modules */}
          <div>
            <p className="px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </p>
            <div className="space-y-0.5">
              {quickNavItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Operational Records */}
          {mockRecords.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Operational Records
              </p>
              <div className="space-y-0.5">
                {mockRecords.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      router.push(r.href);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span className="font-medium truncate">{r.title}</span>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                      {r.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[11.5px] text-slate-500">
          <span>PetroLedger Energy OS Quick Navigator</span>
          <div className="flex items-center gap-3">
            <span>Navigate <kbd className="font-mono font-semibold">↑↓</kbd></span>
            <span>Select <kbd className="font-mono font-semibold">↵</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
}
