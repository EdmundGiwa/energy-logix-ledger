"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BlurText, Corners, Reveal, SectionHeading } from "./primitives";
import { RecordPanel } from "./RecordPanel";
import { chapters } from "./story";

const STICK_TOP = 104; // px below the fixed navbar
const STACK_OFFSET = 14; // each later card sits a little lower so earlier edges peek out

const headlines: Record<string, string> = {
  lift: "Every lift tagged, weighed and signed.",
  bunker: "Every litre reconciled before the barge casts off.",
  pipe: "Every pig run, hydrotest and weld on one integrity record.",
  safe: "Every crew member cleared before they board.",
};

/**
 * Four field stories as cards that pin and stack while scrolling. Cards underneath
 * shrink and dim as the next one slides over; only the top card's record animates.
 */
export function FeatureStack() {
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = window.matchMedia("(min-width: 1024px)");
    let raf = 0;
    const update = () => {
      raf = 0;
      const cards = cardRefs.current.filter((c): c is HTMLElement => !!c);
      let top = 0;
      cards.forEach((card, i) => {
        const stick = STICK_TOP + i * STACK_OFFSET;
        if (card.getBoundingClientRect().top <= stick + 40) top = i;
        const next = cards[i + 1];
        const inner = card.firstElementChild as HTMLElement | null;
        if (!inner) return;
        if (!next || reduce || !wide.matches) {
          inner.style.transform = "";
          inner.style.filter = "";
          return;
        }
        // 0 when the next card is a full card-height away, 1 when it has fully covered this one.
        const covered = Math.min(1, Math.max(0, 1 - (next.getBoundingClientRect().top - stick) / card.offsetHeight));
        inner.style.transform = `scale(${1 - covered * 0.05})`;
        inner.style.filter = `brightness(${1 - covered * 0.12})`;
      });
      setActive(top);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section id="stories" className="scroll-mt-24 px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[1240px]">
        <SectionHeading
          eyebrow="The platform"
          title={
            <>
              Your field runs on paper. <span className="text-gradient">Your records shouldn&apos;t.</span>
            </>
          }
          sub="From the supply base quay to the pipeline right-of-way, crews capture work on phone or tablet, rules check it, and both parties sign it. Here is what that looks like on four ordinary days."
        />

        <div className="mt-14">
          {chapters.map((c, i) => {
            const TagIcon = c.icon;
            return (
              <article
                key={c.key}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="pb-6 lg:sticky"
                style={{ top: STICK_TOP + i * STACK_OFFSET }}
                aria-labelledby={`story-${c.key}`}
              >
                <div className="corners origin-top border border-slate-200 bg-white text-slate-400 transition-[filter] duration-200 lg:min-h-[560px]">
                  <Corners />
                  <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
                    <div className="flex flex-col justify-center">
                      <span className="font-label inline-flex w-fit items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[13px] text-emerald-700">
                        <TagIcon size={15} />
                        {i + 1}/{chapters.length}
                        <span className="text-emerald-700/50">·</span>
                        {c.module}
                      </span>
                      <h3 id={`story-${c.key}`} className="font-display mt-6 text-[2rem] leading-[1.06] text-[#0a0f14] sm:text-[2.7rem] lg:text-[3.1rem]">
                        <BlurText>{headlines[c.key] ?? `Every ${c.word}, on record.`}</BlurText>
                      </h3>
                      <Reveal delay={150}>
                        <p className="mt-5 max-w-[520px] text-[15.5px] leading-relaxed text-slate-600 sm:text-[16.5px]">{c.line}</p>
                        <p className="font-label mt-6 flex items-center gap-2 text-[12px] text-slate-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {c.place} · {c.coords}
                        </p>
                      </Reveal>
                    </div>

                    <div className="corners relative min-h-[500px] overflow-hidden p-3 text-slate-400">
                      <Corners />
                      <div className="relative h-full min-h-[476px] overflow-hidden rounded-lg">
                        <Image src={c.image} alt={c.alt} fill sizes="(min-width: 1024px) 560px, 100vw" className={`object-cover ${c.position}`} />
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f14]/10 via-[#0a0f14]/20 to-[#0a0f14]/55" />
                        <div className="absolute inset-x-3 bottom-3 sm:inset-x-6 sm:bottom-6">
                          <RecordPanel chapter={c} active={active === i} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
