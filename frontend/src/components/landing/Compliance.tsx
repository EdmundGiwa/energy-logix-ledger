"use client";

import { useState } from "react";
import { Icon, LogoMark } from "./icons";
import { Reveal, SectionHeading, Spotlight } from "./primitives";

const standards = [
  "NCDMB · NOGIC-JQS",
  "NUPRC Upstream Code",
  "NMDPRA Downstream",
  "NIMASA Cabotage",
  "Nigerian Ports Authority",
  "MARPOL Annex VI",
  "ASTM D1250 · 54B / 56",
  "API MPMS Manual",
  "API 1110 Hydrotest",
  "ASME B31.4 · B31.8",
  "ISO 9001 · 14001 · 45001",
  "ISO 13623 Pipeline",
  "NDPA 2023 Data Protection",
];

const matrix = [
  { reg: "NCDMB", full: "NOGICD Act 2010", kind: "Regulator", req: "Local content spend, NCFCC, NCEC, JQS registration", mods: ["EPC-Link", "Compliance Shield"] },
  { reg: "NUPRC", full: "Upstream regulator", kind: "Regulator", req: "Permits, pipeline integrity verification", mods: ["PipeIntegrity", "Compliance Shield"] },
  { reg: "NMDPRA", full: "Midstream & downstream", kind: "Regulator", req: "Wholesale metering, depot ATG accuracy", mods: ["RefineryLink"] },
  { reg: "NIMASA", full: "Maritime safety", kind: "Regulator", req: "Cabotage, crew endorsements, vessel permits", mods: ["SafePass", "Compliance Shield"] },
  { reg: "NPA", full: "Nigerian Ports Authority", kind: "Regulator", req: "Harbour husbandry, bunkering notices", mods: ["BunkerFlow"] },
  { reg: "MARPOL VI", full: "IMO convention", kind: "Convention", req: "Fuel quality documentation, sealed sample tags", mods: ["BunkerFlow"] },
  { reg: "ASTM D1250", full: "Tables 54B / 56", kind: "Standard", req: "Volume correction and density reduction", mods: ["BunkerFlow", "RefineryLink"] },
  { reg: "API MPMS", full: "Measurement standard", kind: "Standard", req: "Custody transfer accuracy and ullage calculations", mods: ["RefineryLink"] },
  { reg: "API 1110", full: "ASME B31.4 / B31.8", kind: "Standard", req: "Hydrotest hold validation and pressure logs", mods: ["PipeIntegrity"] },
  { reg: "ISO 9001 · 14001", full: "Management systems", kind: "Standard", req: "Operational quality and environmental safety", mods: ["Compliance Shield"] },
  { reg: "ISO 13623", full: "Pipeline systems", kind: "Standard", req: "Pipeline integrity and cathodic protection surveys", mods: ["PipeIntegrity"] },
  { reg: "NDPA 2023", full: "Data privacy law", kind: "Law", req: "Personal data security of crew and drivers", mods: ["Core Platform"] },
];

const kinds = ["All", "Regulator", "Standard", "Convention", "Law"] as const;

