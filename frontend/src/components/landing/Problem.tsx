"use client";

import { LogoMark } from "./icons";
import { Reveal, SectionHeading, Spotlight, useInView } from "./primitives";

const sources: { t: string; risk: string }[] = [
  { t: "Paper BDNs", risk: "Lost or altered" },
  { t: "Excel soundings", risk: "No audit trail" },
  { t: "WhatsApp approvals", risk: "Unsigned" },
  { t: "Clipboard permits", risk: "No gas-test lock" },
  { t: "Cert spreadsheets", risk: "Expiries missed" },
  { t: "Separate ERP", risk: "Month-end gaps" },
];

const outcomes: { t: string; d: string }[] = [
  { t: "Reconciled", d: "at every discharge" },
  { t: "Signed", d: "and tamper-evident" },
  { t: "Audit-ready", d: "for IOCs and NCDMB" },
];

const buyers = [
  {
    role: "Operations GM",
    pain: "Shrinkage and turnaround",
    line: "Soundings, meter tickets and discharges reconcile as they happen.",
  },
  {
    role: "Managing Director",
    pain: "Tenders and NCDMB status",
    line: "NCFCC readiness and NOGIC-JQS packs are ready before the tender closes.",
  },
  {
    role: "HSE Manager",
    pain: "Permit compliance",
    line: "Expired tickets block the manifest. Failed gas tests lock the permit.",
  },
];

