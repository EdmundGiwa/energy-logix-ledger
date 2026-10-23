"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { Reveal, SectionHeading, Spotlight, useInView } from "./primitives";
import { NewBadge } from "@/components/ui/NewBadge";

const stages = [
  {
    key: "base",
    title: "Supply base",
    where: "Onne · Lekki · Warri · Escravos",
    icon: Icon.Cube,
    modules: ["OffshoreLink", "EquipTrack"],
    points: [
      "Voyage and deck plan for a multi-drop PSV run",
      "Every lift tagged, weighed and matched to its CCU and sling certificate",
      "Dangerous goods segregation checked before load-out",
    ],
    stat: ["Lifts tagged", "46 / 46"],
  },
  {
    key: "bulk",
    title: "Bulk & fuel loading",
    where: "Base tank farm · bunker barge",
    icon: Icon.Barrel,
    modules: ["RigSupply", "BunkerFlow"],
    points: [
      "MGO, drill water, potable water, liquid mud and brine allocated to vessel tanks",
      "Cement, barite and bentonite tonnage per dry bulk tank",
      "Sample seals and density at 15 °C on every fuel load",
    ],
    stat: ["Tanks allocated", "7 of 8"],
  },
  {
    key: "crew",
    title: "Crew & provisions",
    where: "Heliport · crew boat jetty · galley stores",
    icon: Icon.Users,
    modules: ["CrewTransit", "SafePass", "MarineStores"],
    points: [
      "Seat confirmed only when BOSIET, HUET and medical are valid",
      "Provisions sized from live personnel-on-board counts",
      "Chilled and frozen stores packed into CCUs for the next sailing",
    ],
    stat: ["Seats cleared", "11 of 12"],
  },
  {
    key: "transit",
    title: "Sailing",
    where: "Gulf of Guinea routes",
    icon: Icon.Anchor,
    modules: ["VesselOps", "MarineGuard"],
    points: [
      "Voyage risk assessment and security escort booking",
      "MDAT-GoG reports and BMP West Africa checklist on record",
      "Daily vessel report: position, DP hours, fuel and water remaining on board",
    ],
    stat: ["Escort", "Rendezvous 17:30"],
  },
  {
    key: "deliver",
    title: "At the installation",
    where: "Rig · FPSO · platform",
    icon: Icon.Pen,
    modules: ["RigSupply", "OffshoreLink"],
    points: [
      "Hose transfers reconciled: vessel meter vs. rig sounding",
      "Proof of delivery signed by the offshore materials coordinator",
      "Days-of-supply forecast updated for every product on the rig",
    ],
    stat: ["Transfer variance", "0.18%"],
  },
  {
    key: "backload",
    title: "Backload & waste",
    where: "Back to base, then licensed disposal",
    icon: Icon.Sync,
    modules: ["OffshoreLink", "EnviroLedger", "EquipTrack"],
    points: [
      "Returned CCUs, skips and rental tools reconciled against what went out",
      "Waste transfer notes closed with a disposal certificate",
      "Rental clock stopped the day equipment comes ashore",
    ],
    stat: ["CCUs unaccounted", "0"],
  },
];

const buyers = [
  { t: "Offshore supply vessel owners", d: "PSV, AHTS and crew boat operators chartering to IOCs and indigenous producers.", icon: Icon.Ship },
  { t: "Logistics & supply base operators", d: "Quayside, warehouse and yard teams running load-out and backload for several operators.", icon: Icon.Cube },
  { t: "Fuel, water & mud suppliers", d: "Firms delivering diesel, drill water, drilling fluids and dry bulk to rigs and FPSOs.", icon: Icon.Barrel },
  { t: "Chandlers & provisioners", d: "Ship chandlers sending food, bonded stores, spares and consumables offshore.", icon: Icon.Package },
  { t: "Rental tool & equipment firms", d: "Owners of CCUs, lifting gear and well tools who bill by the day offshore.", icon: Icon.QR },
  { t: "Operator logistics departments", d: "Producers' own materials, aviation and marine teams coordinating every vendor.", icon: Icon.Building },
];

const STEP = 3600;

