"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Icon } from "@/components/landing/icons";
import { CountUp } from "@/components/landing/primitives";
import { CardContours, SeismicBand } from "@/components/dashboard/Patterns";
import { useAuth } from "@/components/auth/AuthProvider";

type IconC = ComponentType<{ size?: number; className?: string }>;
type Tone = "ok" | "warn" | "crit" | "info";
type Currency = "NGN" | "USD";

const FX = 1480; // ₦ per $1, today's rate snapshot (matches the status bar)

/* ------------------------------------------------------------------ */
/* Mock data                                                           */
/* ------------------------------------------------------------------ */

const receivablesUsd = 689_372;

const ledgers: { cur: string; flag: string; usd: number; native: string; note: string; status: string; tone: Tone }[] = [
  { cur: "NGN", flag: "₦", usd: 278_784, native: "₦412,600,000", note: "Rate snapshot per entry", status: "Active", tone: "ok" },
  { cur: "USD", flag: "$", usd: 186_240, native: "$186,240.00", note: "IOC and vessel invoices", status: "Active", tone: "ok" },
  { cur: "IPC", flag: "%", usd: 42_100, native: "$42,100.00", note: "EPC retention held", status: "Held", tone: "warn" },
];

const kpis: { label: string; value: number; decimals?: number; unit: string; delta: string; good: boolean; icon: IconC; hero?: boolean }[] = [
  { label: "Product delivered", value: 3420, unit: "MT", delta: "6.2%", good: true, icon: Icon.Fuel, hero: true },
  { label: "Shrinkage", value: 0.18, decimals: 2, unit: "%", delta: "0.04 pts", good: true, icon: Icon.Scale },
  { label: "Avg. turnaround", value: 4.2, decimals: 1, unit: "h", delta: "12%", good: true, icon: Icon.Clock },
  { label: "Reconciled", value: 98.6, decimals: 1, unit: "%", delta: "1.2%", good: true, icon: Icon.Check },
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const cost = [18, 13, 9, 16, 13, 23, 17, 10];
const margin = [12, 23, 19, 17, 23, 18, 16, 17];

type Row = { id: string; activity: string; module: string; icon: IconC; value: string; status: string; tone: Tone; date: string };
const rows: Row[] = [
  { id: "VOY-2026-0611", activity: "PSV voyage · Onne → Bonga FPSO", module: "OffshoreLink", icon: Icon.Cube, value: "46 lifts", status: "Sailing", tone: "info", date: "11 Oct 2026, 11:05" },
  { id: "BLK-2026-0731", activity: "MGO transfer · Rig Okoro-2", module: "RigSupply", icon: Icon.Barrel, value: "420 m³", status: "Sealed", tone: "ok", date: "11 Oct 2026, 10:12" },
  { id: "BDN-2026-0419", activity: "e-BDN · MT Sea Venture", module: "BunkerFlow", icon: Icon.Ship, value: "1,250 MT", status: "Sealed", tone: "ok", date: "11 Oct 2026, 10:42" },
  { id: "WB-2026-104882", activity: "e-Waybill POD · Lekki depot", module: "HaulTrac", icon: Icon.Truck, value: "45,000 L", status: "Completed", tone: "ok", date: "11 Oct 2026, 10:31" },
  { id: "PTW-2026-0412", activity: "Hot work permit · Tank TK-09", module: "SafePass", icon: Icon.Flame, value: "LEL 12%", status: "Blocked", tone: "crit", date: "11 Oct 2026, 10:24" },
  { id: "PIG-2026-0117", activity: "Pig run PG-17 · Trunkline TL-04", module: "PipeIntegrity", icon: Icon.Pipe, value: "KP 46 / 71", status: "In progress", tone: "warn", date: "11 Oct 2026, 09:58" },
  { id: "INV-2026-0418", activity: "Invoice · IPC 3 pipeline rehab", module: "Billing", icon: Icon.Receipt, value: "$48,200", status: "Pending", tone: "info", date: "10 Oct 2026, 16:20" },
  { id: "NCF-2026-0003", activity: "NCFCC renewal pack", module: "EPC-Link", icon: Icon.Building, value: "82% ready", status: "In progress", tone: "warn", date: "10 Oct 2026, 14:05" },
  { id: "TW-2026-0221", activity: "Tank 7 recoat · DFT check", module: "TankWorks", icon: Icon.Wrench, value: "312 µm", status: "Completed", tone: "ok", date: "09 Oct 2026, 11:40" },
];

const exceptions: { tone: Tone; title: string; desc: string; time: string; href: string }[] = [
  { tone: "crit", title: "DG segregation conflict", desc: "Class 8 totes stowed beside Class 5.1 · load-out blocked on VOY-0611", time: "9 min", href: "/dashboard/offshore-link" },
  { tone: "warn", title: "Low days of supply", desc: "Drill water at Platform EA-3 · 2.5 days left", time: "20 min", href: "/dashboard/rig-supply" },
  { tone: "crit", title: "Variance over 0.5%", desc: "Depot BK-07 discharge · 0.72% loss on truck NG-LAG-4412", time: "14 min", href: "/dashboard/refinery-link" },
  { tone: "crit", title: "Failed gas test", desc: "H₂S 12 ppm · confined-space entry blocked at TK-09", time: "28 min", href: "/dashboard/safe-pass" },
  { tone: "warn", title: "BOSIET expiring", desc: "3 crew within 21 days · removed from offshore manifest", time: "1 h", href: "/dashboard/safe-pass" },
  { tone: "warn", title: "Route deviation", desc: "NG-ABJ-0091 left the Lekki-Epe route by 4.2 km", time: "3 h", href: "/dashboard/haul-trac" },
];

const renewals: { name: string; body: string; days: number }[] = [
  { name: "NCEC · Crane CR-02", body: "NCDMB", days: 7 },
  { name: "NCFCC certificate", body: "NCDMB", days: 23 },
  { name: "Vessel permit · MV Atlantic Grace", body: "NIMASA", days: 41 },
  { name: "ISO 45001 surveillance audit", body: "Certification body", days: 58 },
];

const devices: { name: string; kind: string; online: boolean; detail: string }[] = [
  { name: "Barge PB-04 tablet", kind: "BunkerFlow", online: true, detail: "Synced 2 min ago" },
  { name: "Driver phone · LSD 482 XY", kind: "HaulTrac", online: false, detail: "12 records queued" },
  { name: "Platform A HSE tablet", kind: "SafePass", online: true, detail: "Synced 40 s ago" },
  { name: "Weighbridge PC · Lekki", kind: "HaulTrac", online: true, detail: "Synced 5 min ago" },
];

const fleet: { name: string; id: string; status: string; icon: IconC; a: [string, string]; b: [string, string]; theme: "dark" | "brand" | "light" }[] = [
  { name: "MV Atlantic Grace", id: "VSL-007", status: "On-hire", icon: Icon.Ship, a: ["Fuel ROB", "312 MT"], b: ["Next survey", "09/29"], theme: "dark" },
  { name: "Truck LSD 482 XY", id: "TRK-041", status: "On route", icon: Icon.Truck, a: ["e-Waybill", "WB-104882"], b: ["ETA", "16:40"], theme: "brand" },
  { name: "Barge PB-04", id: "BRG-004", status: "Alongside", icon: Icon.Anchor, a: ["Pump rate", "310 m³/h"], b: ["Stems today", "3"], theme: "light" },
];

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

function Card({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <section className={`rise min-w-0 rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${className}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </section>
  );
}

function Delta({ value, good, up }: { value: string; good: boolean; up: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-semibold ${
        good ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
      }`}
    >
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      {value}
    </span>
  );
}

const toneDot: Record<Tone, string> = { ok: "bg-emerald-500", warn: "bg-amber-400", crit: "bg-rose-500", info: "bg-sky-500" };
const toneText: Record<Tone, string> = { ok: "text-emerald-700", warn: "text-amber-700", crit: "text-rose-600", info: "text-sky-700" };

function money(usd: number, cur: Currency) {
  return cur === "USD"
    ? usd.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "₦" + Math.round(usd * FX).toLocaleString("en-US");
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function Receivables() {
  const [cur, setCur] = useState<Currency>("USD");
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] text-slate-500">Total receivables</p>
          <p key={cur} className="fade-in mt-2 text-[30px] font-semibold leading-none tracking-tight text-slate-900">
            {money(receivablesUsd, cur)}
          </p>
          <p className="mt-3 flex items-center gap-2 text-[13px] text-slate-500">
            <Delta value="5%" good up /> than last month
          </p>
        </div>
        <div className="flex rounded-full border border-slate-200 p-0.5" role="group" aria-label="Currency">
          {(["USD", "NGN"] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCur(c)}
              aria-pressed={cur === c}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${cur === c ? "bg-[#0b1523] text-white" : "text-slate-500 hover:text-slate-900"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link href="/dashboard/billing" className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#0b1523] text-[14px] font-medium text-white transition hover:bg-slate-800">
          <Icon.Receipt size={17} /> New invoice
        </Link>
        <Link href="/dashboard/billing" className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#f2f3f5] text-[14px] font-medium text-slate-800 transition hover:bg-slate-200/70">
          <Icon.Plug size={17} /> Payment link
        </Link>
      </div>

      <div className="mt-4 rounded-[22px] bg-[#f6f7f9] p-3">
        <p className="px-1 text-[13px] text-slate-700">
          Ledgers <span className="mx-1.5 text-slate-300">|</span>
          <span className="text-slate-500">₦ / $ with rate snapshot · $1 = ₦{FX.toLocaleString()}</span>
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {ledgers.map((l) => (
            <div key={l.cur} className="rounded-2xl bg-white p-3">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-slate-800">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">{l.flag}</span>
                {l.cur}
              </p>
              <p className="mt-2 truncate text-[14px] font-semibold text-slate-900">{l.native}</p>
              <p className="mt-0.5 truncate text-[10.5px] text-slate-400">{l.note}</p>
              <p className={`mt-2 text-[11.5px] font-medium ${toneText[l.tone]}`}>{l.status}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function KpiGrid() {
  return (
    <Card delay={0.05} className="grid grid-cols-2 gap-3 p-3">
      {kpis.map((k, i) => {
        const I = k.icon;
        return (
          <div
            key={k.label}
            className={`relative flex flex-col justify-between overflow-hidden rounded-[22px] p-4 ${
              k.hero ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_18px_40px_-18px_rgba(5,150,105,0.8)]" : "bg-[#f6f7f9]"
            }`}
          >
            {k.hero && <CardContours className="opacity-[0.18]" seed={1.5} />}
            <div className="relative flex items-center justify-between gap-2">
              <p className={`text-[14px] ${k.hero ? "text-white/90" : "text-slate-700"}`}>{k.label}</p>
              <span className={`grid h-9 w-9 place-items-center rounded-full ${k.hero ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-700"}`}>
                <I size={16} />
              </span>
            </div>
            <p className={`relative mt-6 text-[30px] font-semibold leading-none tracking-tight ${k.hero ? "text-white" : "text-slate-900"}`}>
              <CountUp to={k.value} decimals={k.decimals ?? 0} duration={1200 + i * 150} />
              <span className={`ml-1 text-[14px] font-medium ${k.hero ? "text-white/70" : "text-slate-400"}`}>{k.unit}</span>
            </p>
            <p className={`relative mt-3 flex items-center gap-2 text-[12.5px] ${k.hero ? "text-white/80" : "text-slate-500"}`}>
              {k.hero ? (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[12px] font-semibold text-white">↑ {k.delta}</span>
              ) : (
                <Delta value={k.delta} good={k.good} up={k.label === "Reconciled"} />
              )}
              Today
            </p>
          </div>
        );
      })}
    </Card>
  );
}

function MarginChart() {
  const [hover, setHover] = useState<number | null>(null);
  const max = 50;
  return (
    <Card delay={0.1}>
      <p className="text-[19px] font-semibold tracking-tight text-slate-900">Job margin</p>
      <p className="mt-1 text-[13px] text-slate-500">Revenue split across all modules, ₦ millions</p>
      <div className="mt-4 rounded-[22px] bg-[#f6f7f9] p-4">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-medium text-slate-800">Margin and cost</p>
          <div className="flex items-center gap-3 text-[12px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-emerald-500" /> Margin
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#0b1523]" /> Cost
            </span>
          </div>
        </div>
        <div className="relative mt-4 flex h-[220px] gap-3">
          <div className="flex flex-col justify-between pb-6 text-[11px] text-slate-400">
            {[50, 40, 30, 20, 10, 0].map((v) => (
              <span key={v}>{v ? `${v}M` : "0"}</span>
            ))}
          </div>
          <div className="relative flex-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="absolute inset-x-0 border-t border-dashed border-slate-200" style={{ top: `${(i / 5) * (100 - 11)}%` }} />
            ))}
            <div className="absolute inset-x-0 bottom-6 top-0 flex items-end justify-between gap-2">
              {months.map((m, i) => {
                const total = cost[i] + margin[i];
                const on = hover === i;
                return (
                  <div
                    key={m}
                    className="relative flex h-full flex-1 cursor-default flex-col justify-end gap-1"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  >
                    {on && (
                      <div className="fade-in absolute -top-2 left-1/2 z-10 w-max -translate-x-1/2 -translate-y-full rounded-xl bg-[#0b1523] px-2.5 py-1.5 text-[11px] text-white shadow-lg">
                        <p className="font-semibold">{m} · ₦{total}M</p>
                        <p className="text-emerald-300">Margin ₦{margin[i]}M · {Math.round((margin[i] / total) * 100)}%</p>
                      </div>
                    )}
                    <span
                      className={`dash-grow dash-hatch w-full rounded-[10px] bg-emerald-500 transition ${hover !== null && !on ? "opacity-40" : ""}`}
                      style={{ height: `${(margin[i] / max) * 100}%`, animationDelay: `${0.2 + i * 0.05}s` }}
                    />
                    <span
                      className={`dash-grow w-full rounded-[10px] bg-[#0b1523] transition ${hover !== null && !on ? "opacity-40" : ""}`}
                      style={{ height: `${(cost[i] / max) * 100}%`, animationDelay: `${0.1 + i * 0.05}s` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2 text-[11.5px] text-slate-500">
              {months.map((m) => (
                <span key={m} className="flex-1 text-center">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Readiness() {
  const cleared = 197;
  const total = 214;
  const pct = (cleared / total) * 100;
  return (
    <Card delay={0.15}>
      <div className="flex items-center justify-between">
        <p className="text-[17px] font-semibold tracking-tight text-slate-900">Crew certificate readiness</p>
        <Link href="/dashboard/safe-pass" className="text-[12.5px] font-medium text-emerald-700 hover:text-emerald-800">
          View crew
        </Link>
      </div>
      <div className="dash-hatch-muted mt-6 h-4 overflow-hidden rounded-full bg-slate-100">
        <div className="bar-anim-x h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-[13px]">
        <p>
          <span className="font-semibold text-slate-900">{cleared}</span> <span className="text-slate-500">cleared to mobilise, of</span>
        </p>
        <p className="font-semibold text-slate-900">{total} crew</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["BOSIET", 9],
          ["HUET", 5],
          ["OSP", 3],
        ].map(([c, n]) => (
          <div key={c as string} className="rounded-2xl bg-[#f6f7f9] py-2.5">
            <p className="text-[18px] font-semibold text-slate-900">{n as number}</p>
            <p className="text-[11px] text-slate-500">{c as string} &lt; 30 d</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Fleet() {
  const themes = {
    dark: "bg-[#0b1523] text-white",
    brand: "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white",
    light: "bg-[#f6f7f9] text-slate-900",
  };
  return (
    <Card delay={0.2}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-slate-700">
            <Icon.Anchor size={18} />
          </span>
          <p className="text-[17px] font-semibold tracking-tight text-slate-900">Fleet & assets</p>
        </div>
        <Link href="/dashboard/haul-trac" className="rounded-full bg-[#f2f3f5] px-4 py-2 text-[13px] font-medium text-slate-800 transition hover:bg-slate-200/70">
          + Add asset
        </Link>
      </div>
      <div className="no-scrollbar -mx-5 mt-4 flex snap-x gap-3 overflow-x-auto px-5 pb-1">
        {fleet.map((f) => {
          const FI = f.icon;
          const light = f.theme === "light";
          return (
            <div key={f.id} className={`relative h-[168px] w-[260px] shrink-0 snap-start overflow-hidden rounded-[22px] p-4 ${themes[f.theme]}`}>
              {!light && <CardContours className={f.theme === "dark" ? "opacity-[0.12]" : "opacity-[0.2]"} seed={f.theme === "dark" ? 4.2 : 2.6} />}
              <div className="relative flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${light ? "bg-white text-slate-700" : "bg-white text-slate-900"}`}>{f.status}</span>
                <FI size={20} className={light ? "text-slate-500" : "text-white/80"} />
              </div>
              <p className="relative mt-5 text-[15px] font-semibold">{f.name}</p>
              <p className={`relative font-mono text-[11px] ${light ? "text-slate-400" : "text-white/50"}`}>{f.id}</p>
              <div className="relative mt-4 flex gap-6 text-[11.5px]">
                {[f.a, f.b].map(([k, v]) => (
                  <div key={k}>
                    <p className={light ? "text-slate-500" : "text-white/60"}>{k}</p>
                    <p className="mt-0.5 font-semibold">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Records() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(["PIG-2026-0117"]));
  const [menu, setMenu] = useState<string | null>(null);

  const statuses = ["All", ...Array.from(new Set(rows.map((r) => r.status)))];
  const list = useMemo(
    () =>
      rows.filter(
        (r) =>
          (status === "All" || r.status === status) &&
          (q.trim() === "" || `${r.id} ${r.activity} ${r.module}`.toLowerCase().includes(q.trim().toLowerCase()))
      ),
    [q, status]
  );
  const allOn = list.length > 0 && list.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Card delay={0.15} className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[19px] font-semibold tracking-tight text-slate-900">Recent records</p>
        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <label className="flex h-11 flex-1 items-center gap-2 rounded-full border border-slate-200 px-4 sm:w-[260px] sm:flex-none">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="text-slate-500">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search records"
              className="w-full bg-transparent text-[13.5px] text-slate-800 outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={`flex h-11 items-center gap-2 rounded-full border px-4 text-[13.5px] transition ${
                status !== "All" ? "border-[#0b1523] bg-[#0b1523] text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {status === "All" ? "Filter" : status}
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <path d="M4 7h16M7 12h10M10 17h4" />
              </svg>
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setFilterOpen(false)} />
                <div className="modal-in absolute right-0 top-[calc(100%+8px)] z-30 w-44 rounded-2xl bg-white p-1.5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.35)]">
                  {statuses.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setStatus(s);
                        setFilterOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] transition hover:bg-slate-50 ${
                        status === s ? "font-semibold text-slate-900" : "text-slate-600"
                      }`}
                    >
                      {s}
                      {status === s && <Icon.Check size={14} className="text-emerald-600" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="fade-in mt-4 flex items-center justify-between rounded-2xl bg-[#0b1523] px-4 py-2.5 text-[13px] text-white">
          <span>{selected.size} selected</span>
          <div className="flex gap-2">
            <button type="button" className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium transition hover:bg-white/20">
              Export PDF
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="rounded-full px-3 py-1 text-[12px] text-white/70 transition hover:text-white">
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex-1 overflow-x-auto rounded-[22px] bg-[#f6f7f9]">
        <table className="w-full min-w-[760px] text-left text-[13.5px]">
          <thead>
            <tr className="text-slate-500">
              <th className="w-12 py-3.5 pl-4">
                <input
                  type="checkbox"
                  checked={allOn}
                  onChange={() => setSelected(allOn ? new Set() : new Set(list.map((r) => r.id)))}
                  aria-label="Select all"
                  className="h-4 w-4 accent-[#0b1523]"
                />
              </th>
              <th className="py-3.5 font-normal">Record ID</th>
              <th className="py-3.5 font-normal">Activity</th>
              <th className="py-3.5 font-normal">Value</th>
              <th className="py-3.5 font-normal">Status</th>
              <th className="py-3.5 font-normal">Date</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody className="bg-white">
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  No records match.
                </td>
              </tr>
            )}
            {list.map((r) => {
              const RI = r.icon;
              const on = selected.has(r.id);
              return (
                <tr key={r.id} className={`border-t border-slate-100 transition ${on ? "bg-slate-50" : "hover:bg-slate-50/60"}`}>
                  <td className="py-3.5 pl-4">
                    <input type="checkbox" checked={on} onChange={() => toggle(r.id)} aria-label={`Select ${r.id}`} className="h-4 w-4 accent-[#0b1523]" />
                  </td>
                  <td className="py-3.5 font-mono text-[12.5px] text-slate-700">{r.id}</td>
                  <td className="py-3.5">
                    <span className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700">
                        <RI size={15} />
                      </span>
                      <span className="text-slate-800">{r.activity}</span>
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-800">{r.value}</td>
                  <td className="py-3.5">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className={`h-1.5 w-1.5 rounded-full ${toneDot[r.tone]}`} />
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-600">{r.date}</td>
                  <td className="relative py-3.5 pr-3">
                    <button
                      type="button"
                      onClick={() => setMenu(menu === r.id ? null : r.id)}
                      aria-label={`Actions for ${r.id}`}
                      className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100"
                    >
                      •••
                    </button>
                    {menu === r.id && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setMenu(null)} />
                        <div className="modal-in absolute right-3 top-[calc(100%-6px)] z-30 w-44 rounded-2xl bg-white p-1.5 text-[13px] shadow-[0_20px_50px_-15px_rgba(15,23,42,0.35)]">
                          {["Open record", "View audit trail", "Download PDF"].map((a) => (
                            <button key={a} type="button" onClick={() => setMenu(null)} className="block w-full rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-slate-50">
                              {a}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ExceptionFeed() {
  return (
    <Card delay={0.25}>
      <div className="flex items-center justify-between">
        <p className="text-[17px] font-semibold tracking-tight text-slate-900">Exception feed</p>
        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[12px] font-semibold text-rose-600">{exceptions.length} open</span>
      </div>
      <div className="mt-4 space-y-2">
        {exceptions.map((e) => (
          <Link key={e.title} href={e.href} className="flex items-start gap-3 rounded-2xl bg-[#f6f7f9] p-3 transition hover:bg-slate-100">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[e.tone]}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-slate-900">{e.title}</p>
              <p className="truncate text-[12px] text-slate-500">{e.desc}</p>
            </div>
            <span className="shrink-0 text-[11.5px] text-slate-400">{e.time}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function Renewals() {
  return (
    <Card delay={0.3}>
      <div className="flex items-center justify-between">
        <p className="text-[17px] font-semibold tracking-tight text-slate-900">Compliance calendar</p>
        <Link href="/dashboard/compliance-shield" className="text-[12.5px] font-medium text-emerald-700 hover:text-emerald-800">
          All renewals
        </Link>
      </div>
      <p className="mt-1 text-[12.5px] text-slate-500">Alerts at 90, 60, 30 and 7 days</p>
      <div className="mt-4 space-y-2">
        {renewals.map((r) => {
          const tone: Tone = r.days <= 7 ? "crit" : r.days <= 30 ? "warn" : "ok";
          const pct = Math.max(0.06, 1 - r.days / 90);
          return (
            <div key={r.name} className="flex items-center gap-3 rounded-2xl bg-[#f6f7f9] p-3">
              <div className="relative h-10 w-10 shrink-0">
                <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke={tone === "crit" ? "#f43f5e" : tone === "warn" ? "#f59e0b" : "#10b981"}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={`${pct * 94.2} 94.2`}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-[10.5px] font-semibold text-slate-800">{r.days}d</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-slate-900">{r.name}</p>
                <p className="text-[12px] text-slate-500">{r.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Devices() {
  const queued = 12;
  return (
    <Card delay={0.35}>
      <div className="flex items-center justify-between">
        <p className="text-[17px] font-semibold tracking-tight text-slate-900">Field devices</p>
        <span className="text-[12.5px] text-slate-500">
          {devices.filter((d) => d.online).length}/{devices.length} online
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-slate-500">Offline-first · delta sync on reconnect</p>
      <div className="mt-4 space-y-2">
        {devices.map((d) => (
          <div key={d.name} className="flex items-center gap-3 rounded-2xl bg-[#f6f7f9] p-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${d.online ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {d.online ? <Icon.Wifi size={16} /> : <Icon.WifiOff size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-slate-900">{d.name}</p>
              <p className="text-[12px] text-slate-500">{d.kind}</p>
            </div>
            <span className={`shrink-0 text-[11.5px] font-medium ${d.online ? "text-slate-500" : "text-amber-700"}`}>{d.detail}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] text-slate-400">
        {queued} records waiting · signed records never merge, corrections are new entries
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("Welcome back");
  const { user } = useAuth();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()));
      setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="mx-auto max-w-[1520px] space-y-4">
      <header className="relative flex flex-wrap items-end justify-between gap-4 px-1 pb-2 pt-3">
        <SeismicBand className="absolute -top-6 right-[8%] hidden h-[150px] w-[58%] lg:block" />
        <div className="relative">
          <h1 className="text-[2rem] font-semibold tracking-tight text-slate-900 sm:text-[2.4rem]">{greeting}, {user.first_name || user.name}</h1>
          <p className="mt-1 text-[15px] text-slate-500">Here is what is moving across your vessels, lines and trucks today.</p>
        </div>
        <div className="relative flex gap-2">
          <Link href="/dashboard/compliance-shield" className="flex h-11 items-center gap-2 rounded-full bg-white px-4 text-[13.5px] font-medium text-slate-800 transition hover:bg-slate-50">
            <Icon.FileText size={16} /> Audit pack
          </Link>
          <Link href="/dashboard/bunkerflow" className="flex h-11 items-center gap-2 rounded-full bg-[#0b1523] px-4 text-[13.5px] font-medium text-white transition hover:bg-slate-800">
            + New record
          </Link>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1fr_1fr]">
        <Receivables />
        <KpiGrid />
        <MarginChart />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_2fr]">
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-1">
          <Readiness />
          <Fleet />
        </div>
        <Records />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ExceptionFeed />
        <Renewals />
        <Devices />
      </div>
    </div>
  );
}