function Convergence() {
  const { ref, inView } = useInView<HTMLDivElement>(0.25);
  const sy = sources.map((_, i) => 9 + i * 16.4);
  const oy = [22, 50, 78];

  return (
    <div ref={ref} className="relative aspect-[4/3] w-full sm:aspect-[16/11]">
      {/* Flow lines */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="flowIn" x1="0" x2="1">
            <stop offset="0" stopColor="#f43f5e" stopOpacity="0.45" />
            <stop offset="1" stopColor="#059669" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="flowOut" x1="0" x2="1">
            <stop offset="0" stopColor="#059669" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
        </defs>
        {sy.map((y, i) => (
          <path
            key={i}
            d={`M30,${y} C42,${y} 40,50 50,50`}
            fill="none"
            stroke="url(#flowIn)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            className={inView ? "flow-dash" : "opacity-0"}
            style={{ animationDelay: `${-i * 0.2}s`, transition: "opacity .6s" }}
          />
        ))}
        {oy.map((y, i) => (
          <path
            key={i}
            d={`M50,50 C60,50 58,${y} 70,${y}`}
            fill="none"
            stroke="url(#flowOut)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            className={inView ? "flow-dash" : "opacity-0"}
          />
        ))}
      </svg>

      {/* Sources */}
      {sources.map((s, i) => (
        <div
          key={s.t}
          className={`absolute left-0 w-[30%] -translate-y-1/2 transition-all duration-700 ${
            inView ? "translate-x-0 opacity-100" : "-translate-x-6 opacity-0"
          }`}
          style={{ top: `${sy[i]}%`, transitionDelay: `${i * 80}ms` }}
        >
          <div className="flex flex-col rounded-lg border border-slate-200/90 bg-slate-50/90 p-2 shadow-xs">
            <span className="truncate text-[11.5px] font-semibold text-slate-800">{s.t}</span>
            <span className="truncate text-[10px] font-medium text-rose-600">{s.risk}</span>
          </div>
        </div>
      ))}

      {/* Core OS Box */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className={`relative grid h-22 w-22 place-items-center transition duration-700 ${
            inView ? "scale-100 opacity-100" : "scale-75 opacity-0"
          }`}
        >
          <span className="absolute -inset-3 rounded-2xl bg-emerald-100/60 blur-xl" />
          <span className="relative grid h-20 w-20 place-items-center rounded-2xl border border-slate-200 bg-white shadow-lg">
            <LogoMark size={44} />
          </span>
        </div>
        <p className="mt-2 text-center text-[10.5px] font-bold uppercase tracking-[0.16em] text-emerald-800">
          Offshora
        </p>
      </div>

      {/* Outcomes */}
      {outcomes.map((o, i) => (
        <div
          key={o.t}
          className={`absolute right-0 w-[29%] -translate-y-1/2 transition-all duration-700 ${
            inView ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"
          }`}
          style={{ top: `${oy[i]}%`, transitionDelay: `${500 + i * 120}ms` }}
        >
          <div className="flex flex-col rounded-lg border border-emerald-200 bg-emerald-50/90 p-2 shadow-xs">
            <span className="truncate text-[12px] font-bold text-emerald-950">{o.t}</span>
            <span className="truncate text-[10.5px] text-emerald-700">{o.d}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Problem() {
  return (
    <section className="relative px-5 py-24 sm:px-8 md:py-28 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <SectionHeading
            eyebrow="The problem"
            title={
              <>
                Your records are scattered. <span className="text-gradient">Your liability isn&apos;t.</span>
              </>
            }
            sub="Most contractors run pigging one week, bunkering the next and haulage all year, on paper, Excel and WhatsApp. Global tools cover one step each. Offshora brings every step onto one signed ledger."
          />
          <Reveal delay={100}>
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_10px_35px_-10px_rgba(15,23,42,0.06)] sm:p-7">
              <Convergence />
            </div>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {buyers.map((b, i) => (
            <Reveal key={b.role} delay={i * 90}>
              <Spotlight className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:shadow-md">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">{b.role}</p>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                </div>
                <p className="mt-3 text-[16px] font-bold text-slate-900">{b.pain}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">{b.line}</p>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const steps = [
  {
    n: "01",
    t: "Capture in the field",
    d: "Crews log soundings, gas tests, weighbridge tickets and PODs on phone or tablet, even with no signal.",
    chips: ["Offline SQLite", "Zebra / Honeywell", "Geotagged GPS"],
  },
  {
    n: "02",
    t: "Verify automatically",
    d: "Rules check every entry: ASTM corrections, variance over 0.5%, expired certificates and failed gas tests.",
    chips: ["ASTM 54B / 56", "Safety Interlocks", "Exception alerts"],
  },
  {
    n: "03",
    t: "Seal and share",
    d: "Records are signed, locked into the audit log, and shared with clients or exported for NCDMB.",
    chips: ["Digital Signatures", "Client Portal", "NOGIC-JQS"],
  },
];

export function HowItWorks() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  return (
    <section className="relative px-5 pb-24 sm:px-8 md:pb-28 bg-white">
      <div className="mx-auto max-w-[1240px]">
        <SectionHeading
          center
          eyebrow="How it works"
          title={
            <>
              Three steps from field to <span className="text-gradient">signed record.</span>
            </>
          }
        />
        <div ref={ref} className="relative mt-14">
          {/* Connector bar */}
          <div className="absolute left-[16%] right-[16%] top-7 hidden h-[2px] bg-slate-200 md:block">
            <div
              className="h-full bg-emerald-600 transition-[width] duration-[1400ms] ease-out"
              style={{ width: inView ? "100%" : "0%" }}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className={`transition-all duration-700 ${inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
                style={{ transitionDelay: `${i * 200}ms` }}
              >
                <div className="flex justify-center">
                  <span className="relative z-10 grid h-14 w-14 place-items-center rounded-xl border border-emerald-200 bg-white font-mono text-[16px] font-extrabold text-emerald-800 shadow-sm">
                    {s.n}
                  </span>
                </div>

                <Spotlight className="mt-5 h-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xs">
                  <p className="text-[16px] font-bold text-slate-900">{s.t}</p>
                  <p className="mx-auto mt-2 max-w-[34ch] text-[13.5px] leading-relaxed text-slate-600">{s.d}</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                    {s.chips.map((c) => (
                      <span
                        key={c}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </Spotlight>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
