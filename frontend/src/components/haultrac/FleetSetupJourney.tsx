"use client";

import type { ReactNode } from "react";

export type FleetSetupStep = {
  key: string;
  label: string;
  description: string;
  count: number;
  required: number;
};

export function FleetSetupJourney({
  steps,
  activeKey,
  onStepChange,
  children,
}: {
  steps: FleetSetupStep[];
  activeKey: string;
  onStepChange: (key: string) => void;
  children: ReactNode;
}) {
  const activeIndex = steps.findIndex((step) => step.key === activeKey);
  const completed = steps.filter((step) => step.count >= step.required).length;
  const active = steps[activeIndex];

  return (
    <section className="overflow-hidden rounded-[28px] bg-white shadow-[0_18px_55px_-38px_rgba(15,23,42,0.38)]" aria-labelledby="fleet-setup-title">
      <div className="grid lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="bg-[#0b1523] px-5 py-6 text-white sm:px-6 lg:min-h-[430px]" aria-label="Fleet setup progress">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-400">Fleet readiness</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div><p className="text-3xl font-bold">{completed}/{steps.length}</p><p className="mt-1 text-xs text-slate-400">stages completed</p></div>
            <p className="text-xs font-semibold text-slate-300">Viewing {activeIndex + 1} of {steps.length}</p>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true"><div className="h-full rounded-full bg-emerald-400 transition-[width] motion-reduce:transition-none" style={{ width: `${(completed / steps.length) * 100}%` }} /></div>

          <ol className="mt-7 space-y-1">
            {steps.map((step, index) => {
              const isActive = step.key === activeKey;
              const isComplete = step.count >= step.required;
              return <li key={step.key} className="relative">
                {index < steps.length - 1 && <span className={`absolute left-[17px] top-10 h-5 w-px ${isComplete ? "bg-emerald-400/70" : "bg-white/15"}`} aria-hidden="true" />}
                <button type="button" disabled={!isActive} onClick={() => onStepChange(step.key)} aria-current={isActive ? "step" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${isActive ? "bg-white text-slate-950" : "cursor-default text-slate-300"}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${isActive ? "bg-[#0b1523] text-white" : isComplete ? "bg-emerald-400 text-slate-950" : "border border-white/20 text-slate-400"}`}>{isComplete ? "✓" : index + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{step.label}</span><span className="block text-[11px] text-slate-500">{isComplete ? "Completed" : isActive ? "Current stage" : "Not started"}</span></span>
                </button>
              </li>;
            })}
          </ol>
        </aside>

        <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
          <div className="border-b border-slate-100 pb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Fleet directory</p>
            <h2 id="fleet-setup-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Manage {active.label.toLowerCase()} records</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{active.description}</p>
          </div>
          <div className="pt-6">{children}</div>
        </div>
      </div>
    </section>
  );
}
