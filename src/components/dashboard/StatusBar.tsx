"use client";

import { useEffect, useState } from "react";

export function StatusBar({ onOpenAstm }: { onOpenAstm?: () => void }) {
  const [online, setOnline] = useState(true);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const cachedRecords = 148;

  // Count up since the last (simulated) delta sync; reset every 30 s while online.
  useEffect(() => {
    const id = setInterval(() => setSecondsAgo((s) => (online && s >= 30 ? 0 : s + 1)), 1000);
    return () => clearInterval(id);
  }, [online]);

  return (
    <footer className="sticky bottom-0 z-30 px-3 pb-3 sm:px-4 lg:pl-0">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-full bg-white/95 px-5 py-2.5 text-[12px] text-slate-600 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setOnline((o) => !o)}
            title="Toggle offline mode simulation"
            className="group flex items-center gap-2"
          >
            <span className={`relative flex h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`}>
              {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
            </span>
            <span className="font-semibold text-slate-800">{online ? "Lekki Terminal Node 04" : "Field mode (offline)"}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] text-slate-500 transition group-hover:bg-slate-200">
              {online ? "Online" : "Cached"}
            </span>
          </button>
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            <span className="font-medium text-slate-700">{cachedRecords} records cached</span>
          </span>
          <span className="hidden text-slate-500 md:inline">
            Last sync <span className="font-mono font-medium text-slate-700">{online ? `${secondsAgo}s ago` : "paused"}</span>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden rounded-full bg-slate-50 px-3 py-1 font-mono text-[11px] sm:inline">
            <span className="text-slate-400">FX snapshot </span>
            <span className="font-semibold text-slate-800">$1 = ₦1,480.00</span>
          </span>
          {onOpenAstm && (
            <button
              type="button"
              onClick={onOpenAstm}
              className="rounded-full bg-[#0b1523] px-3.5 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-slate-800"
            >
              ASTM 54B calc
            </button>
          )}
          <span className="hidden items-center gap-1.5 font-mono text-[11px] text-slate-400 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Audit log verified
          </span>
        </div>
      </div>
    </footer>
  );
}
