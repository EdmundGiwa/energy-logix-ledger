"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { Reveal, SectionHeading } from "./primitives";

type Cur = "USD" | "NGN";

const tiers = [
  {
    name: "Micro Haulage",
    badge: "New",
    usd: 3600,
    ngn: 5_500_000,
    scope: "Up to 10 trucks · 1 depot site",
    features: ["HaulTrac lite module", "Digital e-Waybill", "2 administrative seats", "100% offline field app"],
  },
  {
    name: "Starter",
    usd: 9500,
    ngn: 14_500_000,
    scope: "Up to 35 crew · 2 vessels or 10 trucks",
    features: ["SafePass and field PTW", "BunkerFlow or HaulTrac", "2 administrative seats", "Setup onboarding included"],
  },
  {
    name: "Growth",
    featured: true,
    usd: 22500,
    ngn: 34_000_000,
    scope: "Up to 120 crew · 6 vessels · 30 trucks · 2 yards",
    features: ["BunkerFlow, PipeIntegrity, HaulTrac", "Compliance Shield suite", "NCFCC checker and JQS export", "8 administrative seats"],
  },
  {
    name: "Enterprise",
    usd: 48000,
    ngn: 72_000_000,
    scope: "Up to 400 crew · 15 vessels · 100 trucks · unlimited yards",
    features: ["Full suite incl. RefineryLink, EPC-Link", "Client Verification Portal", "Full API access", "24/7 dedicated account team"],
  },
  {
    name: "Whitelabel",
    from: true,
    usd: 75000,
    ngn: 112_500_000,
    scope: "Dedicated single-tenant cloud · custom domain",
    features: ["Everything in Enterprise", "Your custom corporate branding", "Private dedicated database", "SAP / Oracle live connectors"],
  },
];

const addons: { name: string; usd: number; ngn: number; note?: string }[] = [
  { name: "Lagos e-Call-Up connector", usd: 500, ngn: 750_000, note: "Upon confirmed API integration" },
  { name: "Gantry / Dangote bridge", usd: 500, ngn: 750_000, note: "Commercial gateway agreement" },
  { name: "Intelligent pigging ingestion", usd: 750, ngn: 1_125_000 },
  { name: "WhatsApp crew-expiry bot", usd: 250, ngn: 375_000 },
  { name: "Cathodic protection & asset integrity", usd: 400, ngn: 600_000 },
  { name: "TankWorks job costing", usd: 350, ngn: 525_000 },
  { name: "MarineStores inventory", usd: 300, ngn: 450_000 },
  { name: "Refrigerant gas tracking", usd: 150, ngn: 225_000 },
  { name: "e-BDN export interoperability", usd: 400, ngn: 600_000 },
  { name: "NCFCC / NOGIC-JQS export pack", usd: 250, ngn: 375_000, note: "Included free in Growth & above" },
  { name: "Client Portal", usd: 300, ngn: 450_000, note: "Included in Enterprise" },
];

const oneTime = [
  ["Starter setup", "$4,000", "₦6,000,000"],
  ["Growth setup", "$8,000", "₦12,000,000"],
  ["Enterprise setup", "$12k – $20k", "₦18M – ₦30M"],
  ["Whitelabel setup", "$25k – $60k", "₦37.5M – ₦90M"],
  ["Site integration (weighbridge or flowmeter)", "$3k – $8k / site", "₦4.5M – ₦12M"],
  ["Hardware (scanners, rugged tablets)", "Cost + 15%", "Cost + 15%"],
];

const support = [
  ["Standard (business hours, 5 days)", "Included", "Included"],
  ["Priority (extended hours, 4-hour response)", "$6,000 / yr", "₦9,000,000 / yr"],
  ["24/7 dedicated engineering team", "$18,000 / yr", "₦27,000,000 / yr"],
  ["Additional staff training days", "$800 / day", "₦1,200,000 / day"],
];

const terms = [
  { k: 1, label: "Annual", off: 0 },
  { k: 2, label: "2 years", off: 0.08 },
  { k: 3, label: "3 years", off: 0.12 },
];

