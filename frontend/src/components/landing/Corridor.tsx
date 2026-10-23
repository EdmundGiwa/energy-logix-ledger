"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { Reveal, SectionHeading, useInView } from "./primitives";

const stages = [
  {
    key: "gantry",
    title: "Gantry loading",
    module: "RefineryLink",
    icon: Icon.Tank,
    x: 70,
    y: 150,
    points: ["Meter ticket from AccuLoad / Smith Meter", "Quality certificate linked to batch", "GOV → NSV at standard 15 °C or 20 °C"],
    stat: ["Δ meter vs. ATG", "0.06%"],
  },
  {
    key: "weigh",
    title: "Weighbridge",
    module: "HaulTrac",
    icon: Icon.Scale,
    x: 250,
    y: 70,
    points: ["Tare and gross captured digitally", "Compartment seals logged with serials", "e-Waybill issued with QR dispatch payload"],
    stat: ["Net load", "34.6 t"],
  },
  {
    key: "park",
    title: "Holding park",
    module: "RefineryLink",
    icon: Icon.QR,
    x: 450,
    y: 140,
    points: ["Check-in by RFID or QR scan", "Slot assignment and driver accreditation", "Plans around peak-hour truck bans (5–9am, 6–10pm)"],
    stat: ["Queue position", "#14 of 62"],
  },
  {
    key: "route",
    title: "On the corridor",
    module: "HaulTrac",
    icon: Icon.Route,
    x: 650,
    y: 66,
    points: ["Geofence and compartment-valve state via telematics", "Route deviation and unapproved-stop alerts", "Fee and levy ledger with receipt photos"],
    stat: ["Deviation", "Zero alerts"],
  },
  {
    key: "pod",
    title: "Discharge & POD",
    module: "HaulTrac",
    icon: Icon.Pen,
    x: 830,
    y: 150,
    points: ["Ullage, temperature and water-paste test", "Buyer digital signature on e-Waybill", "Depot reconciliation closes immediately"],
    stat: ["Shortage variance", "0.11%"],
  },
];

const PATH = "M70,150 C140,150 170,70 250,70 C330,70 360,140 450,140 C540,140 560,66 650,66 C740,66 760,150 830,150";
const STEP = 3200;

export function Corridor() {
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
    <section id="corridor" className="relative scroll-mt-24 overflow-hidden px-5 py-24 sm:px-8 md:py-28 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <SectionHeading
            eyebrow="Depot to discharge · HaulTrac + RefineryLink"
            title={
              <>
                Follow every truck from gantry to POD, <span className="text-gradient">and close the ledger at discharge.</span>
              </>
            }
            sub="Built for the Lekki-Epe and Delta corridors: holding-park queues, RFID tagging, driver accreditation and peak-hour bans. Depot reconciliation runs at every discharge instead of at month-end."
          />
          <Reveal className="flex gap-3">
            {[
              ["5", "checkpoints"],
              ["1", "e-Waybill"],
              ["0", "month-end surprises"],
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
            {/* Interactive Route Canvas */}
            <div className="relative hidden md:block">
              <svg viewBox="0 0 900 220" className="w-full">
                <defs>
                  <linearGradient id="routeG" x1="0" x2="1">
                    <stop offset="0" stopColor="#059669" />
                    <stop offset="1" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <path d={PATH} stroke="#f1f5f9" strokeWidth="24" fill="none" strokeLinecap="round" />
                <path d={PATH} stroke="url(#routeG)" strokeWidth="3" fill="none" strokeDasharray="10 10" className="animate-dash" />
                
                {stages.map((st, k) => {
                  const on = k === i;
                  const done = k < i;
                  return (
                    <g key={st.key} onClick={() => setI(k)} className="cursor-pointer">
                      {on && <circle cx={st.x} cy={st.y} r="32" fill="rgba(16,185,129,0.15)" className="animate-glow" />}
                      <circle
                        cx={st.x}
                        cy={st.y}
                        r="20"
                        fill={on ? "#059669" : done ? "#f1f5f9" : "#ffffff"}
                        stroke={on || done ? "#059669" : "#cbd5e1"}
                        strokeWidth="2"
                        style={{ transition: "fill .4s" }}
                      />
                      <text x={st.x} y={st.y + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill={on ? "#ffffff" : done ? "#047857" : "#64748b"}>
                        {k + 1}
                      </text>
                      <text
                        x={st.x}
                        y={st.y + (st.y < 100 ? -32 : 42)}
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="700"
                        fill={on ? "#0f172a" : "#64748b"}
                      >
                        {st.title}
                      </text>
                    </g>
                  );
                })}

                {/* Animated Truck Pulse */}
                <g>
                  <circle r="7" fill="#ffffff" stroke="#059669" strokeWidth="3.5">
                    <animateMotion dur={`${STEP * stages.length}ms`} repeatCount="indefinite" path={PATH} />
                  </circle>
                </g>
              </svg>
            </div>

            {/* Mobile stepper tabs */}
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:hidden">
              {stages.map((st, k) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setI(k)}
                  className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold transition ${
                    k === i ? "bg-emerald-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {k + 1}. {st.title}
                </button>
              ))}
            </div>

            {/* Detail info */}
            <div key={s.key} className="rise relative mt-8 grid gap-5 border-t border-slate-100 pt-6 lg:grid-cols-[1.2fr_1fr_0.8fr]">
              <div className="flex gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800">
                  <SI size={22} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">{s.module}</p>
                  <p className="text-xl font-extrabold text-slate-900">{s.title}</p>
                  <div className="mt-2.5 h-1.5 w-48 overflow-hidden rounded-full bg-slate-100">
                    <div key={i} className="h-full origin-left bg-emerald-600" style={{ animation: `progress ${STEP}ms linear forwards` }} />
                  </div>
                </div>
              </div>

              <ul className="space-y-2">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-2 text-[13px] text-slate-700">
                    <span className="font-bold text-emerald-600">✓</span> {p}
                  </li>
                ))}
              </ul>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[12px] font-medium text-slate-500">{s.stat[0]}</p>
                <p className="mt-0.5 text-xl font-extrabold text-slate-900">{s.stat[1]}</p>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800">
                <Icon.Plug size={18} />
              </span>
              <div>
                <p className="text-[15px] font-bold text-slate-900">Lagos e-Call-Up connector</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                  The e-Call-Up system is run by the Lagos State Government. Offshora integrates as API access becomes verified. Until then, the holding-park queue manager runs independently offline and online.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800">
                <Icon.Scale size={18} />
              </span>
              <div>
                <p className="text-[15px] font-bold text-slate-900">Neutral on fees, firm on evidence</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                  The fee and levy ledger records each per-truck and holding-park charge with digital receipt evidence, allowing operators to settle disputes on verified facts without friction.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
