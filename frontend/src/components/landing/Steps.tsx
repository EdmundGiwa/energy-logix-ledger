"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { BlurText, Corners, Reveal, SectionHeading } from "./primitives";

const steps = [
  {
    n: "01",
    label: "Capture",
    title: "Capture in the field",
    body: "Crews log soundings, gas tests, weighbridge tickets and PODs on phone or tablet, even with no signal.",
    after: "Records sync the moment the vessel, truck or site reconnects. Nobody re-types a job sheet again.",
    chips: ["Offline-first", "Zebra / Honeywell", "Geotagged GPS"],
    image: "/images/rig-vessel.jpg",
    alt: "Supply vessel alongside an offshore platform",
  },
  {
    n: "02",
    label: "Verify",
    title: "Verify automatically",
    body: "Rules check every entry: ASTM corrections, variance over 0.5%, expired certificates and failed gas tests.",
    after: "Exceptions reach the right supervisor in minutes, not in a month-end reconciliation.",
    chips: ["ASTM 54B / 56", "Safety interlocks", "Exception alerts"],
    image: "/images/rig-aerial.jpg",
    alt: "Aerial view of an offshore platform with a support vessel",
  },
  {
    n: "03",
    label: "Seal",
    title: "Seal and share",
    body: "Records are signed, locked into the audit log, and shared with clients or exported for NCDMB.",
    after: "Your client sees the same signed record you do. Invoices go out on evidence nobody can dispute.",
    chips: ["Digital signatures", "Client Portal", "NOGIC-JQS export"],
    image: "/images/rig-dusk.jpg",
    alt: "Offshore production platform lit up at dusk",
  },
];

export function Steps() {
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    blockRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="how" className="scroll-mt-24 px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[1240px]">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              <span className="text-gradient">Captured</span> at noon. Audit-ready by night.
            </>
          }
          sub="Three steps, the same on a barge, a weighbridge or a pipeline right-of-way."
        />

        <div className="mt-14 grid lg:grid-cols-[240px_1fr] lg:gap-0">
          <nav aria-label="Steps" className="hidden lg:block">
            <ul className="sticky top-[150px] space-y-6 pr-10">
              {steps.map((s, i) => (
                <li key={s.n}>
                  <a
                    href={`#step-${s.n}`}
                    className={`font-display block border-b pb-2 text-[2.1rem] leading-none transition-colors duration-500 ${
                      active === i ? "border-emerald-500 text-emerald-600" : "border-slate-200 text-slate-300 hover:text-slate-500"
                    }`}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:border-l lg:border-dashed lg:border-slate-300 lg:pl-12">
            {steps.map((s, i) => (
              <div
                key={s.n}
                id={`step-${s.n}`}
                data-index={i}
                ref={(el) => {
                  blockRefs.current[i] = el;
                }}
                className="grid scroll-mt-32 items-center gap-8 py-10 md:grid-cols-[1.15fr_0.85fr] lg:min-h-[78vh] lg:py-0"
              >
                <div>
                  <span className="font-label inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[13px] text-emerald-700">
                    <Icon.Arrow size={13} className="rotate-180" /> {s.n}
                  </span>
                  <h3 className="font-display mt-6 text-[2.2rem] leading-[1.04] text-[#0a0f14] sm:text-[3rem]">
                    <BlurText>{s.title}</BlurText>
                  </h3>
                  <Reveal delay={120}>
                    <div className="mt-8 max-w-[520px] divide-y divide-slate-200 text-[15.5px] leading-relaxed text-slate-600">
                      <p className="pb-4 pl-4">{s.body}</p>
                      <p className="pt-4 pl-4">{s.after}</p>
                    </div>
                    <ul className="mt-6 flex flex-wrap gap-2">
                      {s.chips.map((c) => (
                        <li key={c} className="font-label rounded-md border border-slate-200 px-2.5 py-1 text-[11.5px] text-slate-600">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                </div>
                <Reveal delay={200}>
                  <div className="corners p-2.5 text-slate-400">
                    <Corners />
                    <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
                      <Image
                        src={s.image}
                        alt={s.alt}
                        fill
                        sizes="(min-width: 768px) 380px, 100vw"
                        className={`object-cover transition-transform duration-[1600ms] ease-out ${active === i ? "scale-100" : "scale-110"}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f14]/50 to-transparent" />
                      <span className="font-display absolute bottom-4 left-5 text-[4.5rem] leading-none text-white/90">{s.n}</span>
                    </div>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
