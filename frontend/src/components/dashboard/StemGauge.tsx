"use client";

/**
 * Segmented fill gauge for an active bunker stem, adapted from a 21st.dev
 * component (thegridcn/energy-meter#24473) via the living-ui skill:
 * de-slopped to this app's own dark-readout convention (AstmCalculatorModal,
 * client-portal's e-BDN export panel) instead of the original's CSS-variable
 * theme, and its "value/label" shape is this app's actual stem data, not
 * placeholder copy.
 */

import * as React from "react";

type Variant = "nominal" | "watch" | "short";

function variantFor(percentFilled: number): Variant {
  if (percentFilled < 85) return "short";
  if (percentFilled <= 97) return "watch";
  return "nominal";
}

const VARIANT_STYLE: Record<Variant, { filled: string; text: string }> = {
  nominal: {
    filled: "bg-sky-500 shadow-[0_0_8px_rgba(2,132,199,0.6)]",
    text: "text-sky-400",
  },
  watch: {
    filled: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.55)]",
    text: "text-amber-400",
  },
  short: {
    filled: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.55)]",
    text: "text-red-400",
  },
};

export function StemGauge({
  label,
  sublabel,
  deliveredMt,
  nominatedMt,
  segments = 12,
}: {
  label: string;
  sublabel: string;
  deliveredMt: number;
  nominatedMt: number;
  segments?: number;
}) {
  const percent = Math.max(0, Math.min(100, Math.round((deliveredMt / nominatedMt) * 100)));
  const filledCount = Math.round((percent / 100) * segments);
  const variant = variantFor(percent);
  const style = VARIANT_STYLE[variant];

  const [visibleCount, setVisibleCount] = React.useState(0);
  React.useEffect(() => {
    if (filledCount === 0) {
      setVisibleCount(0);
      return;
    }
    let current = 0;
    const id = setInterval(() => {
      current += 1;
      setVisibleCount(current);
      if (current >= filledCount) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, [filledCount]);

  const [displayPercent, setDisplayPercent] = React.useState(0);
  React.useEffect(() => {
    const duration = filledCount * 55 + 150;
    const start = performance.now();
    let frame: number;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPercent(Math.round(percent * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [percent, filledCount]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-white">{label}</p>
          <p className="truncate text-[11.5px] text-slate-400">{sublabel}</p>
        </div>
        <span className={`shrink-0 font-mono text-[15px] font-bold tabular-nums ${style.text}`}>
          {displayPercent}%
        </span>
      </div>

      <div className="flex gap-1">
        {Array.from({ length: segments }, (_, i) => {
          const isFilled = i < visibleCount;
          const isLast = i === visibleCount - 1;
          return (
            <div
              key={i}
              className={[
                "h-5 flex-1 rounded-sm transition-all",
                isFilled ? `${style.filled} duration-150` : "bg-slate-800 duration-300",
                isFilled && variant === "short" ? "animate-pulse" : "",
                isLast ? "scale-y-110" : "",
              ].join(" ")}
            />
          );
        })}
      </div>

      <p className="mt-2.5 font-mono text-[11px] text-slate-500">
        {deliveredMt.toLocaleString()} MT delivered / {nominatedMt.toLocaleString()} MT nominated
      </p>

      {/* Corner frame, the original's HUD signature */}
      <div className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-sky-700/50" />
      <div className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-sky-700/50" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-sky-700/50" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-sky-700/50" />
    </div>
  );
}

export default StemGauge;
