"use client";

import { useEffect, useState } from "react";
import { Icon, LogoMark, Wordmark } from "./icons";

const links = [
  { href: "#modules", label: "Modules" },
  { href: "#platform", label: "Platform" },
  { href: "#corridor", label: "Corridor" },
  { href: "#compliance", label: "Compliance" },
  { href: "#pricing", label: "Pricing" },
  { href: "#roadmap", label: "Roadmap" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(`#${e.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    links.forEach((l) => {
      const el = document.querySelector(l.href);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <nav
        className={`mx-auto flex max-w-[1440px] items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-md border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            : "bg-white/70 backdrop-blur-sm border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        }`}
      >
        <a href="#top" className="flex items-center gap-3" aria-label="PetroLedger home">
          <LogoMark size={36} />
          <Wordmark />
        </a>

        <ul className="hidden items-center gap-1 rounded-xl bg-slate-100/70 p-1 border border-slate-200/70 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={`relative block rounded-lg px-3.5 py-1.5 text-[13.5px] font-medium transition ${
                  active === l.href
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href="/login"
            className="hidden rounded-lg px-3.5 py-2 text-[13.5px] font-medium text-slate-600 transition hover:text-slate-900 sm:block"
          >
            Sign in
          </a>
          <a
            href="/register"
            className="btn-green hidden items-center gap-1.5 rounded-xl px-4 py-2 text-[13.5px] font-semibold sm:inline-flex"
          >
            Start a pilot <Icon.ArrowUpRight size={15} />
          </a>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-800 border border-slate-200 lg:hidden"
          >
            {open ? <Icon.X size={18} /> : <Icon.Menu size={18} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="rise mx-auto mt-2 max-w-[1440px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl lg:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-lg px-4 py-3 font-medium text-slate-800 hover:bg-slate-50"
            >
              {l.label} <Icon.Chevron size={16} className="text-slate-400" />
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className="btn-green mt-2 flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 font-semibold"
          >
            Start a 60-day pilot <Icon.ArrowUpRight size={16} />
          </a>
        </div>
      )}
    </header>
  );
}
