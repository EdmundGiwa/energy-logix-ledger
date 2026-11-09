"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, LogoMark } from "@/components/landing/icons";
import { seeded } from "@/components/landing/charts";
import { StemGauge } from "@/components/dashboard/StemGauge";
import { CardContours } from "@/components/dashboard/Patterns";
import type { SlideVisualKind } from "./slidesData";

function HudRow({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 py-1.5 text-xs last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function HudRing({ pct, label, sub }: { pct: number; label: string; sub?: string }) {
  const c = 2 * Math.PI * 38;
  return (
    <div className="relative mx-auto h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="#34d399"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-mono text-xl font-extrabold text-white">{Math.round(pct * 100)}%</p>
          <p className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-300">{label}</p>
          {sub && <p className="text-[9px] text-slate-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function MiniBars({ seed, count = 14, color = "bg-emerald-400" }: { seed: number; count?: number; color?: string }) {
  const pts = seeded(count, seed, 0.25, 1);
  return (
    <div className="flex h-16 items-end gap-1" aria-hidden="true">
      {pts.map((v, idx) => (
        <span
          key={idx}
          className={`bar-anim flex-1 rounded-t-sm ${color}`}
          style={{
            height: `${v * 100}%`,
            opacity: 0.4 + v * 0.6,
            animationDelay: `${idx * 35}ms`,
          }}
        />
      ))}
    </div>
  );
}

/** Deterministic stylized QR matrix for visual presentation cards */
function StylizedQr({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/15 bg-white p-2.5 text-slate-900 shadow-lg">
      <svg viewBox="0 0 21 21" className="h-20 w-20" shapeRendering="crispEdges" aria-hidden="true">
        {Array.from({ length: 21 * 21 }).map((_, idx) => {
          const x = idx % 21;
          const y = Math.floor(idx / 21);
          const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
          const fOn =
            finder &&
            (x % 14 === 0 ||
              x % 14 === 6 ||
              y % 14 === 0 ||
              y % 14 === 6 ||
              (x % 14 > 1 && x % 14 < 5 && y % 14 > 1 && y % 14 < 5));
          const on = finder ? fOn : (x * 11 + y * 17 + x * y) % 5 < 2;
          return on ? <rect key={idx} x={x} y={y} width="1" height="1" fill="#0b1523" /> : null;
        })}
      </svg>
      <span className="mt-1 font-mono text-[9px] font-extrabold tracking-wider text-slate-900">{label}</span>
    </div>
  );
}

export function SlideVisual({ kind, compact = false }: { kind: SlideVisualKind; compact?: boolean }) {
  const [tick, setTick] = useState(0);
  const [roiCur, setRoiCur] = useState<"USD" | "NGN">("USD");
  const [stemsPerMo, setStemsPerMo] = useState(10);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTick(5);
      return;
    }
    setTick(0);
    const id = window.setInterval(() => {
      setTick((t) => (t >= 5 ? 5 : t + 1));
    }, 620);
    return () => window.clearInterval(id);
  }, [kind]);

  return (
    <div className={`hero-glass-dark relative overflow-hidden rounded-3xl ${compact ? "p-4" : "p-5 sm:p-6"} shadow-[0_32px_80px_-24px_rgba(0,0,0,0.85)]`}>
      <CardContours className="opacity-[0.06]" seed={kind.length} />

      {kind === "hook" && (
        <div className="relative space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <LogoMark size={38} />
              <div>
                <p className="text-sm font-extrabold text-white">OFFSHORA ENERGY OS</p>
                <p className="font-mono text-[11px] text-emerald-300">https://www.ofshora.com</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-300 text-emerald-300" />
              Live Ledger
            </span>
          </div>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-slate-950/55 p-3.5">
            {[
              ["PSV Voyage · Base → FPSO Horizon-1", "46 / 46 lifts"],
              ["e-BDN · MV Atlantic Grace", "Δ 0.18% ✓"],
              ["Hydrotest · Trunkline TL-04", "0.0 bar drop"],
              ["e-Waybill · Tanker LSD-482-XY", "POD signed"],
              ["SafePass · Crew Manifest #1010", "24 / 24 valid"],
            ].map(([stepLabel, meta], i) => {
              const done = i <= tick;
              return (
                <div key={stepLabel} className="flex items-center gap-2.5 text-xs">
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-all duration-500 ${
                      done ? "bg-emerald-400 text-slate-950" : "bg-white/10 text-white/40"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={`flex-1 truncate ${done ? "font-semibold text-white" : "text-white/45"}`}>
                    {stepLabel}
                  </span>
                  <span className={`font-mono text-[10.5px] ${done ? "text-emerald-300" : "text-white/25"}`}>{meta}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <Icon.Fingerprint size={18} className="text-emerald-300" />
              <div>
                <p className="text-xs font-bold text-white">SHA-256 Cryptographic Seal</p>
                <p className="font-mono text-[10px] text-sky-300">3fa9c2e1 · append-only · tenant-isolated</p>
              </div>
            </div>
            <Icon.Lock size={15} className="text-emerald-300" />
          </div>
        </div>
      )}

      {kind === "problem" && (
        <div className="relative space-y-3">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-amber-300">
            Before Offshora vs. Sealed Operations
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              ["Paper BDNs", "Soaked / altered", "rose"],
              ["WhatsApp OKs", "Zero legal proof", "rose"],
              ["Excel Soundings", "Formula drift", "rose"],
              ["Cert Trackers", "Missed expiries", "rose"],
            ].map(([title, sub], idx) => (
              <div
                key={title}
                className="rise rounded-xl border border-rose-400/25 bg-rose-500/10 p-2.5"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <p className="text-xs font-bold text-white">{title}</p>
                <p className="mt-0.5 text-[10.5px] font-medium text-rose-300">✕ {sub}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center py-0.5 text-emerald-300" aria-hidden="true">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-0.5 font-mono text-[10px] font-bold">
              ↓ CONVERGES INTO OFFSHORA ↓
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Reconciled", "Every transfer"],
              ["Signed", "Dual party"],
              ["Audit-Ready", "IOC & NCDMB"],
            ].map(([h, s]) => (
              <div key={h} className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 p-2.5">
                <p className="text-xs font-extrabold text-emerald-200">✓ {h}</p>
                <p className="mt-0.5 text-[10px] text-white/75">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {kind === "platform" && (
        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/35 bg-amber-500/15 px-2.5 py-1 font-mono text-[10.5px] font-bold text-amber-200">
              <Icon.WifiOff size={13} /> VSAT Offline · SQLite Active
            </span>
            <span className="font-mono text-[11px] text-emerald-300">1,288 cached</span>
          </div>
          <div className="space-y-1.5 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
            {[
              ["14:23", "Tank 2S sounding · 1.92 m", "sig 91af04c2"],
              ["14:21", "PTW-0412 gas check · LEL 2%", "sig 7c02e9b3"],
              ["14:18", "POD WB-104882 · buyer signed", "sig 19fd7a62"],
            ].map(([time, action, sig], idx) => (
              <div
                key={sig}
                className="rise flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-2.5 py-2 text-xs"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <span className="font-mono text-[10.5px] text-slate-400">{time}</span>
                <span className="flex-1 truncate font-semibold text-white">{action}</span>
                <span className="font-mono text-[10px] text-emerald-300">{sig}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
              <p className="font-mono font-bold text-white">₦ / $</p>
              <p className="text-[10px] text-slate-400">Rate locked</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
              <p className="font-mono font-bold text-emerald-300">48 px</p>
              <p className="text-[10px] text-slate-400">Glove targets</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
              <p className="font-mono font-bold text-sky-300">ATEX</p>
              <p className="text-[10px] text-slate-400">Scanner ready</p>
            </div>
          </div>
        </div>
      )}

      {kind === "bunker" && (
        <div className="relative space-y-3">
          <StemGauge
            label="e-BDN · MV Atlantic Grace"
            sublabel="VLSFO 0.5% S · Stem BDN-2026-0418"
            deliveredMt={419}
            nominatedMt={420}
          />
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-3.5 py-2">
            <HudRow label="Observed Vol · Trim Corr." value="412.60 m³ (−0.84 m³)" />
            <HudRow label="Temp · ASTM Table 54B VCF" value="38.5 °C · 0.98143" />
            <HudRow label="MARPOL Sample Seal" value="S-2291 · Dual Signed ✓" tone="text-emerald-300" />
          </div>
        </div>
      )}

      {kind === "pipe" && (
        <div className="relative space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-slate-300">HYDROTEST · LINE TL-04 · ASME B31.4</span>
            <span className="rounded-md border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-bold text-emerald-300">
              Zero-Drop Valid
            </span>
          </div>
          <svg viewBox="0 0 300 110" className="h-28 w-full rounded-2xl border border-white/10 bg-slate-950/60 p-2" aria-hidden="true">
            {[25, 55, 85].map((y) => (
              <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />
            ))}
            <path d="M8,98 L36,24 L292,24" stroke="#38bdf8" strokeDasharray="4 4" fill="none" />
            <path
              d="M8,98 L36,26 L90,25 L150,26 L220,25 L292,25"
              pathLength={1}
              className="draw-line"
              stroke="#34d399"
              strokeWidth="2.6"
              fill="none"
            />
          </svg>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Hold Duration", "24h 00m"],
              ["Pressure", "148.6 bar"],
              ["Pig Debris", "4.2 kg logged"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                <p className="text-[10px] text-slate-400">{k}</p>
                <p className="font-mono text-xs font-bold text-white">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {kind === "refinery" && (
        <div className="relative space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono uppercase tracking-wider text-slate-300">Tank Farm GOV → NSV @ 15 °C</span>
            <span className="font-mono font-bold text-emerald-300">Δ 0.06%</span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {[
              ["TK-01", 0.84, "10,080 m³"],
              ["TK-02", 0.52, "6,240 m³"],
              ["TK-03", 0.71, "8,520 m³"],
              ["TK-04", 0.36, "4,320 m³"],
            ].map(([tk, lvl, vol], idx) => (
              <div key={tk as string} className="text-center">
                <div className="relative mx-auto h-24 w-full overflow-hidden rounded-t-2xl rounded-b-lg border border-white/12 bg-slate-950/70">
                  <div
                    className="bar-anim absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-600 to-teal-300"
                    style={{ height: `${(lvl as number) * 100}%`, animationDelay: `${idx * 90}ms` }}
                  />
                </div>
                <p className="mt-1 text-[11px] font-bold text-white">{tk as string}</p>
                <p className="font-mono text-[9.5px] text-slate-400">{vol as string}</p>
              </div>
            ))}
          </div>
          <HudRow label="AccuLoad Bay 4 · Ticket #88213" value="NMDPRA Spec Verified ✓" tone="text-emerald-300" />
        </div>
      )}

      {kind === "haul" && (
        <div className="relative grid items-center gap-3 sm:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-3.5 py-2">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="rounded bg-emerald-500 px-2 py-0.5 font-mono text-[10px] font-extrabold text-slate-950">
                e-WAYBILL
              </span>
              <span className="font-mono text-[11px] text-slate-300">WB-2026-104882</span>
            </div>
            <HudRow label="Truck · Compartments" value="LSD 482 XY · 3 / 3" />
            <HudRow label="Gross / Tare Weight" value="49.8 t / 15.2 t" />
            <HudRow label="Cargo · Water-Paste" value="AGO 45,000 L · Dry ✓" />
            <HudRow label="Corridor Geofence" value="Zero Deviations" tone="text-emerald-300" />
          </div>
          <div className="mx-auto">
            <StylizedQr label="POD · SHA-256" />
          </div>
        </div>
      )}

      {kind === "epc" && (
        <div className="relative flex flex-col items-center gap-3.5 sm:flex-row">
          <HudRing pct={0.92} label="NCFCC" sub="Tender Ready" />
          <div className="w-full flex-1 space-y-1.5">
            {[
              ["NCDF 1% remittance verified", true],
              ["MTC 3.1 / 3.2 heat #H-88412", true],
              ["NOGIC-JQS JSON dossier ready", true],
              ["Crane CR-02 NCEC · 18d alert", false],
            ].map(([item, ok]) => (
              <div key={item as string} className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-xs">
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded text-[10px] font-bold ${
                    ok ? "bg-emerald-400 text-slate-950" : "bg-amber-400 text-slate-950"
                  }`}
                >
                  {ok ? "✓" : "!"}
                </span>
                <span className="truncate font-medium text-white">{item as string}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {kind === "safe" && (
        <div className="relative space-y-2">
          {[
            { name: "A. Bello", cert: "BOSIET · HUET · Medical", rem: "212 d valid", state: "ok" },
            { name: "C. Eze", cert: "Confined Space PTW-0412", rem: "H₂S 0 ppm · LEL 2%", state: "ok" },
            { name: "E. Okon", cert: "OSP Safety Permit", rem: "Expired 2 d ago", state: "crit" },
            { name: "F. Adeyemi", cert: "BOSIET Renewal", rem: "19 d (<30d gate)", state: "warn" },
          ].map((row, idx) => (
            <div
              key={row.name}
              className="rise flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="min-w-0">
                <p className="truncate font-bold text-white">{row.name}</p>
                <p className="truncate text-[10.5px] text-slate-400">
                  {row.cert} · {row.rem}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                  row.state === "ok"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : row.state === "warn"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                      : "bg-rose-500/25 text-rose-300 border border-rose-400/40"
                }`}
              >
                {row.state === "ok" ? "CLEARED" : "GATE LOCKED"}
              </span>
            </div>
          ))}
        </div>
      )}

      {kind === "stores" && (
        <div className="relative space-y-3">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-300">
            MARPOL Annex VI Refrigerant & Lube Custody
          </p>
          <div className="grid grid-cols-6 gap-2 text-center">
            {[
              ["R404", 0.82],
              ["R22", 0.35],
              ["R407", 0.64],
              ["R134a", 0.9],
              ["R407C", 0.55],
              ["R410A", 0.24],
            ].map(([gas, pct], idx) => (
              <div key={gas as string}>
                <div className="relative mx-auto h-20 w-8 overflow-hidden rounded-t-full rounded-b-md border border-white/15 bg-slate-950/70">
                  <div
                    className={`bar-anim absolute inset-x-0 bottom-0 ${
                      (pct as number) < 0.3 ? "bg-amber-400" : "bg-gradient-to-t from-emerald-600 to-emerald-300"
                    }`}
                    style={{ height: `${(pct as number) * 100}%`, animationDelay: `${idx * 65}ms` }}
                  />
                </div>
                <p className="mt-1 font-mono text-[10px] font-bold text-white">{gas as string}</p>
              </div>
            ))}
          </div>
          <HudRow label="Marine Lube · SAE 40 (209 L)" value="24 Drums · Lot Verified" />
          <HudRow label="Vessel Medical Chest Expiry" value="All Clear > 90 d" tone="text-emerald-300" />
        </div>
      )}

      {kind === "tank" && (
        <div className="relative space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-slate-300">JOB TW-221 · CRUDE TANK 7 RECOAT</span>
            <span className="font-mono font-bold text-emerald-300">DFT 312 µm ✓</span>
          </div>
          {[
            ["Sludge Evacuation & NESREA Manifest", 1],
            ["Degassing & SafePass Confined PTW", 1],
            ["Abrasive Blasting · SA 2.5 Profile", 0.86],
            ["Epoxy Internal Recoat · SSPC-PA 2", 0.62],
          ].map(([stage, pct], idx) => (
            <div key={stage as string}>
              <div className="flex justify-between text-[11.5px]">
                <span className="text-white/90">{stage as string}</span>
                <span className="font-mono text-emerald-300">{Math.round((pct as number) * 100)}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="bar-anim-x h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300"
                  style={{ width: `${(pct as number) * 100}%`, animationDelay: `${idx * 90}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {kind === "shield" && (
        <div className="relative space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["NCDMB NCFCC", "Valid · 142 d", "ok"],
              ["NUPRC Service Permit", "Renewal · 58 d", "warn"],
              ["NIMASA Cabotage", "Valid · 204 d", "ok"],
              ["ISO 45001 Surveillance", "Audit Pack Sealed", "ok"],
            ].map(([reg, status, tone]) => (
              <div key={reg} className="rounded-xl border border-white/10 bg-slate-950/60 p-2.5">
                <p className="text-xs font-bold text-white">{reg}</p>
                <p className={`mt-1 font-mono text-[10.5px] font-semibold ${tone === "ok" ? "text-emerald-300" : "text-amber-300"}`}>
                  {status}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["90d Notice", "60d Escalation", "30d Critical", "7d Stop-Work Gate"].map((pill, i) => (
              <span
                key={pill}
                className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] font-bold ${
                  i === 3
                    ? "border-rose-400/40 bg-rose-500/20 text-rose-200"
                    : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                }`}
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      )}

      {kind === "billing" && (
        <div className="relative space-y-3">
          <div className="rounded-2xl border border-white/12 bg-slate-950/65 p-3.5">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs font-extrabold text-white">IPC-03 / INV-2026-0418</p>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                FX Locked
              </span>
            </div>
            <div className="mt-2">
              <HudRow label="Gross Certified Valuation" value="$48,200.00" />
              <HudRow label="5% Retention · 7.5% VAT" value="Applied (Minor Units)" />
              <HudRow label="Locked FX Rate Snapshot" value="₦1,512.40 / USD" />
              <HudRow label="Net Payable (NGN)" value="₦72,897,680.00" tone="text-emerald-300" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10.5px]">
            {[
              ["0–30d", "$212k"],
              ["31–60d", "$64k"],
              ["61–90d", "$18k"],
              [">90d", "$0"],
            ].map(([bucket, amt]) => (
              <div key={bucket} className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                <p className="text-[9.5px] text-slate-400">{bucket}</p>
                <p className="font-bold text-white">{amt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {kind === "portal" && (
        <div className="relative space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono uppercase tracking-wider text-emerald-300">External Operator View · Read-Only</span>
            <Icon.Shield size={15} className="text-emerald-300" />
          </div>
          {[
            ["e-BDN · MV Atlantic Grace", "SHA-256 Verified ✓"],
            ["Zero-Drop Hydrotest · Line TL-04", "API 1110 Sealed ✓"],
            ["Tanker POD · WB-2026-104882", "Buyer Signed ✓"],
            ["NCDMB NOGIC-JQS Compliance Pack", "Current ✓"],
          ].map(([doc, seal], idx) => (
            <div
              key={doc}
              className="rise flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <span className="truncate font-semibold text-white">{doc}</span>
              <span className="shrink-0 font-mono text-[10.5px] font-bold text-emerald-300">{seal}</span>
            </div>
          ))}
        </div>
      )}

      {kind === "owner" && (
        <div className="relative space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Fleet Shrinkage", "0.18%", "Below 0.50% cap"],
              ["Turnaround Time", "6.4 hrs", "−14% faster"],
              ["Reconciled Today", "98.2%", "11 / 11 sites"],
              ["Stop-Work Risks", "0 Open", "All gates green"],
            ].map(([label, val, note]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-slate-950/60 p-2.5">
                <p className="text-[10.5px] text-slate-400">{label}</p>
                <p className="mt-0.5 font-mono text-lg font-extrabold text-white">{val}</p>
                <p className="text-[10px] font-semibold text-emerald-300">{note}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              30-Day Cross-Module Throughput
            </p>
            <MiniBars seed={51} count={18} />
          </div>
        </div>
      )}

      {kind === "offshore" && (
        <div className="relative space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-white">VOY-0611 · PSV COASTAL PIONEER</span>
            <span className="rounded bg-sky-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300">
              87% Deck Load
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1.5 rounded-2xl border border-white/10 bg-slate-950/65 p-3" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, i) => {
              const dg = i === 5;
              const free = i >= 16;
              return (
                <span
                  key={i}
                  className={`rise h-6 rounded-md ${
                    dg
                      ? "bg-amber-400"
                      : free
                        ? "border border-dashed border-white/20"
                        : i % 2 === 0
                          ? "bg-emerald-400/85"
                          : "bg-sky-400/85"
                  }`}
                  style={{ animationDelay: `${i * 25}ms` }}
                />
              );
            })}
          </div>
          <HudRow label="DNV-ST-E271 CCU & Sling Checks" value="46 / 46 Valid ✓" tone="text-emerald-300" />
          <HudRow label="IMDG Segregation · Backload" value="Verified · 18 CCUs Due" />
        </div>
      )}

      {kind === "rigsupply" && (
        <div className="relative space-y-2.5">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-300">
            Rig Delta-2 · Live Days-of-Supply Forecast
          </p>
          {[
            ["Marine Gas Oil (MGO)", 0.78, "9.1 days", "bg-emerald-400"],
            ["Drill Water", 0.24, "2.5 days · Top-up", "bg-amber-400"],
            ["Liquid Mud (1.45 SG)", 0.56, "5.4 days", "bg-sky-400"],
            ["Bulk Class-G Cement", 0.72, "8.2 days", "bg-emerald-400"],
          ].map(([item, pct, days, cls]) => (
            <div key={item as string}>
              <div className="flex justify-between text-xs">
                <span className="text-white/90">{item as string}</span>
                <span className="font-mono font-semibold text-white">{days as string}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`bar-anim-x h-full rounded-full ${cls as string}`} style={{ width: `${(pct as number) * 100}%` }} />
              </div>
            </div>
          ))}
          <HudRow label="PSV Meter vs. Rig Tank Sounding" value="Δ 0.18% ✓" tone="text-emerald-300" />
        </div>
      )}

      {kind === "crew" && (
        <div className="relative space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-white">AW139 HELI MANIFEST · FLT-1184</span>
            <span className="font-mono text-emerald-300">1,268 kg payload</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }).map((_, idx) => {
              const blocked = idx === 7;
              return (
                <div
                  key={idx}
                  className={`rise grid h-8 place-items-center rounded-lg font-mono text-[10.5px] font-bold ${
                    blocked
                      ? "border border-rose-400/45 bg-rose-500/20 text-rose-200"
                      : "border border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                  }`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  {blocked ? "HUET ✕" : `S-${String(idx + 1).padStart(2, "0")} ✓`}
                </div>
              );
            })}
          </div>
          <HudRow label="Installation Live POB / Lifeboats" value="94 / 100 Beds ✓" tone="text-emerald-300" />
        </div>
      )}

      {kind === "vessel" && (
        <div className="relative space-y-2.5">
          {[
            ["AHTS Coastal Titan", "On-Hire · DP2 Active", "text-emerald-300"],
            ["PSV Atlantic Grace", "On-Hire · Supply Run", "text-emerald-300"],
            ["Crew Boat Swift IV", "Cabotage · 41d Notice", "text-amber-300"],
          ].map(([v, st, tone]) => (
            <div key={v} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs">
              <span className="font-bold text-white">{v}</span>
              <span className={`font-mono text-[11px] font-semibold ${tone}`}>{st}</span>
            </div>
          ))}
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Dual-Signed Chargeable Charter Days
            </p>
            <MiniBars seed={73} count={14} color="bg-sky-400" />
          </div>
        </div>
      )}

      {kind === "equip" && (
        <div className="relative flex flex-col items-center gap-3.5 sm:flex-row">
          <HudRing pct={0.89} label="Slings" sub="Exam Valid" />
          <div className="w-full flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-3.5 py-2">
            <HudRow label="Tracked CCUs & Tools" value="2,640 Units" />
            <HudRow label="Currently Offshore" value="784 Units" />
            <HudRow label="Idle >14d Alert" value="3 Skips Flagged" tone="text-amber-300" />
            <HudRow label="Rental Invoice Match" value="100% Verified ✓" tone="text-emerald-300" />
          </div>
        </div>
      )}

      {kind === "guard" && (
        <div className="relative space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-white">VRA-0208 · GULF OF GUINEA TRANSIT</span>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
              Escort RV 17:30
            </span>
          </div>
          <svg viewBox="0 0 300 96" className="h-24 w-full rounded-2xl border border-white/10 bg-slate-950/70" aria-hidden="true">
            <circle cx="155" cy="48" r="24" fill="rgba(245,158,11,0.18)" />
            <path
              d="M24,24 C95,38 155,64 276,76"
              pathLength={1}
              className="draw-line"
              stroke="#38bdf8"
              strokeWidth="2.5"
              fill="none"
            />
            <circle cx="24" cy="24" r="4" fill="#38bdf8" />
            <circle cx="276" cy="76" r="4.5" fill="#34d399" />
          </svg>
          <HudRow label="BMP West Africa · Citadel Drill" value="12 / 12 Logged ✓" tone="text-emerald-300" />
          <HudRow label="MDAT-GoG · AIS Status Log" value="Initial + Daily Sent" />
        </div>
      )}

      {kind === "enviro" && (
        <div className="relative space-y-3">
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {["Rig Skip", "PSV Deck", "Quay Base", "Licensed Disposal"].map((node, i) => (
              <div
                key={node}
                className="rise rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-1.5 py-2"
                style={{ animationDelay: `${i * 75}ms` }}
              >
                <p className="font-mono text-xs font-extrabold text-emerald-300">0{i + 1} ✓</p>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-white">{node}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3.5 py-2">
            <HudRow label="Drill Cuttings · WTN-0644" value="36.4 t · Cert Attached" />
            <HudRow label="MARPOL Annex I & V Books" value="Current ✓" tone="text-emerald-300" />
            <HudRow label="Voyage Fuel CO₂ (ESG Pack)" value="Logged per Charter" />
          </div>
        </div>
      )}

      {kind === "security" && (
        <div className="relative space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Encryption", "AES-256 + TLS 1.3"],
              ["Tenant Boundary", "PostgreSQL RLS"],
              ["Audit Integrity", "SHA-256 Append-Only"],
              ["Data Privacy", "NDPA 2023 Ready"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-slate-950/60 p-2.5">
                <p className="text-[10.5px] text-slate-400">{k}</p>
                <p className="mt-0.5 font-mono text-xs font-bold text-emerald-300">{v}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["NCDMB", "NUPRC", "NMDPRA", "NIMASA", "MARPOL VI", "ASTM D1250", "API 1110", "SAP / Oracle / Odoo"].map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-white/12 bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] font-semibold text-white/85"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {kind === "roi" && (
        <div className="relative space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-emerald-300">
              Live Stem Recovery Simulator
            </span>
            <div className="inline-flex rounded-lg border border-white/15 bg-slate-950/80 p-0.5">
              {(["USD", "NGN"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setRoiCur(c)}
                  className={`rounded-md px-2 py-0.5 font-mono text-[10.5px] font-bold transition ${
                    roiCur === c ? "bg-emerald-400 text-slate-950" : "text-white/70 hover:text-white"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
            <label htmlFor="pitch-stems-range" className="flex items-center justify-between text-xs text-white">
              <span>1,000 MT stems / month (0.5% recovered)</span>
              <span className="font-mono font-bold text-emerald-300">{stemsPerMo} stems</span>
            </label>
            <input
              id="pitch-stems-range"
              type="range"
              min={2}
              max={30}
              step={1}
              value={stemsPerMo}
              onChange={(e) => setStemsPerMo(Number(e.target.value))}
              className="mt-2 w-full"
            />
            <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-2.5">
              <span className="text-xs text-slate-400">Illustrative annual recovery</span>
              <span className="font-mono text-2xl font-extrabold text-emerald-300">
                {roiCur === "USD"
                  ? `$${(stemsPerMo * 3000 * 12).toLocaleString("en-US")}`
                  : `₦${((stemsPerMo * 3000 * 12 * 1500) / 1_000_000).toFixed(1)}M`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
              <p className="text-slate-400">Micro</p>
              <p className="font-bold text-white">{roiCur === "USD" ? "$3.6k/yr" : "₦5.5M/yr"}</p>
            </div>
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-2">
              <p className="text-emerald-200">Growth</p>
              <p className="font-bold text-white">{roiCur === "USD" ? "$22.5k/yr" : "₦34M/yr"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
              <p className="text-slate-400">Enterprise</p>
              <p className="font-bold text-white">{roiCur === "USD" ? "$48k/yr" : "₦72M/yr"}</p>
            </div>
          </div>
        </div>
      )}

      {kind === "cta" && (
        <div className="relative space-y-3.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/35 bg-emerald-500/15 p-3.5">
            <div>
              <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-emerald-300">
                Official Platform URL
              </p>
              <a
                href="https://www.ofshora.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1.5 text-lg font-extrabold text-white underline decoration-emerald-400/60 underline-offset-4 hover:text-emerald-200"
              >
                www.ofshora.com <Icon.ArrowUpRight size={16} />
              </a>
              <p className="mt-1 text-xs text-white/75">
                60-day paid pilot · 100% credited on conversion
              </p>
            </div>
            <StylizedQr label="OFSHORA.COM" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href="/register"
              className="hero-btn inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold"
            >
              Start 60-Day Pilot <Icon.Arrow size={14} />
            </Link>
            <a
              href="/Offshora-Energy-OS-Pitch-Deck.pptx"
              download="Offshora-Energy-OS-Pitch-Deck.pptx"
              className="hero-ghost inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white hover:border-emerald-400/50 hover:text-emerald-200"
            >
              Download .pptx Deck
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