export function Compliance() {
  const [k, setK] = useState<(typeof kinds)[number]>("All");
  const rows = matrix.filter((r) => k === "All" || r.kind === k);

  return (
    <section id="compliance" className="relative scroll-mt-24 py-24 md:py-28 bg-white border-t border-slate-100">
      {/* Standards marquee */}
      <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
        <div className="animate-marquee flex w-max gap-3">
          {[...standards, ...standards].map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[12.5px] font-semibold text-slate-700"
            >
              <span className="font-bold text-emerald-600">✓</span> {t}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-[1240px] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              eyebrow="Compliance"
              title={
                <>
                  Audit-ready for <span className="text-gradient">every regulator.</span>
                </>
              }
              sub="Each statutory rule maps directly to the operational module that logs the evidence. PetroLedger exports into NCDMB's NOGIC-JQS portal format, providing airtight verification."
            />

            <Reveal delay={100} className="mt-8">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-300 bg-white text-emerald-800">
                    <Icon.Shield size={19} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">Mandatory check</p>
                    <p className="text-[16px] font-extrabold text-slate-900">NCFCC readiness checker</p>
                  </div>
                </div>
                <p className="mt-3 text-[13.5px] leading-relaxed text-slate-700">
                  Expired NCFCC blocks equipment NCEC certificates and IOC approvals. The built-in monitor flags statutory gaps months before audit dates.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["90 d alert", "60 d warning", "30 d critical", "7 d lock"].map((d) => (
                    <span key={d} className="rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-900">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          <div>
            <Reveal className="flex flex-wrap gap-1.5">
              {kinds.map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => setK(x)}
                  className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition ${
                    k === x
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {x}
                </button>
              ))}
            </Reveal>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {rows.map((r, i) => (
                <Spotlight
                  key={`${k}-${r.reg}`}
                  className="rise rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs transition duration-300 hover:border-slate-300 hover:shadow-sm"
                  style={{ animationDelay: `${i * 0.035}s` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-slate-900">{r.reg}</p>
                      <p className="truncate text-[11.5px] text-slate-500">{r.full}</p>
                    </div>
                    <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {r.kind}
                    </span>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-snug text-slate-600">{r.req}</p>
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {r.mods.map((m) => (
                      <span key={m} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                        {m}
                      </span>
                    ))}
                  </div>
                </Spotlight>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

type Status = "Standard" | "Add-on" | "Hardware" | "Connector pack" | "Vendor adapter" | "Export / upload" | "Needs agreement";
const integrations: { name: string; purpose: string; status: Status; icon: keyof typeof Icon }[] = [
  { name: "Lagos e-Call-Up", purpose: "Truck scheduling, holding park reads", status: "Needs agreement", icon: "Truck" },
  { name: "Dangote gantry", purpose: "Loading orders, meter reconciliation", status: "Needs agreement", icon: "Tank" },
  { name: "NOGIC-JQS", purpose: "NCDMB registration, tenders, M&E export", status: "Export / upload", icon: "Building" },
  { name: "NCFCC portal", purpose: "Compliance certificate validation", status: "Export / upload", icon: "Shield" },
  { name: "Weighbridges", purpose: "Tare and gross weight capture", status: "Vendor adapter", icon: "Scale" },
  { name: "AccuLoad · Smith Meter", purpose: "Gantry meter tickets", status: "Vendor adapter", icon: "Gauge" },
  { name: "Telematics", purpose: "Geofencing, valve status telematics", status: "Vendor adapter", icon: "Satellite" },
  { name: "SAP · Oracle · Odoo", purpose: "ERP financial data exchange", status: "Connector pack", icon: "Database" },
  { name: "QuickBooks · Sage", purpose: "General ledger synchronisation", status: "Connector pack", icon: "Receipt" },
  { name: "WhatsApp Business", purpose: "Crew certificate alerts", status: "Add-on", icon: "Message" },
  { name: "Paystack · Flutterwave", purpose: "Payment reconciliation", status: "Standard", icon: "Wallet" },
  { name: "Zebra · Honeywell", purpose: "Industrial handheld scanners", status: "Hardware", icon: "QR" },
];

const statusCls: Record<Status, string> = {
  Standard: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  "Add-on": "border border-amber-200 bg-amber-50 text-amber-800",
  Hardware: "border border-slate-200 bg-slate-50 text-slate-700",
  "Connector pack": "border border-sky-200 bg-sky-50 text-sky-800",
  "Vendor adapter": "border border-sky-200 bg-sky-50 text-sky-800",
  "Export / upload": "border border-slate-200 bg-slate-50 text-slate-700",
  "Needs agreement": "border border-rose-200 bg-rose-50 text-rose-800",
};

function Orbit({ active, setActive }: { active: number; setActive: (i: number) => void }) {
  const inner = integrations.slice(0, 5);
  const outer = integrations.slice(5);
  const ring = (items: typeof integrations, r: number, offset: number, reverse: boolean, base: number) => (
    <div className={`absolute inset-0 ${reverse ? "counter-orbit" : "orbit"}`} style={{ animationDuration: reverse ? "80s" : "60s" }}>
      {items.map((it, i) => {
        const a = (i / items.length) * Math.PI * 2 + offset;
        const idx = base + i;
        const I = Icon[it.icon];
        const on = idx === active;
        return (
          <button
            key={it.name}
            type="button"
            onMouseEnter={() => setActive(idx)}
            onFocus={() => setActive(idx)}
            onClick={() => setActive(idx)}
            aria-label={it.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${50 + r * Math.cos(a)}%`, top: `${50 + r * Math.sin(a)}%` }}
          >
            <span className={`block ${reverse ? "orbit" : "counter-orbit"}`} style={{ animationDuration: reverse ? "80s" : "60s" }}>
              <span
                className={`grid h-11 w-11 place-items-center rounded-2xl transition duration-300 sm:h-12 sm:w-12 ${
                  on
                    ? "scale-110 bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-300"
                    : "border border-slate-200 bg-white text-slate-700 shadow-xs hover:border-emerald-500 hover:text-emerald-700"
                }`}
              >
                <I size={19} />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]">
      <div className="absolute inset-[18%] rounded-full border border-slate-200" />
      <div className="absolute inset-[2%] rounded-full border border-dashed border-slate-200" />
      <div className="absolute inset-[30%] rounded-full bg-emerald-50 blur-2xl" />
      {ring(inner, 32, -Math.PI / 2, false, 0)}
      {ring(outer, 48, -Math.PI / 2 + 0.3, true, 5)}
      <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center">
        <span className="relative grid h-22 w-22 place-items-center rounded-2xl border border-slate-200 bg-white shadow-xl">
          <LogoMark size={48} />
        </span>
      </div>
    </div>
  );
}

export function Integrations() {
  const [active, setActive] = useState(7);
  const a = integrations[active];
  const AI = Icon[a.icon];

  return (
    <section id="integrations" className="relative scroll-mt-24 px-5 pb-24 sm:px-8 md:pb-28 bg-white">
      <div className="mx-auto max-w-[1240px]">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_35px_-10px_rgba(15,23,42,0.06)] sm:p-10">
          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <SectionHeading
                eyebrow="Integrations"
                title={
                  <>
                    Connector-first. <span className="text-gradient">Fits your ERP.</span>
                  </>
                }
                sub="Large energy contractors keep SAP, Oracle or Odoo, while PetroLedger delivers operational field synchronization. Every connector status is transparent."
              />

              <div key={active} className="rise mt-7 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800">
                  <AI size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-slate-900">{a.name}</p>
                  <p className="text-[13px] text-slate-500">{a.purpose}</p>
                </div>
                <span className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold ${statusCls[a.status]}`}>
                  {a.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {integrations.map((it, i) => (
                  <button
                    key={it.name}
                    type="button"
                    onClick={() => setActive(i)}
                    className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                      i === active
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {it.name}
                  </button>
                ))}
              </div>
            </div>

            <Reveal>
              <Orbit active={active} setActive={setActive} />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
