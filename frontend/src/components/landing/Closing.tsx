"use client";

import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { LogoMark, Wordmark } from "./icons";
import { BlurText, Corners, Reveal } from "./primitives";
import { SegmentForm } from "./SegmentForm";

function PanelCurves() {
  const d = "M0 0 C 0 120, 120 140, 120 260 S 0 400, 0 520";
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 1200 520" preserveAspectRatio="none">
      {[120, 210].map((x, i) => (
        <g key={x}>
          <path d={d} transform={`translate(${x} 0)`} pathLength={1} className="draw-path" fill="none" stroke="rgba(5,150,105,0.35)" strokeWidth="1" style={{ animationDelay: `${i * 0.25}s` }} />
          <path d={d} transform={`translate(${1200 - x} 0) scale(-1 1)`} pathLength={1} className="draw-path" fill="none" stroke="rgba(5,150,105,0.35)" strokeWidth="1" style={{ animationDelay: `${0.15 + i * 0.25}s` }} />
        </g>
      ))}
    </svg>
  );
}

const columns = [
  {
    h: "Sections",
    l: [
      ["Platform", "#stories"],
      ["How it works", "#how"],
      ["Modules", "#modules"],
      ["Compliance", "#compliance"],
      ["Pricing", "#pricing"],
      ["Pitch deck", "/pitch"],
    ],
  },
  {
    h: "Modules",
    l: [
      ["BunkerFlow", "#modules"],
      ["HaulTrac", "#modules"],
      ["PipeIntegrity", "#modules"],
      ["EPC-Link", "#modules"],
      ["SafePass", "#modules"],
      ["Compliance Shield", "#modules"],
    ],
  },
  {
    h: "Company",
    l: [
      ["Book a demo", "/book-demo"],
      ["Sign in", "/login"],
      ["Security", "#security"],
      ["Roadmap", "#roadmap"],
      ["support@ofshora.com", "mailto:support@ofshora.com"],
    ],
  },
];

export function Closing() {
  return (
    <>
      <section id="contact" className="scroll-mt-24 px-4 py-16 sm:px-8 sm:py-24">
        <div className="hero-wash relative isolate mx-auto max-w-[1280px] overflow-hidden rounded-[28px] px-5 py-20 text-center sm:px-10 sm:py-28">
          <div aria-hidden className="tile-pattern absolute inset-0 -z-10" />
          <PanelCurves />
          <div className="corners relative mx-auto max-w-[760px] px-4 py-8 text-slate-400 sm:px-10">
            <Corners />
            <h2 className="font-display text-[2.4rem] leading-[1.04] text-[#0a0f14] sm:text-[3.4rem] lg:text-[3.9rem]">
              <BlurText>
                <>
                  Put every <span className="text-emerald-600">litre, line and permit</span> on record.
                </>
              </BlurText>
            </h2>
            <Reveal delay={200}>
              <p className="mx-auto mt-5 max-w-[520px] text-[16px] text-slate-600 sm:text-[17px]">
                Book a 45-minute demo built around what you run. We show only the modules you need.
              </p>
            </Reveal>
          </div>
          <Reveal delay={300}>
            <SegmentForm id="closing-segment" className="relative mt-8" />
            <p className="font-label relative mt-5 text-[12px] text-slate-500">Google Meet · Zoom · Teams · WhatsApp · On-site</p>
          </Reveal>
        </div>
      </section>

      <footer className="px-5 pb-10 pt-12 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1360px] gap-12 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Link href="#top" className="flex items-center gap-3" aria-label="Offshora home">
              <LogoMark size={40} />
              <Wordmark />
            </Link>
            <p className="mt-6 max-w-[280px] text-[15px] text-[#0a0f14]">{BRAND.tagline}</p>
            <p className="mt-2 max-w-[300px] text-[13.5px] leading-relaxed text-slate-500">One operating system for the contractors who move energy.</p>
          </div>
          {columns.map((c) => (
            <div key={c.h}>
              <p className="font-display text-[2rem] leading-none text-slate-500">{c.h}</p>
              <ul className="mt-7 space-y-3.5">
                {c.l.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-[15px] text-slate-700 transition hover:text-emerald-600">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-20 flex max-w-[1360px] flex-col gap-2 border-t border-slate-200 pt-6 text-[13.5px] text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {BRAND.name} · From Lagos</p>
          <p className="font-label text-[12px] text-slate-400">Personal data handled under the Nigeria Data Protection Act 2023</p>
        </div>
      </footer>
    </>
  );
}
