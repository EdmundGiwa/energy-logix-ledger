"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { Reveal, SectionHeading, Spotlight } from "./primitives";

const segments = [
  { n: "01", t: "Offshore logistics & supply", d: "PSV owners, supply bases, rig suppliers and chandlers serving rigs, FPSOs and platforms.", icon: Icon.Anchor },
  { n: "02", t: "Multi-service contractors", d: "Pipeline, marine services and procurement in one integrated firm.", icon: Icon.Layers },
  { n: "03", t: "Bulk haulage operators", d: "Lekki-Epe and Delta corridor fleets moving PMS, AGO and Jet A1.", icon: Icon.Truck },
  { n: "04", t: "Marine fuel & lube suppliers", d: "Lagos, Port Harcourt, Onne and Warri bunker stems with e-BDN.", icon: Icon.Ship },
  { n: "05", t: "Pipeline integrity & NDT", d: "Contractors serving IOCs requiring NCDMB-compliant audit packs.", icon: Icon.Pipe },
  { n: "06", t: "Depots & terminal yards", d: "Tank farm, weighbridge and gantry owners managing ATG balances.", icon: Icon.Tank },
];

const phases = [
  {
    p: "Phase 1",
    when: "MVP · 4–6 months",
    title: "Field verification core",
    items: [
      "Core platform: offline sync, immutable log, vault",
      "BunkerFlow: sounding correction & dual-signed e-BDN",
      "HaulTrac: dispatch e-Waybill and POD capture",
      "SafePass: PTW gating and certificate expiry locks",
      "Field pilot deployments with founding partners",
    ],
  },
  {
    p: "Phase 2",
    when: "6–9 months",
    title: "Asset integrity & local content",
    items: [
      "PipeIntegrity: pigging logs, hydrotests, NDT & CP surveys",
      "EPC-Link: NCDMB reporting and NCFCC gap checker",
      "Compliance Shield regulatory dashboard",
      "Client Verification Portal with cryptographic seals",
      "Offshore suite: OffshoreLink, RigSupply, CrewTransit and VesselOps",
    ],
  },
  {
    p: "Phase 3",
    when: "9–15 months",
    title: "Depots, terminal logistics & billing",
    items: [
      "RefineryLink: gantry ticketing, ATG & terminal automation",
      "MarineStores and TankWorks inventory costing",
      "Commercial dual-currency billing (NGN / USD)",
      "Native SAP, Oracle and Odoo ERP connectors",
      "EquipTrack rentals, MarineGuard security and EnviroLedger waste",
    ],
  },
  {
    p: "Phase 4",
    when: "15+ months",
    title: "West African maritime corridor",
    items: [
      "Whitelabel single-tenant cloud deployments",
      "e-BDN global interoperability formats",
      "Executive owner telemetry analytics",
      "Regional expansion to Ghana, Côte d'Ivoire and Cameroon",
    ],
  },
];

export function Roadmap() {
  const [active, setActive] = useState(0);

  return (
    <section id="roadmap" className="relative scroll-mt-24 px-5 py-24 sm:px-8 md:py-28 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-[1240px]">
        {/* Segments */}
        <SectionHeading
          eyebrow="Who it's for"
          title={
            <>
              Built for the contractors <span className="text-gradient">powering Nigeria&apos;s energy.</span>
            </>
          }
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((s, i) => {
            const I = s.icon;
            return (
              <Reveal key={s.n} delay={i * 70}>
                <Spotlight className="group relative h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition duration-300 hover:border-slate-300 hover:shadow-md">
                  <span className="absolute right-4 top-3 font-mono text-[40px] font-extrabold leading-none text-slate-100 transition group-hover:text-emerald-50">
                    {s.n}
                  </span>
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-200/90 bg-emerald-50 text-emerald-800">
                    <I size={20} />
                  </span>
                  <p className="mt-5 text-[15px] font-bold text-slate-900">{s.t}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{s.d}</p>
                </Spotlight>
              </Reveal>
            );
          })}
        </div>

        {/* Roadmap Timeline */}
        <div className="mt-28">
          <SectionHeading
            eyebrow="Development roadmap"
            title={
              <>
                Ship the field core first. <span className="text-gradient">Expand across the supply chain.</span>
              </>
            }
            sub="Every phase is engineered alongside petroleum domain advisors and verified through field operational pilots."
          />

          <div className="relative mt-14">
            {/* Track */}
            <div className="absolute left-0 right-0 top-[27px] hidden h-[3px] rounded-full bg-slate-200 lg:block">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-700"
                style={{ width: `${(active / (phases.length - 1)) * 100}%` }}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {phases.map((ph, i) => {
                const on = i === active;
                return (
                  <Reveal key={ph.p} delay={i * 90}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onClick={() => setActive(i)}
                      className="group block h-full w-full text-left"
                    >
                      <span
                        className={`relative z-10 grid h-14 w-14 place-items-center rounded-2xl text-[16px] font-extrabold transition duration-300 ${
                          i <= active
                            ? "bg-emerald-600 text-white shadow-md ring-4 ring-emerald-50"
                            : "border border-slate-200 bg-white text-slate-400"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div
                        className={`mt-5 h-[calc(100%-76px)] rounded-2xl p-6 transition duration-300 ${
                          on
                            ? "border-2 border-emerald-600 bg-white shadow-md ring-4 ring-emerald-50"
                            : "border border-slate-200 bg-white shadow-xs hover:border-slate-300"
                        }`}
                      >
                        <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-emerald-800">
                          {ph.p} · {ph.when}
                        </p>
                        <p className="mt-2 text-[16px] font-extrabold text-slate-900">{ph.title}</p>
                        <ul className="mt-4 space-y-2">
                          {ph.items.map((it) => (
                            <li key={it} className="flex gap-2 text-[13px] text-slate-600">
                              <span className={`mt-1 font-bold ${on ? "text-emerald-600" : "text-slate-400"}`}>•</span> {it}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </button>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
