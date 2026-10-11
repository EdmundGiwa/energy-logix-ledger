"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from "react";
import { Icon } from "./icons";
import { seeded } from "./charts";
import { CountUp } from "./primitives";

/* ------------------------------------------------------------------ */
/* Chapters                                                            */
/* ------------------------------------------------------------------ */

type IconC = ComponentType<{ size?: number; className?: string }>;
type Tone = "ok" | "warn" | "crit";

type Chapter = {
  key: string;
  word: string;
  module: string;
  icon: IconC;
  image: string;
  alt: string;
  position: string;
  place: string;
  coords: string;
  line: string;
  record: { title: string; id: string };
  steps: { label: string; meta: string; flag?: boolean }[];
  metric: { label: string; value: number; decimals?: number; unit: string; note: string; seed: number };
  toast: { tone: Tone; title: string; text: string };
};

const chapters: Chapter[] = [
  {
    key: "bunker",
    word: "litre",
    module: "BunkerFlow",
    icon: Icon.Ship,
    image: "/images/rig-vessel.jpg",
    alt: "Supply vessel alongside an offshore platform",
    position: "object-[62%_50%]",
    place: "Lagos Offshore Anchorage",
    coords: "6.38° N · 3.37° E",
    line: "Soundings corrected to ASTM 54B, dual-signed e-BDNs and sealed samples. Every bunker stem reconciles before the barge casts off.",
    record: { title: "e-BDN · MV Atlantic Grace", id: "BDN-2026-0418" },
    steps: [
      { label: "Stem nominated", meta: "420 MT VLSFO" },
      { label: "Tanks sounded fore & aft", meta: "6 tanks" },
      { label: "Corrected · ASTM 54B / 56", meta: "VCF 0.98143" },
      { label: "Variance checked", meta: "0.18% ✓" },
      { label: "Chief Engineer & supplier signed", meta: "2 / 2" },
    ],
    metric: { label: "Delivered today", value: 3420, unit: "MT", note: "+6.2% vs. plan", seed: 4 },
    toast: { tone: "ok", title: "Sample seal S-2291 logged", text: "MARPOL Annex VI record attached" },
  },
  {
    key: "pipe",
    word: "line",
    module: "PipeIntegrity",
    icon: Icon.Pipe,
    image: "/images/rig-aerial.jpg",
    alt: "Aerial view of an offshore platform with a support vessel",
    position: "object-[38%_50%]",
    place: "Trunkline TL-04 · Delta corridor",
    coords: "5.52° N · 5.75° E",
    line: "Pig runs, hydrotests, NDT and cathodic protection on one integrity record, ready to export in your IOC client's audit format.",
    record: { title: "Pig run · PG-17 · TL-04", id: "PIG-2026-0117" },
    steps: [
      { label: "Launched at KP-0", meta: "62 bar" },
      { label: "Passed marker KP-46", meta: "38 min late", flag: true },
      { label: "Receiver crew alerted", meta: "Auto" },
      { label: "Arrived at KP-71", meta: "16:05" },
      { label: "Debris logged & photographed", meta: "4.2 kg" },
    ],
    metric: { label: "Line pressure", value: 148.6, decimals: 1, unit: "bar", note: "Stable ±0.4 bar", seed: 12 },
    toast: { tone: "warn", title: "Transit velocity 0.9 m/s", text: "Below run plan · receiver notified" },
  },
  {
    key: "safe",
    word: "permit",
    module: "SafePass",
    icon: Icon.Shield,
    image: "/images/rig-dusk.jpg",
    alt: "Offshore production platform lit up at dusk",
    position: "object-[60%_40%]",
    place: "Platform A · Offshore Bonny",
    coords: "4.42° N · 7.15° E",
    line: "No valid ticket, no seat on the boat. Expired BOSIET and HUET certificates block the manifest, and a failed gas test locks the permit.",
    record: { title: "Crew manifest · Day shift", id: "MAN-2026-1010" },
    steps: [
      { label: "Manifest drafted", meta: "24 crew" },
      { label: "BOSIET · HUET · OSP checked", meta: "21 / 24" },
      { label: "3 crew blocked · expiring < 30 d", meta: "Blocked", flag: true },
      { label: "Standby crew swapped in", meta: "Onne base" },
      { label: "Gas test passed · PTW-0412", meta: "LEL 2%" },
    ],
    metric: { label: "Crew readiness", value: 97.8, decimals: 1, unit: "%", note: "Target 98.5%", seed: 21 },
    toast: { tone: "crit", title: "E. Okon removed from manifest", text: "OSP certificate expired 2 days ago" },
  },
];

