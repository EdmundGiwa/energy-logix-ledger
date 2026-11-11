"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, LogoMark, Wordmark } from "./icons";
import { BlurText, Corners, Reveal } from "./primitives";

function PanelCurves() {
  const d = "M0 0 C 0 140, 110 170, 110 320 S 0 480, 0 640 S 110 800, 110 960";
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 600 960" preserveAspectRatio="none">
      {[430, 500].map((x, i) => (
        <path key={x} d={d} transform={`translate(${x} 0)`} pathLength={1} className="draw-path" fill="none" stroke="rgba(5,150,105,0.3)" strokeWidth="1" style={{ animationDelay: `${0.2 + i * 0.25}s` }} />
      ))}
    </svg>
  );
}

/**
 * Split page for sign-in and booking: an inset brand panel in the landing-page style
 * (emerald wash, tile grid, drawn curves, crop marks) beside a clean form column.
 */
export function AuthShell({
  eyebrow,
  title,
  sub,
  aside,
  topLink,
  children,
}: {
  eyebrow: string;
  /** Rich title; build it in a client component (BlurText walks its children). */
  title: ReactNode;
  sub: ReactNode;
  aside?: ReactNode;
  topLink: { prompt: string; label: string; href: string };
  children: ReactNode;
}) {
  return (
    <div className="landing min-h-screen bg-white lg:grid lg:grid-cols-[minmax(420px,0.9fr)_minmax(0,1.1fr)]">
      {/* Brand panel */}
      <aside className="hidden p-3 lg:block">
        <div className="hero-wash sticky top-3 isolate flex h-[calc(100vh-24px)] flex-col overflow-hidden rounded-[24px] p-10 xl:p-12">
          <div aria-hidden className="tile-pattern absolute inset-0 -z-10" />
          <div aria-hidden className="absolute inset-0 -z-10">
            <PanelCurves />
          </div>

          <Link href="/" className="flex w-fit items-center gap-2.5" aria-label="Offshora home">
            <LogoMark size={38} />
            <Wordmark />
          </Link>

          <div className="corners mt-auto max-w-[460px] px-6 py-7 text-slate-400">
            <Corners />
            <Reveal>
              <span className="font-label inline-flex items-center gap-2 rounded-md bg-white/70 px-2.5 py-1 text-[12px] text-emerald-700 ring-1 ring-emerald-100">
                <span className="h-1.5 w-1.5 rounded-[2px] bg-emerald-500" />
                {eyebrow}
              </span>
            </Reveal>
            <h2 className="font-display mt-5 text-[2.5rem] leading-[1.04] text-[#0a0f14] xl:text-[2.9rem]">
              <BlurText>{title}</BlurText>
            </h2>
            <Reveal delay={200}>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-600">{sub}</p>
            </Reveal>
          </div>

          {aside && (
            <Reveal delay={350} className="mt-6 max-w-[460px]">
              {aside}
            </Reveal>
          )}

          <p className="font-label mt-auto pt-8 text-[11.5px] text-slate-500">© {new Date().getFullYear()} Offshora · From Lagos</p>
        </div>
      </aside>

      {/* Form column */}
      <main className="relative flex min-h-screen flex-col">
        <header className="flex h-[76px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <Link href="/" className="group flex items-center gap-2 text-[14px] text-slate-600 transition hover:text-[#0a0f14]">
            <span className="lg:hidden">
              <LogoMark size={32} />
            </span>
            <span className="hidden items-center gap-2 lg:flex">
              <Icon.Arrow size={15} className="rotate-180 transition group-hover:-translate-x-0.5" /> Back to site
            </span>
          </Link>
          <p className="text-[14px] text-slate-500">
            <span className="hidden sm:inline">{topLink.prompt} </span>
            <Link href={topLink.href} className="font-medium text-[#0a0f14] underline decoration-emerald-400 decoration-2 underline-offset-4 transition hover:text-emerald-700">
              {topLink.label}
            </Link>
          </p>
        </header>
        <div className="flex flex-1 flex-col px-5 pb-12 sm:px-8 lg:px-12">{children}</div>
      </main>
    </div>
  );
}

/** Text input styled for the auth and booking forms. */
export const fieldClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] text-[#0a0f14] placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-[4px] focus:ring-emerald-100";
