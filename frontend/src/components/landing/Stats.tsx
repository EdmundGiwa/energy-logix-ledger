"use client";

import { CountUp, Reveal } from "./primitives";

// Product facts only. Replace with customer results once pilots report them.
const stats = [
  { to: 19, suffix: "", label: "modules on one audit trail" },
  { to: 0, suffix: " bars", label: "of signal needed in the field" },
  { to: 60, suffix: " days", label: "to prove one KPI in a pilot" },
  { to: 45, suffix: " min", label: "to a demo built around you" },
];

export function Stats() {
  return (
    <section className="px-4 py-20 sm:px-8 sm:py-24" aria-label="Offshora in numbers">
      <div className="mx-auto grid max-w-[1300px] gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 120}>
            <p className="font-display text-[4.2rem] leading-none text-[#0a0f14] sm:text-[5rem]">
              <CountUp to={s.to} suffix={s.suffix} duration={1400} />
            </p>
            <div className="mt-8 h-px bg-slate-200" />
            <p className="font-display mt-6 max-w-[260px] text-[1.55rem] leading-[1.15] text-[#0a0f14]">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
