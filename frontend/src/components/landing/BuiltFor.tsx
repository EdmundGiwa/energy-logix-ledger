"use client";

import Link from "next/link";
import { SEGMENTS, type SegmentKey } from "@/lib/demo";
import { Icon } from "./icons";
import { BlurText, Corners, Reveal } from "./primitives";

const cells: SegmentKey[] = [
  "epc_contractor",
  "pipeline_facilities",
  "bunkering_marketing",
  "marine_offshore",
  "haulage_depot",
  "oilfield_services",
  "refining_processing",
  "other",
];

/** Segment grid: one cell per kind of contractor, each opening a demo tailored to it. */
export function BuiltFor() {
  return (
    <section className="px-4 pb-20 sm:px-8 sm:pb-28" aria-labelledby="built-for">
      <div className="mx-auto max-w-[1000px] text-center">
        <p id="built-for" className="font-display text-[1.45rem] leading-snug text-[#0a0f14] sm:text-[1.75rem]">
          <BlurText stagger={40}>
            <>
              Built for <span className="text-emerald-600">every link</span> in the energy chain.
            </>
          </BlurText>
        </p>
        <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cells.map((key, i) => {
            const s = SEGMENTS[key];
            const CellIcon = Icon[s.icon];
            return (
              <Reveal key={key} delay={i * 60}>
                <Link
                  href={`/book-demo?segment=${key}`}
                  className="corners corners-hover group flex h-full flex-col items-center justify-center gap-3 bg-white/60 px-3 py-7 text-slate-400 transition hover:bg-emerald-50/50"
                >
                  <Corners />
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-emerald-600 group-hover:text-white">
                    <CellIcon size={20} />
                  </span>
                  <span className="text-[14px] font-medium leading-snug text-[#0a0f14]">{s.label}</span>
                  <span className="font-label hidden text-[11px] leading-snug text-slate-500 sm:block">{s.hint}</span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
