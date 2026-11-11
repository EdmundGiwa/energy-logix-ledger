"use client";

import { useEffect } from "react";
import { SidebarContent } from "./Sidebar";

export function MobileSidebar({ open, onClose, onOpenSearch, onOpenAstm }: { open: boolean; onClose: () => void; onOpenSearch?: () => void; onOpenAstm?: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="lg:hidden">
      <div className="fixed inset-0 z-50 bg-[#0a0f14]/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" aria-label="Navigation" className="modal-in fixed inset-y-0 left-0 z-50 w-[290px] border-r border-slate-200 bg-white shadow-2xl">
        <button type="button" onClick={onClose} aria-label="Close menu" className="absolute right-3 top-4 z-10 grid h-9 w-9 place-items-center rounded-lg text-[26px] font-light leading-none text-slate-500 hover:bg-slate-100">
          <span className="rotate-45">+</span>
        </button>
        <SidebarContent
          onNavigate={onClose}
          onOpenSearch={() => {
            onClose();
            onOpenSearch?.();
          }}
          onOpenAstm={() => {
            onClose();
            onOpenAstm?.();
          }}
        />
      </aside>
    </div>
  );
}
