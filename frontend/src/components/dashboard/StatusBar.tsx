"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Sample (dummy) data only when NEXT_PUBLIC_DEMO_DATA is exactly "true"; see README "Live data vs sample data".
// Read process.env directly in this module so live builds strip the sample data from the bundle.
const DEMO_DATA_ENABLED = process.env.NEXT_PUBLIC_DEMO_DATA === "true";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** Browser connectivity only; it does not prove the API is reachable. */
function useBrowserOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

export function StatusBar({ onOpenAstm }: { onOpenAstm?: () => void }) {
  return DEMO_DATA_ENABLED ? <SampleStatusBar onOpenAstm={onOpenAstm} /> : <LiveStatusBar onOpenAstm={onOpenAstm} />;
}

function AstmButton({ onOpenAstm }: { onOpenAstm?: () => void }) {
  if (!onOpenAstm) return null;
  return (
    <button
      type="button"
      onClick={onOpenAstm}
      className="rounded-md bg-[#0a0f14] px-3 py-1 text-[11px] text-white transition hover:bg-emerald-700"
    >
      ASTM 54B calc
    </button>
  );
}

function LiveStatusBar({ onOpenAstm }: { onOpenAstm?: () => void }) {
  const online = useBrowserOnline();
  return (
    <footer className="sticky bottom-0 z-30 border-t border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="font-label flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-[11.5px] text-slate-500 sm:px-6 lg:px-8">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`} />
          <span className="text-[#0a0f14]">{online ? "Online" : "Offline"}</span>
        </span>
        <div className="ml-auto flex items-center gap-3">
          <AstmButton onOpenAstm={onOpenAstm} />
        </div>
      </div>
    </footer>
  );
}

function SampleStatusBar({ onOpenAstm }: { onOpenAstm?: () => void }) {
  const [online, setOnline] = useState(true);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const cachedRecords = 148;

  // Count up since the last (simulated) delta sync; reset every 30 s while online.
  useEffect(() => {
    const id = setInterval(() => setSecondsAgo((s) => (online && s >= 30 ? 0 : s + 1)), 1000);
    return () => clearInterval(id);
  }, [online]);

  return (
    <footer className="sticky bottom-0 z-30 border-t border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="font-label flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-[11.5px] text-slate-500 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800"
            title="NEXT_PUBLIC_DEMO_DATA=true: figures on these screens are sample data, not your records"
          >
            Sample data
          </span>
          <button
            type="button"
            onClick={() => setOnline((o) => !o)}
            title="Toggle offline mode simulation"
            className="group flex items-center gap-2"
          >
            <span className={`relative flex h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`}>
              {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
            </span>
            <span className="text-[#0a0f14]">{online ? "Lekki Terminal Node 04" : "Field mode (offline)"}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 transition group-hover:bg-slate-200">
              {online ? "Online" : "Cached"}
            </span>
          </button>
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            <span className="text-slate-600">{cachedRecords} records cached</span>
          </span>
          <span className="hidden text-slate-500 md:inline">
            Last sync <span className="text-slate-700">{online ? `${secondsAgo}s ago` : "paused"}</span>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:inline">
            <span className="text-slate-400">FX snapshot </span>
            <span className="text-[#0a0f14]">$1 = ₦1,480.00</span>
          </span>
          <AstmButton onOpenAstm={onOpenAstm} />
          <span className="hidden items-center gap-1.5 text-slate-400 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Audit log verified
          </span>
        </div>
      </div>
    </footer>
  );
}
