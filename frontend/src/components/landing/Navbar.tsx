"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, LogoMark, Wordmark } from "./icons";
import { Corners } from "./primitives";

const links = [
  { href: "#stories", label: "Platform" },
  { href: "#how", label: "How it works" },
  { href: "#modules", label: "Modules" },
  { href: "#compliance", label: "Compliance" },
  { href: "#pricing", label: "Pricing" },
  { href: "/pitch", label: "Pitch deck" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background,border-color,backdrop-filter] duration-300 ${
        scrolled || open ? "border-b border-slate-200/80 bg-white/85 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10" aria-label="Main">
        <a href="#top" className="flex shrink-0 items-center gap-2.5" aria-label="Offshora home">
          <LogoMark size={34} />
          <Wordmark size="sm" />
        </a>

        <ul className="hidden items-center gap-7 lg:flex">
          {links.map((l, i) => (
            <li key={l.href}>
              <a href={l.href} className="group relative text-[14px] text-slate-600 transition hover:text-[#0a0f14]">
                {l.label}
                <sup className="font-label ml-0.5 text-[9px] text-slate-400 transition group-hover:text-emerald-600">{String(i + 1).padStart(2, "0")}</sup>
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2.5">
          <Link href="/login" className="hidden rounded-lg px-4 py-2.5 text-[14px] text-slate-700 transition hover:bg-slate-100 sm:block">
            Login
          </Link>
          <Link href="/book-demo" className="corners corners-hover cta-block hidden text-[14.5px] text-slate-500 sm:inline-flex">
            <Corners />
            <span className="arrow">
              <Icon.ArrowUpRight size={17} />
            </span>
            <span className="text-[#0a0f14]">Book a demo</span>
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="grid h-11 w-11 place-items-center rounded-lg text-[#0a0f14] transition hover:bg-slate-100 lg:hidden"
          >
            <span className={`text-[30px] font-light leading-none transition-transform duration-300 ${open ? "rotate-45" : ""}`}>+</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="rise border-t border-slate-200/80 bg-white px-5 pb-6 pt-2 lg:hidden">
          <ul>
            {links.map((l, i) => (
              <li key={l.href} className="border-b border-slate-100">
                <a href={l.href} onClick={() => setOpen(false)} className="font-display flex items-baseline justify-between py-4 text-[1.6rem] text-[#0a0f14]">
                  {l.label}
                  <span className="font-label text-[11px] text-slate-400">{String(i + 1).padStart(2, "0")}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/login" className="rounded-xl border border-slate-200 py-3 text-center text-[14.5px]">
              Login
            </Link>
            <Link href="/book-demo" className="btn-ink rounded-xl py-3 text-center text-[14.5px]">
              Book a demo
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