const DURATION = 9000;
const STEP_MS = 950;

const ticker = [
  ["14:23", "e-BDN BDN-0418 sealed", "3fa9c2e1"],
  ["14:22", "Weighbridge · LSD 482 XY · gross 49.8 t", "a81d0c4f"],
  ["14:20", "Gas test · PTW-0412 · LEL 2% passed", "7c02e9b3"],
  ["14:19", "Hydrotest TL-04 · hold 22 h 14 m", "e45b1a90"],
  ["14:17", "POD WB-104882 · buyer e-signature", "19fd7a62"],
  ["14:15", "NCFCC renewal alert · 23 days", "c6e0b7d4"],
  ["14:12", "CP reading KP-46 · −0.94 V CSE", "52aa83f1"],
  ["14:10", "Gantry ticket #88213 · Δ 0.06%", "0b7e4dc9"],
];

const toneCls: Record<Tone, { ring: string; icon: string; Icon: IconC }> = {
  ok: { ring: "ring-emerald-400/40", icon: "bg-emerald-400/20 text-emerald-300", Icon: Icon.Check },
  warn: { ring: "ring-amber-400/40", icon: "bg-amber-400/20 text-amber-300", Icon: Icon.Alert },
  crit: { ring: "ring-red-500/45", icon: "bg-red-500/25 text-red-300", Icon: Icon.Alert },
};

/* Accent gradient used on icon tiles and active states */
const ACCENT = "bg-gradient-to-b from-emerald-300 to-emerald-500 text-emerald-950";

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function Spark({ seed, id }: { seed: number; id: string }) {
  const data = seeded(18, seed, 0.15, 0.95);
  const w = 200;
  const h = 48;
  const d = data.map((v, i) => `${i ? "L" : "M"}${((i / (data.length - 1)) * w).toFixed(1)},${(h - v * (h - 6) - 3).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`hsp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34d399" stopOpacity="0.35" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#hsp-${id})`} className="fade-in" style={{ animationDelay: "0.5s" }} />
      <path d={d} pathLength={1} fill="none" stroke="#34d399" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" className="draw-line" />
    </svg>
  );
}

