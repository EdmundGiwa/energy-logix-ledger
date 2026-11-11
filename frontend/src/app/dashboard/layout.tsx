"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { MobileSidebar } from "@/components/dashboard/MobileSidebar";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { AstmCalculatorModal } from "@/components/dashboard/AstmCalculatorModal";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { EntitlementsProvider } from "@/components/dashboard/Entitlements";
import { ModuleGate } from "@/components/dashboard/ModuleGate";

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
    <AuthProvider>
      <EntitlementsProvider>
        <div className="dash relative isolate flex min-h-screen flex-col bg-[#f7f8f9] text-[#0a0f14]">
          <div aria-hidden className="hero-wash pointer-events-none fixed inset-x-0 top-0 -z-10 h-[380px] opacity-60 [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
          <AstmCalculatorModal open={astmOpen} onClose={() => setAstmOpen(false)} />
          <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} onOpenAstm={() => setAstmOpen(true)} />
          <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} onOpenSearch={() => setSearchOpen(true)} onOpenAstm={() => setAstmOpen(true)} />

          <div className="hidden lg:block">
            <Sidebar onOpenSearch={() => setSearchOpen(true)} onOpenAstm={() => setAstmOpen(true)} />
          </div>

          <div className="relative flex min-w-0 flex-1 flex-col lg:pl-[260px]">
            <Topbar onOpenSearch={() => setSearchOpen(true)} onOpenAstm={() => setAstmOpen(true)} onOpenMenu={() => setMobileOpen(true)} />
            <main className="flex-1 px-3 py-5 sm:px-6 lg:px-8 lg:py-7">
              <ModuleGate>{children}</ModuleGate>
            </main>
            <StatusBar onOpenAstm={() => setAstmOpen(true)} />
          </div>
        </div>
      </EntitlementsProvider>
    </AuthProvider>
  );
}
