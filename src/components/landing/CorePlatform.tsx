"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icons";
import { Reveal, SectionHeading, Spotlight } from "./primitives";

type Entry = { id: number; t: string; who: string; what: string; hash: string };

const captures = [
  { who: "T. Nwosu · Barge master", what: "Sounding · Tank 2S · 1.92 m" },
  { who: "K. Ibrahim · Technician", what: "Gas test · H₂S 0 ppm · LEL 2%" },
  { who: "M. Oduya · Driver", what: "POD · WB-104882 · buyer signed" },
  { who: "R. Ekpo · Inspector", what: "CP reading · KP-46 · −0.94 V" },
  { who: "J. Afolabi · Dispatcher", what: "Weighbridge · gross 49.8 t" },
];

function hash(n: number) {
  let h = (n * 2654435761) >>> 0;
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += "0123456789abcdef"[h & 15];
    h = (h >>> 4) ^ (h * 31);
  }
  return out;
}

function stamp(offsetMin: number) {
  const base = 14 * 60 + 23 + offsetMin;
  return `${String(Math.floor(base / 60) % 24).padStart(2, "0")}:${String(base % 60).padStart(2, "0")}`;
}

function FieldPhone() {
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<number[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [log, setLog] = useState<Entry[]>(() =>
    [0, 1, 2].map((i) => ({ id: i, t: stamp(-i * 4), who: captures[i].who, what: captures[i].what, hash: hash(i + 1) }))
  );
  const counter = useRef(10);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const capture = () => {
    counter.current += 1;
    const id = counter.current;
    if (online) {
      const c = captures[id % captures.length];
      setLog((l) => [{ id, t: stamp(id - 10), who: c.who, what: c.what, hash: hash(id) }, ...l].slice(0, 6));
    } else {
      setQueue((q) => [...q, id]);
    }
  };

  const toggle = () => {
    if (online) {
      setOnline(false);
      return;
    }
    setOnline(true);
    if (!queue.length) return;
    setSyncing(true);
    const pending = [...queue];
    pending.forEach((id, i) => {
      const t = window.setTimeout(() => {
        const c = captures[id % captures.length];
        setLog((l) => [{ id, t: stamp(id - 10), who: c.who, what: c.what, hash: hash(id) }, ...l].slice(0, 6));
        setQueue((q) => q.filter((x) => x !== id));
        if (i === pending.length - 1) setSyncing(false);
      }, 500 + i * 450);
      timers.current.push(t);
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-[300px_1fr] md:items-center">
      {/* Phone simulator */}
      <div className="relative mx-auto w-[290px]">
        <div className="rounded-[44px] border border-slate-300 bg-slate-900 p-2.5 shadow-2xl">
          <div className="relative overflow-hidden rounded-[36px] bg-slate-950 text-white">
            <div className="flex items-center justify-between px-6 pb-2 pt-3 text-[11px] font-semibold text-slate-300">
              <span>14:23</span>
              <span className="h-4.5 w-18 rounded-full bg-black" />
              <span className="flex items-center gap-1">
                {online ? <Icon.Wifi size={13} className="text-emerald-400" /> : <Icon.WifiOff size={13} className="text-amber-400" />}
              </span>
            </div>
            <div className="px-4 pb-4">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Field app</p>
              <p className="mt-0.5 text-[18px] font-extrabold text-white">Barge PB-04</p>

              <div
                className={`mt-3 rounded-xl p-3 transition-colors duration-300 ${
                  online ? "border border-emerald-500/30 bg-emerald-950/40" : "border border-amber-500/30 bg-amber-950/40"
                }`}
              >
                <p className={`text-[12px] font-bold ${online ? "text-emerald-300" : "text-amber-300"}`}>
                  {online ? (syncing ? "Delta sync in progress…" : "Connected · VSAT link") : "Offline · saving locally"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {online ? "Records sync as you save" : "SQLite on device. Zero data loss."}
                </p>
              </div>

              <button
                type="button"
                onClick={capture}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-[13px] font-bold text-slate-950 shadow-sm transition active:scale-[0.98] hover:bg-slate-100"
              >
                <Icon.Pen size={15} /> Capture reading
              </button>

              <button
                type="button"
                onClick={toggle}
                className={`mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-bold transition active:scale-[0.98] ${
                  online
                    ? "border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-800"
                    : "btn-green"
                }`}
              >
                {online ? (
                  <>
                    <Icon.WifiOff size={15} /> Simulate link drop
                  </>
                ) : (
                  <>
                    <Icon.Sync size={15} /> Reconnect and sync
                  </>
                )}
              </button>

              <div className="mt-3 min-h-[80px] space-y-1.5">
                {queue.length === 0 && <p className="pt-5 text-center text-[11px] text-slate-500">All field records synced</p>}
                {queue.slice(-3).map((id) => (
                  <div key={id} className="rise flex items-center gap-2 rounded-lg bg-slate-800/80 px-2.5 py-1.5 text-[11px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span className="truncate text-slate-200">{captures[id % captures.length].what}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/90 px-4 py-2 font-mono text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-amber-400"}`} />
                {online ? "Heartbeat OK" : "Local only"}
              </span>
              <span>{(1284 + queue.length).toLocaleString()} cached</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Audit Log Feed */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <p className="flex items-center gap-2 text-[14.5px] font-bold text-slate-900">
            Immutable audit trail
          </p>
          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-slate-600">
            append-only
          </span>
        </div>

        <div className="mt-3.5 space-y-2">
          {log.map((e) => (
            <div key={e.id} className="rise grid grid-cols-[44px_1fr] gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <span className="font-mono text-[11px] font-medium text-slate-400">{e.t}</span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-900">{e.what}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-slate-500">
                  <span>{e.who}</span>
                  <span className="font-mono text-emerald-700">sig {e.hash}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-slate-500">
          Field soundings and signatures carry tamper-evident sha256 cryptographic proofs. History is append-only and cannot be altered.
        </p>
      </div>
    </div>
  );
}

function Bento({
  title,
  icon,
  children,
  className = "",
  delay = 0,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <Spotlight className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition duration-300 hover:border-slate-300 hover:shadow-md">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-800">
            {icon}
          </span>
          <p className="text-[15px] font-bold text-slate-900">{title}</p>
        </div>
        <div className="mt-3.5 text-[13px]">{children}</div>
      </Spotlight>
    </Reveal>
  );
}

const roles = ["Managing Director", "Operations GM", "Dispatcher", "Barge Master", "Technician", "Driver", "Compliance"];
const vault = ["MTC Mill Test Certs", "NDT Reports", "HUET / BOSIET", "Vessel Insurance", "NCEC Permits", "NCFCC Packs"];

export function CorePlatform() {
  return (
    <section id="platform" className="relative scroll-mt-24 px-5 py-24 sm:px-8 md:py-28 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-[1240px]">
        <SectionHeading
          center
          eyebrow="Core platform · included in every tier"
          title={
            <>
              Built for the field: <span className="text-gradient">no signal, no problem.</span>
            </>
          }
          sub="Every field module works offline on SQLite and delta-syncs when the link returns. Try it: drop the link, capture a few readings, then reconnect."
        />

        <Reveal className="mt-14">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_35px_-10px_rgba(15,23,42,0.06)] sm:p-8">
            <FieldPhone />
          </div>
        </Reveal>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Bento title="Role-based access" icon={<Icon.Users size={18} />} className="xl:col-span-2">
            <div className="flex flex-wrap gap-1.5">
              {roles.map((r) => (
                <span key={r} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-700">
                  {r}
                </span>
              ))}
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-slate-600">
              Granular permission gating ensures every team member accesses only what their station requires.
            </p>
          </Bento>

          <Bento title="Naira and dollar ledgers" icon={<Icon.Wallet size={18} />} delay={80}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-extrabold text-slate-900">₦ NGN</span>
              <span className="text-slate-300">/</span>
              <span className="font-mono text-xl font-extrabold text-emerald-700">$ USD</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
              Real-time foreign exchange rate snapshot locked at the moment of invoice generation.
            </p>
          </Bento>

          <Bento title="Bilingual field UI" icon={<Icon.Message size={18} />} delay={160}>
            <div className="flex gap-1.5">
              <span className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11.5px] font-bold text-white">English</span>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] font-medium text-slate-700">Nigerian Pidgin</span>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] font-medium text-slate-700">Français</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
              Clear vocabulary for field hands, vessel crews, and international audit partners.
            </p>
          </Bento>

          <Bento title="Compliance document vault" icon={<Icon.FileText size={18} />}>
            <div className="flex flex-wrap gap-1.5">
              {vault.map((v) => (
                <span key={v} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11.5px] text-slate-700">
                  {v}
                </span>
              ))}
            </div>
          </Bento>

          <Bento title="Rugged hardware ready" icon={<Icon.QR size={18} />} delay={80}>
            <p className="text-[13px] leading-relaxed text-slate-600">
              Designed for Zebra, Honeywell, and ATEX-certified Intrinsically Safe devices with 48px tactile tap targets.
            </p>
          </Bento>

          <Bento title="Universal platform" icon={<Icon.Monitor size={18} />} delay={160} className="xl:col-span-2">
            <p className="text-[13px] leading-relaxed text-slate-600">
              High-resolution control room views on web desktop, resilient offline mode on mobile and rugged field tablets. High-contrast typography designed for outdoor glare and night operations.
            </p>
          </Bento>
        </div>
      </div>
    </section>
  );
}