/** The record being built, step by step, then sealed. */
function RecordCard({ c, step }: { c: Chapter; step: number }) {
  const RI = c.icon;
  const done = step >= c.steps.length;
  const pct = Math.min(1, step / c.steps.length);
  return (
    <div className="hero-glass-dark relative overflow-hidden rounded-[26px] p-5 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.85)]">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="relative flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${ACCENT}`}>
          <RI size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-bold text-white">{c.record.title}</p>
          <p className="font-mono text-[10.5px] text-slate-400">{c.record.id}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] transition-colors duration-500 ${
            done ? "text-emerald-300" : "text-white/60"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${done ? "bg-emerald-400" : "pulse-dot bg-emerald-300 text-emerald-300"}`} />
          {done ? "Sealed" : "Recording"}
        </span>
      </div>

      {/* Steps on the ledger line */}
      <div className="relative mt-5">
        <div className="absolute bottom-3 left-[11px] top-3 w-[2px] rounded-full bg-white/10">
          <div
            className="w-full rounded-full bg-gradient-to-b from-emerald-300 to-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.8)] transition-[height] duration-700 ease-out"
            style={{ height: `${pct * 100}%` }}
          />
        </div>
        <ul className="space-y-3">
          {c.steps.map((s, i) => {
            const state = i < step ? "done" : i === step ? "active" : "todo";
            return (
              <li key={s.label} className="relative flex items-center gap-3">
                <span
                  className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full transition-all duration-500 ${
                    state === "done"
                      ? s.flag
                        ? "bg-amber-400 text-amber-950"
                        : "bg-emerald-400 text-emerald-950"
                      : state === "active"
                        ? "hero-step-glow bg-[#06111d] ring-2 ring-emerald-300"
                        : "bg-[#06111d] ring-1 ring-white/20"
                  }`}
                >
                  {state === "done" && (s.flag ? <span className="text-[11px] font-black">!</span> : <Icon.Check size={13} strokeWidth={3} />)}
                  {state === "active" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />}
                </span>
                <span className={`flex-1 truncate text-[13px] transition-colors duration-500 ${state === "todo" ? "text-white/35" : "font-semibold text-white"}`}>
                  {s.label}
                </span>
                <span
                  className={`shrink-0 font-mono text-[11px] transition-opacity duration-500 ${state === "done" ? "opacity-100" : "opacity-0"} ${
                    s.flag ? "text-amber-300" : "text-slate-400"
                  }`}
                >
                  {s.meta}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer: seal */}
      <div className="relative mt-5 flex h-14 items-center gap-3 rounded-2xl bg-white/[0.04] px-3 ring-1 ring-white/[0.07]">
        {done ? (
          <>
            <span className="seal-pop grid h-10 w-10 place-items-center rounded-full border-2 border-dashed border-emerald-300/80 text-emerald-300">
              <Icon.Fingerprint size={20} />
            </span>
            <div className="fade-in min-w-0">
              <p className="text-[12.5px] font-bold text-white">Sealed on the ledger</p>
              <p className="truncate font-mono text-[10.5px] text-sky-300/90">sha256 · 3fa9c2e1 8b04d7aa 51ce90f2</p>
            </div>
            <Icon.Lock size={16} className="fade-in ml-auto shrink-0 text-emerald-300" />
          </>
        ) : (
          <>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-white/60">
              <Icon.Sync size={18} className="animate-spin-slow" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-white/80">Building record…</p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-700" style={{ width: `${pct * 100}%` }} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Floating feature bubbles                                            */
/* ------------------------------------------------------------------ */

type Bubble = {
  icon: IconC;
  label?: string;
  desc: string;
  pos: string;
  depth: number;
  delay: number;
  tall?: boolean;
};

const TALL = "hidden [@media(min-height:860px)]:xl:block";

const copyBubbles: Bubble[] = [
  { icon: Icon.WifiOff, label: "Offline-first sync", desc: "SQLite on device, delta sync on reconnect", pos: "-top-[118px] left-[2%]", depth: 16, delay: 0.5, tall: true },
  { icon: Icon.Scale, label: "ASTM 54B / 56 built in", desc: "Volume and mass corrected automatically", pos: "-top-[74px] left-[50%]", depth: 22, delay: 0.7, tall: true },
  { icon: Icon.Lock, desc: "Encrypted at rest and in transit", pos: "top-[26%] -right-[92px]", depth: 26, delay: 0.9 },
  { icon: Icon.Message, desc: "WhatsApp crew-expiry alerts", pos: "top-[60%] -right-[78px]", depth: 14, delay: 1.1 },
  { icon: Icon.Building, label: "NCDMB · NOGIC-JQS exports", desc: "Tender and M&E packs in one click", pos: "-bottom-[86px] left-[1%]", depth: 18, delay: 1.3, tall: true },
  { icon: Icon.Wallet, label: "₦ / $ dual ledger", desc: "Rate snapshot on every transaction", pos: "-bottom-[72px] left-[52%]", depth: 24, delay: 1.5, tall: true },
];

const cardBubbles: Bubble[] = [
  { icon: Icon.Pen, label: "Dual-signed e-BDN", desc: "Chief Engineer and supplier signatures", pos: "-top-[70px] left-0", depth: 20, delay: 1.0, tall: true },
  { icon: Icon.Flame, label: "Gas-test interlocks", desc: "Failed H₂S or LEL test blocks the permit", pos: "-bottom-[92px] left-[4%]", depth: 16, delay: 1.7, tall: true },
];

function FeatureBubble({ b, i }: { b: Bubble; i: number }) {
  const BI = b.icon;
  return (
    <div
      className={`parallax absolute z-20 ${b.tall ? TALL : "hidden xl:block"} ${b.pos}`}
      style={{ "--depth": `${b.depth}px` } as CSSProperties}
    >
      <div className="drift" style={{ animationDuration: `${8 + (i % 4) * 1.6}s`, animationDelay: `${-i * 1.3}s` }}>
        <div className="pop-in group relative" style={{ animationDelay: `${b.delay}s` }}>
          {b.label ? (
            <span className="relative flex cursor-default items-center gap-2.5 overflow-hidden rounded-xl border border-white/[0.12] bg-[#0b1d30]/55 py-2 pl-2 pr-3.5 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.85)] backdrop-blur-xl transition duration-300 group-hover:-translate-y-0.5 group-hover:border-emerald-300/35">
              <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-gradient-to-b from-emerald-300 to-emerald-500" />
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-400/12 text-emerald-300 ring-1 ring-emerald-300/25">
                <BI size={14} />
              </span>
              <span className="text-[12px] font-semibold leading-tight text-white/90">{b.label}</span>
            </span>
          ) : (
            <span className="relative grid h-11 w-11 cursor-default place-items-center rounded-xl border border-white/[0.12] bg-[#0b1d30]/55 text-emerald-300 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.85)] backdrop-blur-xl transition duration-300 group-hover:-translate-y-0.5 group-hover:border-emerald-300/35">
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" />
              <BI size={18} />
            </span>
          )}
          <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30 w-max max-w-[220px] -translate-x-1/2 translate-y-1 rounded-xl bg-[#06111d]/90 px-3 py-2 text-[11.5px] font-medium text-white/80 opacity-0 ring-1 ring-white/10 backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            {b.desc}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export function Hero() {
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useRef(false);
  const c = chapters[index];

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) setPaused(true);
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Step through the record for the active chapter
  useEffect(() => {
    if (reduced.current) {
      setStep(chapters[index].steps.length);
      return;
    }
    setStep(0);
    const id = setInterval(() => {
      setStep((s) => (s >= chapters[index].steps.length ? s : s + 1));
    }, STEP_MS);
    return () => clearInterval(id);
  }, [index]);

  // Mouse parallax via CSS variables (no re-render)
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || reduced.current) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        el.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
    };
    el.addEventListener("pointermove", onMove);
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const go = (i: number) => {
    const next = (i + chapters.length) % chapters.length;
    if (next === index) return;
    setPrev(index);
    setIndex(next);
  };
  const onCycleEnd = () => {
    if (reduced.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    go(index + 1);
  };

  const T = toneCls[c.toast.tone];
  const ToastIcon = T.Icon;

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#06111d] text-white"
      aria-roledescription="carousel"
      aria-label="PetroLedger in the field"
    >
      {/* ---------- Background: circular wipe + slow zoom ---------- */}
      <div className="absolute inset-0 -z-10 bg-[#06111d]">
        {chapters.map((ch, i) => {
          const isActive = i === index;
          const isPrev = i === prev;
          return (
            <div
              key={ch.key}
              aria-hidden={!isActive}
              className={`absolute inset-0 ${isActive ? `z-20 ${prev !== null ? "reveal-circle" : ""}` : isPrev ? "z-10" : "z-0 opacity-0"}`}
            >
              <Image
                src={ch.image}
                alt={ch.alt}
                fill
                preload={i === 0}
                sizes="100vw"
                className={`object-cover ${ch.position} transition-transform duration-[12000ms] ease-out ${
                  mounted && isActive ? "scale-100" : "scale-[1.14]"
                }`}
              />
            </div>
          );
        })}
        <div className="absolute inset-0 z-30 bg-gradient-to-r from-[#06111d] via-[#06111d]/75 to-[#06111d]/20" />
        <div className="absolute inset-0 z-30 bg-gradient-to-t from-[#06111d] via-[#06111d]/20 to-[#06111d]/50" />
        <div className="absolute -left-40 top-1/3 z-30 h-[520px] w-[520px] rounded-full bg-sky-600/20 blur-[140px]" />
        <div className="absolute -bottom-48 right-0 z-30 h-[520px] w-[760px] rounded-full bg-emerald-500/20 blur-[150px]" />
        <div className="hero-noise absolute inset-0 z-30" />
      </div>

      {/* ---------- Main ---------- */}
      <div className="mx-auto grid w-full max-w-[1320px] flex-1 content-center items-center gap-12 px-5 pb-10 pt-32 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16 lg:pt-36">
        {/* Copy */}
        <div className="relative max-w-[600px]">
          {copyBubbles.map((b, i) => (
            <FeatureBubble key={i} b={b} i={i} />
          ))}
          <div className="rise flex items-center gap-3">
            <span className="relative h-px w-12 overflow-hidden bg-white/15">
              <span className="absolute inset-y-0 left-0 w-full origin-left bg-gradient-to-r from-emerald-300 to-emerald-500 [animation:progress_1.2s_cubic-bezier(0.2,0.8,0.2,1)_0.3s_both]" />
            </span>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.24em] text-white/60">
              <span className="text-emerald-300">Energy OS</span>
              <span className="mx-2 text-white/25">/</span>
              Built for Nigerian service contractors
            </p>
          </div>

          <h1 className="rise mt-7 text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.04em] text-white sm:text-[3.4rem] xl:text-[4rem]" style={{ animationDelay: "0.08s" }}>
            Every{" "}
            <span className="relative inline-grid h-[1.08em] overflow-hidden align-bottom">
              {chapters.map((ch, i) => (
                <span
                  key={ch.key}
                  aria-hidden={i !== index}
                  className="hero-grad col-start-1 row-start-1 transition-all duration-700 ease-[cubic-bezier(0.7,0,0.2,1)]"
                  style={{
                    transform: `translateY(${(i - index) * 110}%)`,
                    opacity: i === index ? 1 : 0,
                    filter: i === index ? "none" : "blur(6px)",
                  }}
                >
                  {ch.word},
                </span>
              ))}
            </span>
            <br />
            on record.
          </h1>

          <p key={c.key} className="rise mt-6 max-w-[52ch] text-[15.5px] leading-relaxed text-white/70 sm:text-base">
            {c.line}
          </p>

          <div className="rise mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.16s" }}>
            <a href="#contact" className="hero-btn inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[14px] font-bold">
              Start a 60-day pilot <Icon.Arrow size={17} />
            </a>
            <a
              href="#modules"
              className="hero-ghost group inline-flex items-center justify-center gap-2.5 rounded-xl py-3.5 pl-3.5 pr-6 text-[14px] font-semibold text-white"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-slate-900 transition group-hover:scale-110">
                <Icon.Play size={12} className="ml-0.5" />
              </span>
              See all 12 modules
            </a>
          </div>

          <div className="rise mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12.5px] text-white/55" style={{ animationDelay: "0.24s" }}>
            {[
              [Icon.WifiOff, "Works offline"],
              [Icon.Lock, "Tamper-evident records"],
              [Icon.Building, "NCDMB-ready exports"],
            ].map(([I, t], k) => {
              const C = I as IconC;
              return (
                <span key={k} className="inline-flex items-center gap-2">
                  <C size={15} className="text-emerald-300" /> {t as string}
                </span>
              );
            })}
          </div>
        </div>

        {/* Product moment */}
        <div className="relative mx-auto w-full max-w-[460px] lg:mx-0">
          {cardBubbles.map((b, i) => (
            <FeatureBubble key={i} b={b} i={i + copyBubbles.length} />
          ))}
          {/* Location chip */}
          <div className="parallax mb-3 flex items-center justify-between gap-3" style={{ "--depth": "6px" } as CSSProperties}>
            <span key={c.place} className="fade-in inline-flex items-center gap-2 text-[12px] font-semibold text-white/85">
              <Icon.Pin size={14} className="text-emerald-300" /> {c.place}
              <span className="hidden font-mono text-[10.5px] font-medium text-white/40 sm:inline">{c.coords}</span>
            </span>
          </div>

          <div key={c.key} className="rise parallax" style={{ "--depth": "-8px" } as CSSProperties}>
            <RecordCard c={c} step={step} />
          </div>

          {/* Floating metric */}
          <div className="parallax absolute -right-10 -top-[118px] hidden w-[200px] xl:block" style={{ "--depth": "18px" } as CSSProperties}>
            <div key={c.key} className="hero-glass toast-in animate-float rounded-[20px] p-3.5 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.8)]" style={{ animationDelay: "0.3s" }}>
              <p className="text-[11px] font-medium text-white/65">{c.metric.label}</p>
              <p className="mt-1 text-[22px] font-extrabold leading-none text-white">
                <CountUp key={c.key} to={c.metric.value} decimals={c.metric.decimals ?? 0} />
                <span className="ml-1 text-[11px] font-semibold text-white/45">{c.metric.unit}</span>
              </p>
              <p className="mt-1 text-[10.5px] font-semibold text-emerald-300">{c.metric.note}</p>
              <div className="-mx-3.5 -mb-3.5 mt-2 h-10">
                <Spark seed={c.metric.seed} id={c.key} />
              </div>
            </div>
          </div>

          {/* Floating alert toast, appears mid-sequence */}
          <div className="parallax absolute -bottom-10 right-2 w-[250px] sm:-right-12 sm:w-[270px]" style={{ "--depth": "22px" } as CSSProperties}>
            {step >= 2 && (
              <div key={c.key} className={`hero-glass-dark toast-in flex items-start gap-3 rounded-2xl p-3 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.9)] ring-1 ${T.ring}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${T.icon}`}>
                  <ToastIcon size={15} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-bold text-white">{c.toast.title}</p>
                  <p className="truncate text-[11px] text-slate-400">{c.toast.text}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Chapter navigator ---------- */}
      <div className="mx-auto w-full max-w-[1320px] px-5 pb-6 sm:px-8">
        <div className="flex items-stretch gap-2">
          <div className="no-scrollbar grid flex-1 auto-cols-[minmax(220px,1fr)] grid-flow-col gap-2 overflow-x-auto" role="tablist" aria-label="Chapters">
            {chapters.map((ch, i) => {
              const on = i === index;
              const CI = ch.icon;
              return (
                <button
                  key={ch.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => go(i)}
                  className={`group relative overflow-hidden rounded-2xl p-3.5 text-left transition duration-500 ${
                    on ? "bg-white/[0.12] ring-1 ring-white/20 backdrop-blur-xl" : "bg-white/[0.04] ring-1 ring-white/[0.06] hover:bg-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition duration-500 ${
                        on ? ACCENT : "bg-white/[0.06] text-white/60"
                      }`}
                    >
                      <CI size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className={`text-[13px] font-bold transition ${on ? "text-white" : "text-white/60"}`}>
                        <span className="mr-1.5 font-mono text-[10.5px] font-medium text-white/40">0{i + 1}</span>
                        {ch.module}
                      </p>
                      <p className="truncate text-[11.5px] text-white/45">Every {ch.word}, on record</p>
                    </div>
                  </div>
                  <span className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.06]">
                    {on && (
                      <span
                        key={`p-${index}`}
                        onAnimationEnd={onCycleEnd}
                        className="block h-full origin-left bg-gradient-to-r from-emerald-500 to-emerald-300 shadow-[0_0_10px_#34d399]"
                        style={{ animation: `progress ${DURATION}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play slideshow" : "Pause slideshow"}
            className="hidden w-12 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-white/70 ring-1 ring-white/[0.06] transition hover:bg-white/[0.1] hover:text-white sm:grid"
          >
            {paused ? <Icon.Play size={15} /> : <Icon.Pause size={15} />}
          </button>
        </div>
      </div>

      {/* ---------- Live ledger ticker ---------- */}
      <div className="relative flex items-center border-t border-white/[0.07] bg-[#06111d]/60 py-3 backdrop-blur-md">
        <div className="flex shrink-0 items-center gap-2 pl-5 pr-4 text-[10.5px] font-bold uppercase tracking-[0.18em] text-emerald-300 sm:pl-8">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-300 text-emerald-300" /> Live ledger
        </div>
        <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
          <div className="animate-marquee flex w-max gap-10">
            {[...ticker, ...ticker].map(([t, what, sig], i) => (
              <span key={i} className="inline-flex items-center gap-2.5 whitespace-nowrap text-[12px]">
                <span className="font-mono text-white/35">{t}</span>
                <span className="font-medium text-white/75">{what}</span>
                <span className="font-mono text-[10.5px] text-sky-300/70">sig {sig}</span>
                <span className="text-white/15">◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
