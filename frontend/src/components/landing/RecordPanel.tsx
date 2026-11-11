"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import type { Chapter } from "./story";

const STEP_MS = 900;
const HOLD_MS = 2600;

const toastTone = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  crit: "border-rose-200 bg-rose-50 text-rose-900",
};

/**
 * A field record that fills itself in: steps tick through, flagged steps highlight,
 * then the record seals and a notification lands. Loops while `active`.
 */
export function RecordPanel({ chapter, active, className = "" }: { chapter: Chapter; active: boolean; className?: string }) {
  const total = chapter.steps.length;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let count = reduce ? total : 0;
    setShown(count);
    if (reduce) return;
    const id = window.setInterval(() => {
      count = count >= total + Math.round(HOLD_MS / STEP_MS) ? 0 : count + 1;
      setShown(count);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [active, total]);

  const visible = active ? shown : total;
  const sealed = visible >= total;
  const ModuleIcon = chapter.icon;
  const { metric } = chapter;

  return (
    <div className={`w-full rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_24px_60px_-28px_rgba(10,15,20,0.35)] backdrop-blur sm:p-5 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0a0f14] text-emerald-300">
          <ModuleIcon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-slate-900">{chapter.record.title}</p>
          <p className="font-label text-[11px] text-slate-500">
            {chapter.module} · {chapter.record.id}
          </p>
        </div>
        <span
          className={`font-label inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-medium transition-colors duration-500 ${
            sealed ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {sealed ? <Icon.Lock size={11} /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
          {sealed ? "Sealed" : "Live"}
        </span>
      </div>

      <ol className="mt-4 space-y-1.5">
        {chapter.steps.map((step, i) => {
          const done = i < visible;
          return (
            <li
              key={step.label}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition-all duration-500 ${
                done ? (step.flag ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-800") : "text-slate-300"
              }`}
            >
              <span
                className={`grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border transition-all duration-500 ${
                  done ? (step.flag ? "border-amber-500 bg-amber-500 text-white" : "border-emerald-600 bg-emerald-600 text-white") : "border-slate-200"
                }`}
              >
                {done && (step.flag ? <Icon.Alert size={10} /> : <Icon.Check size={10} />)}
              </span>
              <span className="min-w-0 flex-1 truncate">{step.label}</span>
              <span className={`font-label shrink-0 text-[11px] ${done ? "text-slate-500" : "text-slate-300"}`}>{step.meta}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3.5">
        <div>
          <p className="font-label text-[10.5px] uppercase text-slate-400">{metric.label}</p>
          <p className="font-display text-[1.65rem] leading-none text-slate-900">
            {metric.value.toLocaleString("en-US", { minimumFractionDigits: metric.decimals ?? 0, maximumFractionDigits: metric.decimals ?? 0 })}
            <span className="ml-1 text-[0.55em] text-slate-500">{metric.unit}</span>
          </p>
        </div>
        <p className="font-label text-right text-[11px] text-emerald-700">{metric.note}</p>
      </div>

      <div
        className={`mt-3 overflow-hidden rounded-xl border px-3 py-2.5 text-[12px] transition-all duration-700 ${toastTone[chapter.toast.tone]} ${
          sealed ? "max-h-24 opacity-100" : "max-h-0 border-transparent py-0 opacity-0"
        }`}
        aria-live="polite"
      >
        <p className="font-semibold">{chapter.toast.title}</p>
        <p className="opacity-75">{chapter.toast.text}</p>
      </div>
    </div>
  );
}