function money(n: number, cur: Cur) {
  if (cur === "USD") return "$" + Math.round(n).toLocaleString("en-US");
  if (n >= 1_000_000) return "₦" + (n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "M";
  return "₦" + Math.round(n).toLocaleString("en-US");
}

function Toggle<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { k: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1">
      {options.map((o) => (
        <button
          key={String(o.k)}
          type="button"
          onClick={() => onChange(o.k)}
          className={`relative rounded-lg px-4 py-1.5 text-[13px] font-semibold transition ${
            value === o.k ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {o.label}
          {o.hint && <span className="ml-1.5 text-[11px] font-bold text-emerald-700">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-[13.5px]">
        <span className="text-slate-700 font-medium">{label}</span>
        <span className="font-mono font-bold text-slate-900">{display}</span>
      </div>
      <input type="range" className="mt-3 w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Roi() {
  const [stem, setStem] = useState(1000);
  const [price, setPrice] = useState(600);
  const [loss, setLoss] = useState(0.5);
  const [stems, setStems] = useState(10);
  const perStem = stem * price * (loss / 100);
  const yearly = perStem * stems * 12;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <div className="relative grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.16em] text-emerald-800">
            Shrinkage ROI Calculator
          </p>
          <p className="mt-1.5 text-xl font-extrabold text-slate-900">What is 0.5% recovery worth on your stems?</p>
          <div className="mt-6 space-y-5">
            <Slider label="Stem volume" value={stem} display={`${stem.toLocaleString()} MT`} min={100} max={5000} step={50} onChange={setStem} />
            <Slider label="Fuel benchmark price" value={price} display={`$${price} / MT`} min={300} max={1200} step={10} onChange={setPrice} />
            <Slider label="Shrinkage recovered" value={loss} display={`${loss.toFixed(2)}%`} min={0.1} max={1.5} step={0.05} onChange={setLoss} />
            <Slider label="Stems per month" value={stems} display={String(stems)} min={1} max={60} step={1} onChange={setStems} />
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6">
          <div>
            <p className="text-[13px] font-medium text-emerald-900">Recovered per stem</p>
            <p className="text-2xl font-extrabold text-slate-900">{money(perStem, "USD")}</p>
            <p className="mt-6 text-[13px] font-medium text-emerald-900">Annual contractor savings</p>
            <p className="text-4xl font-extrabold tracking-tight text-emerald-800">{money(yearly, "USD")}</p>
          </div>
          <p className="mt-6 text-[12px] leading-relaxed text-slate-600">
            Calculated as stem volume × price × variance recovered. Demonstrated in practice during a 60-day paid pilot using your fleet data.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Pricing() {
  const [cur, setCur] = useState<Cur>("USD");
  const [term, setTerm] = useState(1);
  const [tab, setTab] = useState<"addons" | "onetime" | "support">("addons");
  const off = terms.find((t) => t.k === term)!.off;

  return (
    <section id="pricing" className="relative scroll-mt-24 px-5 py-24 sm:px-8 md:py-28 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-[1240px]">
        <SectionHeading
          center
          eyebrow="Pricing · annual, prepaid"
          title={
            <>
              Start with ten trucks. <span className="text-gradient">Scale to a private cloud.</span>
            </>
          }
          sub="Indicative pricing. Naira quotes lock the official rate at issuance so there are never hidden foreign exchange surprises."
        />

        <Reveal className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Toggle value={cur} onChange={setCur} options={[{ k: "USD", label: "USD $" }, { k: "NGN", label: "NGN ₦" }]} />
          <Toggle
            value={term}
            onChange={setTerm}
            options={terms.map((t) => ({ k: t.k, label: t.label, hint: t.off ? `Save ${t.off * 100}%` : undefined }))}
          />
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {tiers.map((t, i) => {
            const base = cur === "USD" ? t.usd : t.ngn;
            const price = base * (1 - off);
            return (
              <Reveal key={t.name} delay={i * 70} className={t.featured ? "xl:-mt-3" : ""}>
                <div
                  className={`relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transition duration-300 hover:shadow-lg ${
                    t.featured
                      ? "border-2 border-emerald-600 bg-white shadow-md ring-4 ring-emerald-50"
                      : "border border-slate-200 bg-white shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[16px] font-bold text-slate-900">{t.name}</p>
                    {t.featured && (
                      <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10.5px] font-bold text-white">
                        Recommended
                      </span>
                    )}
                    {t.badge && (
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-bold text-slate-700">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 min-h-[38px] text-[12.5px] leading-snug text-slate-500">{t.scope}</p>
                  <div className="mt-4">
                    {t.from && <span className="text-[12px] font-medium text-slate-500">From </span>}
                    <span key={`${cur}-${term}`} className="text-[28px] font-extrabold tracking-tight text-slate-900">
                      {money(price, cur)}
                    </span>
                    <span className="text-[13px] text-slate-500"> / yr</span>
                    {off > 0 && <p className="mt-0.5 text-[11.5px] font-semibold text-emerald-700">Save {money(base * off, cur)}/yr</p>}
                  </div>

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {t.features.map((f) => (
                      <li key={f} className="flex gap-2 text-[13px] text-slate-700">
                        <span className="font-bold text-emerald-600">✓</span> {f}
                      </li>
                    ))}
                  </ul>

                  <a
                    href="#contact"
                    className={`mt-7 flex h-11 items-center justify-center gap-1.5 rounded-xl text-[13.5px] font-semibold transition ${
                      t.featured ? "btn-green text-white" : "btn-ghost text-slate-800"
                    }`}
                  >
                    {t.from ? "Custom quote" : "Start a pilot"} <Icon.Arrow size={15} />
                  </a>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* 60-day Pilot Promotion */}
        <Reveal className="mt-6">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-8">
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[17px] font-extrabold text-slate-900">60-day paid pilot on one operational module</p>
                <p className="mt-1.5 max-w-2xl text-[13.5px] text-slate-600">
                  {cur === "USD" ? "$2,500" : "₦3,750,000"} pilot commitment credited against your annual license if you convert. We establish one target KPI beforehand (shrinkage reduction, turnaround time, or reconciliation cycle) and report progress transparently.
                </p>
              </div>
              <a
                href="#contact"
                className="btn-green inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-[14.5px] font-semibold text-white shadow-sm"
              >
                Book pilot <Icon.Arrow size={16} />
              </a>
            </div>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Extras / Add-ons Tabs */}
          <Reveal>
            <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <p className="text-xl font-extrabold text-slate-900">Additional modules & support</p>
                <Toggle
                  value={tab}
                  onChange={setTab}
                  options={[
                    { k: "addons", label: "Add-ons" },
                    { k: "onetime", label: "Setup" },
                    { k: "support", label: "SLA Support" },
                  ]}
                />
              </div>

              <div key={tab + cur} className="mt-4 divide-y divide-slate-100">
                {tab === "addons" &&
                  addons.map((a, i) => (
                    <div key={a.name} className="rise flex items-center justify-between gap-4 py-3" style={{ animationDelay: `${i * 0.03}s` }}>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-slate-900">{a.name}</p>
                        {a.note && <p className="text-[12px] text-slate-500">{a.note}</p>}
                      </div>
                      <p className="shrink-0 font-mono text-[13.5px] font-bold text-emerald-800">
                        {money(cur === "USD" ? a.usd : a.ngn, cur)}
                        <span className="text-slate-400 font-normal"> /mo</span>
                      </p>
                    </div>
                  ))}

                {tab !== "addons" &&
                  (tab === "onetime" ? oneTime : support).map(([a, u, n], i) => (
                    <div key={a} className="rise flex items-center justify-between gap-4 py-3.5" style={{ animationDelay: `${i * 0.04}s` }}>
                      <p className="text-[14px] font-semibold text-slate-900">{a}</p>
                      <p className="shrink-0 text-right font-mono text-[13.5px] font-bold text-emerald-800">{cur === "USD" ? u : n}</p>
                    </div>
                  ))}
              </div>

              <div className="mt-5 grid gap-2 text-[12.5px] text-slate-500 sm:grid-cols-2">
                <p className="flex gap-2">
                  <span className="font-bold text-emerald-600">✓</span> 50% upon signing, 50% at production go-live
                </p>
                <p className="flex gap-2">
                  <span className="font-bold text-emerald-600">✓</span> Transparent billing with no hidden fees
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <Roi />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
