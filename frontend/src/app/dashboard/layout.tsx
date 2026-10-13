"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { MobileSidebar } from "@/components/dashboard/MobileSidebar";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { AstmCalculatorModal } from "@/components/dashboard/AstmCalculatorModal";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { DashboardBackdrop } from "@/components/dashboard/Patterns";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [astmOpen, setAstmOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K opens the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-[#f2f3f5] text-slate-900">
      <DashboardBackdrop />
      <AstmCalculatorModal open={astmOpen} onClose={() => setAstmOpen(false)} />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} onOpenAstm={() => setAstmOpen(true)} />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <Topbar onOpenSearch={() => setSearchOpen(true)} onOpenAstm={() => setAstmOpen(true)} onOpenMenu={() => setMobileOpen(true)} />

      <div className="hidden lg:block">
        <Sidebar onOpenSearch={() => setSearchOpen(true)} onOpenAstm={() => setAstmOpen(true)} />
      </div>

      <div className="relative z-10 flex flex-1 flex-col lg:pl-[92px]">
        <main className="flex-1 px-3 pb-6 pt-2 sm:px-4 lg:pl-0 lg:pr-4">{children}</main>
        <StatusBar onOpenAstm={() => setAstmOpen(true)} />
      </div>
    </div>
  );
}
