"use client";

import Image from "next/image";
import { useState } from "react";
import { Icon, LogoMark, Wordmark } from "./icons";
import { Reveal } from "./primitives";
import { BRAND, BRAND_FULL } from "@/lib/brand";

const hubs = [
  { city: "Lagos", coord: "6.4550° N, 3.3841° E" },
  { city: "Port Harcourt", coord: "4.8156° N, 7.0498° E" },
  { city: "Warri", coord: "5.5160° N, 5.7500° E" },
  { city: "Onne", coord: "4.7238° N, 7.1517° E" },
];

const input =
  "mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20";

export function Closing() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <>
      <section id="contact" className="relative scroll-mt-24 px-5 py-20 sm:px-8">
        <Reveal className="relative isolate mx-auto max-w-[1240px] overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-emerald-50/30 via-white to-slate-50 shadow-xl shadow-slate-900/5">
          <Image src="/images/rig-dusk.jpg" alt="Offshore platform at dusk" fill sizes="100vw" className="-z-10 object-cover object-[70%_40%] opacity-[0.06] mix-blend-multiply" />
          <div className="absolute -bottom-40 right-10 -z-10 h-[420px] w-[620px] rounded-full bg-emerald-100/60 blur-[120px]" />
          <div className="grid gap-10 p-6 sm:p-12 lg:grid-cols-[1.15fr_0.85fr] lg:p-16">
            <div className="flex flex-col">
              <LogoMark size={48} />
              <h2 className="mt-8 text-[2rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-slate-900 sm:text-4xl lg:text-[3rem]">
                Put every litre <span className="text-emerald-600">on record.</span>
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">
                Pick one module and one KPI. We run a 60-day paid pilot on your vessels, lines or trucks, then report the result back to you
                in audited numbers.
              </p>
              <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
                {[
                  ["1", "Pick a module", "BunkerFlow, HaulTrac or SafePass"],
                  ["2", "Agree one KPI", "Shrinkage, TAT or reconciliation time"],
                  ["3", "Measure for 60 days", "Pilot fee credited if you convert"],
                ].map(([n, t, d]) => (
                  <div key={n} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-[12px] font-extrabold text-emerald-700 border border-emerald-200/60">{n}</span>
                    <p className="mt-3 text-[14px] font-bold text-slate-900">{t}</p>
                    <p className="mt-0.5 text-[12px] text-slate-500">{d}</p>
                  </div>
                ))}
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-10">
                {hubs.map((h) => (
                  <div key={h.city} className="rounded-lg border border-slate-200/80 bg-white/90 px-3.5 py-2 shadow-sm">
                    <p className="text-[13px] font-semibold text-slate-800">
                      {h.city}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-500">{h.coord}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8 self-center">
              {sent ? (
                <div className="rise py-8 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Icon.Check size={28} strokeWidth={2.4} />
                  </span>
                  <p className="mt-5 text-xl font-extrabold text-slate-900">Request received</p>
                  <p className="mt-2 text-sm text-slate-500">
                    We&apos;ll contact <span className="font-semibold text-slate-900">{email}</span> within one business day to scope your pilot.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSent(true);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <p className="text-xl font-extrabold text-slate-900">Start a 60-day pilot</p>
                    <p className="mt-1 text-[13px] text-slate-500">Or book a private demo on your own data.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[12px] font-semibold text-slate-700">Full name</span>
                      <input required type="text" placeholder="Adaeze Okafor" className={input} />
                    </label>
                    <label className="block">
                      <span className="text-[12px] font-semibold text-slate-700">Company</span>
                      <input required type="text" placeholder="Delta Marine Services Ltd" className={input} />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-[12px] font-semibold text-slate-700">Work email</span>
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ops@company.com" className={input} />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[12px] font-semibold text-slate-700">Your business</span>
                      <select className={input}>
                        <option>Multi-service contractor</option>
                        <option>Bulk haulage</option>
                        <option>Marine fuel & lubes</option>
                        <option>Pipeline integrity & NDT</option>
                        <option>Depot or terminal</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[12px] font-semibold text-slate-700">Pilot KPI</span>
                      <select className={input}>
                        <option>Shrinkage %</option>
                        <option>Turnaround time</option>
                        <option>Reconciliation time</option>
                        <option>Permit compliance</option>
                      </select>
                    </label>
                  </div>
                  <button type="submit" className="btn-green flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 transition">
                    Request pilot
                  </button>
                  <p className="text-center text-[11px] text-slate-500">No commitment. Your data stays confidential under NDPA 2023.</p>
                </form>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50/70">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <LogoMark size={34} />
              <Wordmark />
            </div>
            <p className="mt-5 max-w-xs text-[13px] leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-900">Every litre, every line, on record.</span> One operating system for
              energy service contractors.
            </p>
          </div>
          {[
            { h: "Modules", l: ["BunkerFlow", "PipeIntegrity", "RefineryLink", "HaulTrac", "EPC-Link", "SafePass"] },
            { h: "More modules", l: ["MarineStores", "TankWorks", "Compliance Shield", "Billing", "Client Portal", "Owner Dashboard"] },
            { h: "Company", l: ["Platform", "Compliance", "Pricing", "Roadmap", "Security", "Contact"] },
          ].map((c) => (
            <div key={c.h}>
              <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-slate-400">{c.h}</p>
              <ul className="mt-4 space-y-2.5">
                {c.l.map((x) => (
                  <li key={x}>
                    <a
                      href={c.h === "Company" ? `#${x === "Platform" ? "platform" : x.toLowerCase()}` : "#modules"}
                      className="text-[13px] text-slate-600 transition hover:text-emerald-600"
                    >
                      {x}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200/80">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-5 py-6 text-[12px] text-slate-500 sm:px-8 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} {BRAND_FULL}. {BRAND.tagline}</p>
            <p className="text-slate-400">
              NDPA 2023 · ISO 27001 readiness · SOC 2 Type II compliant pipeline
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