export function Offshore() {
  const [i, setI] = useState(0);
  const { ref, inView } = useInView<HTMLDivElement>(0.25);
  const s = stages[i];
  const SI = s.icon;

  useEffect(() => {
    if (!inView || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((x) => (x + 1) % stages.length), STEP);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <section id="offshore" className="relative scroll-mt-24 overflow-hidden px-5 py-24 sm:px-8 md:py-28 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
          <Reveal>
            <a
              href="#modules"
              className="group mb-5 inline-flex items-center gap-2.5 rounded-full border border-emerald-200/80 bg-white py-1 pl-1 pr-3.5 text-[12.5px] font-semibold text-slate-700 shadow-xs transition hover:border-emerald-300 hover:text-emerald-800"
            >
              <NewBadge />
              Seven offshore modules just added
              <Icon.Arrow size={13} className="transition group-hover:translate-x-0.5" />
            </a>
          </Reveal>
          <SectionHeading
            eyebrow="Base to rig and back · Offshore suite"
            title={
              <>
                Everything that goes offshore, <span className="text-gradient">and everything that comes back.</span>
              </>
            }
            sub="Rigs, FPSOs and platforms depend on a steady chain of vessels, fuel, water, mud, food, spares, people and equipment. Offshora puts every hand-off from the supply base to the installation, and back to shore, on one signed record."
          />
          </div>
          <Reveal className="flex gap-3">
            {[
              ["7", "offshore modules"],
              ["6", "hand-offs"],
              ["1", "audit trail"],
            ].map(([a, b]) => (
              <div key={b} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center shadow-xs">
                <p className="text-2xl font-extrabold text-slate-900">{a}</p>
                <p className="text-[12px] font-medium text-slate-500">{b}</p>
              </div>
            ))}
          </Reveal>
        </div>

        <Reveal className="mt-14">
          <div ref={ref} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_35px_-10px_rgba(15,23,42,0.06)] sm:p-8">
            {/* Stepper */}
            <ol className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {stages.map((st, k) => {
                const on = k === i;
                const done = k < i;
                const I = st.icon;
                return (
                  <li key={st.key} className="min-w-[150px] flex-1">
                    <button
                      type="button"
                      onClick={() => setI(k)}
                      aria-current={on ? "step" : undefined}
                      className={`group flex w-full flex-col gap-2 rounded-2xl border p-3 text-left transition ${
                        on ? "border-emerald-300 bg-emerald-50/70" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                            on ? "bg-emerald-600 text-white" : done ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          <I size={16} />
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">{String(k + 1).padStart(2, "0")}</span>
                      </span>
                      <span className={`text-[13px] font-bold ${on ? "text-emerald-900" : "text-slate-800"}`}>{st.title}</span>
                      <span className="h-1 overflow-hidden rounded-full bg-slate-100">
                        <span
                          key={on ? `on-${i}` : "off"}
                          className="block h-full origin-left rounded-full bg-emerald-500"
                          style={on ? { animation: `progress ${STEP}ms linear forwards` } : { transform: `scaleX(${done ? 1 : 0})` }}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* Detail */}
            <div key={s.key} className="fade-in mt-6 grid gap-6 md:grid-cols-[1.3fr_1fr]">
              <div>
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-200/80 bg-emerald-50 text-emerald-800">
                    <SI size={22} />
                  </span>
                  <div>
                    <p className="text-[20px] font-extrabold tracking-tight text-slate-900">{s.title}</p>
                    <p className="text-[13px] text-slate-500">{s.where}</p>
                  </div>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {s.points.map((p, k) => (
                    <li key={p} className="rise flex gap-2.5 text-[14px] leading-relaxed text-slate-700" style={{ animationDelay: `${k * 0.06}s` }}>
                      <span className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-700">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Handled by</p>
                <div className="flex flex-wrap gap-2">
                  {s.modules.map((m) => (
                    <a
                      key={m}
                      href="#modules"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-800 shadow-xs transition hover:border-emerald-300 hover:text-emerald-800"
                    >
                      {m}
                    </a>
                  ))}
                </div>
                <div className="mt-auto rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
                  <p className="text-[11.5px] text-slate-500">{s.stat[0]}</p>
                  <p className="mt-0.5 font-mono text-[22px] font-extrabold text-slate-900">{s.stat[1]}</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Who it serves */}
        <div className="mt-16">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500">Built for every firm in the offshore supply chain</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {buyers.map((b, k) => {
              const I = b.icon;
              return (
                <Reveal key={b.t} delay={k * 60}>
                  <Spotlight className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition duration-300 hover:border-slate-300 hover:shadow-md">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-200/90 bg-emerald-50 text-emerald-800">
                      <I size={18} />
                    </span>
                    <p className="mt-4 text-[15px] font-bold text-slate-900">{b.t}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{b.d}</p>
                  </Spotlight>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
