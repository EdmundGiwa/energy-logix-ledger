"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { BlurText, Corners, Reveal } from "./primitives";
import { RecordPanel } from "./RecordPanel";
import { SegmentForm } from "./SegmentForm";
import { chapters } from "./story";

const ROTATE_MS = 9000;

/** Two long S-curves that draw themselves down each side of the hero. */
function SideCurves() {
  const path = "M60 0 C 60 160, 180 200, 180 360 S 60 560, 60 720 S 180 900, 180 1080";
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1440 1080" preserveAspectRatio="none">
      {[150, 250].map((x, i) => (
        <g key={x}>
          <path d={path} transform={`translate(${x - 60} 0)`} pathLength={1} className="draw-path" fill="none" stroke="rgba(5,150,105,0.22)" strokeWidth="1" style={{ animationDelay: `${0.3 + i * 0.25}s` }} />
          <path d={path} transform={`translate(${1440 - x - 180} 0) scale(1 1)`} pathLength={1} className="draw-path" fill="none" stroke="rgba(5,150,105,0.22)" strokeWidth="1" style={{ animationDelay: `${0.45 + i * 0.25}s` }} />
        </g>
      ))}
    </svg>
  );
}

export function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const chapter = chapters[index];

  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % chapters.length), ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [index, paused]);

  // Product frame starts tilted back and stands up as it scrolls into view.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight * 0.75)));
      el.style.transform = `perspective(1400px) rotateX(${(1 - progress) * 16}deg) scale(${0.94 + progress * 0.06})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section id="top" className="hero-wash relative isolate overflow-hidden pt-[76px]">
      <div aria-hidden className="tile-pattern absolute inset-0 -z-10" />
      <div aria-hidden className="absolute inset-0 -z-10 hidden lg:block">
        <SideCurves />
      </div>

      <div className="mx-auto max-w-[1100px] px-5 pb-10 pt-14 text-center sm:px-8 sm:pt-20">
        <Reveal>
          <span className="corners font-label inline-flex items-center gap-3 px-4 py-2.5 text-[12.5px] text-slate-500">
            <Corners />
            <span className="grid h-6 w-6 place-items-center rounded-[5px] bg-emerald-600 text-white">
              <Icon.Pin size={13} />
            </span>
            <span className="text-[#0a0f14]">
              <span className="hidden sm:inline">Built for energy contractors in</span>
              <span className="sm:hidden">For contractors in</span>
            </span>
            <span className="text-emerald-700">Nigeria &amp; Uganda</span>
          </span>
        </Reveal>

        <h1 className="font-display mx-auto mt-7 max-w-[960px] text-[2.6rem] leading-[1.02] text-[#0a0f14] sm:text-[3.6rem] lg:text-[4.4rem]">
          <BlurText stagger={60}>
            <>
              Every litre, every permit, every hand-off. <span className="text-emerald-600">On record.</span>
            </>
          </BlurText>
        </h1>

        <Reveal delay={350}>
          <p className="mx-auto mt-6 max-w-[640px] text-[16px] leading-relaxed text-slate-600 sm:text-[17.5px]">
            One operating system for the contractors who move energy: bunkering, haulage, depots, pipelines, EPC and offshore logistics. Works offline in the field and signs every record for your clients and regulators.
          </p>
        </Reveal>

        <Reveal delay={500}>
          <SegmentForm id="hero-segment" className="mt-9" />
        </Reveal>

        <Reveal delay={650}>
          <ul className="font-label mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-slate-500">
            {["Works with zero signal", "Dual-signed, tamper-evident records", "Naira & dollar ledgers"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Icon.Check size={13} className="text-emerald-600" />
                {t}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      {/* Product frame */}
      <div className="mx-auto max-w-[1180px] px-4 pb-20 sm:px-8 sm:pb-28">
        <div
          ref={frameRef}
          className="corners origin-top p-2 text-slate-400 transition-transform duration-100 will-change-transform sm:p-3"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <Corners />
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_40px_120px_-40px_rgba(6,78,59,0.35)]">
            <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5">
              <span className="flex gap-1.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </span>
              <span className="font-label mx-auto flex max-w-[420px] flex-1 items-center gap-2 truncate rounded-md border border-slate-200 bg-white px-3 py-1 text-[11.5px] text-slate-500">
                <Icon.Lock size={11} /> app.ofshora.com/{chapter.module.toLowerCase()}
              </span>
              <span className="w-[42px]" aria-hidden />
            </div>

            <div className="grid lg:grid-cols-[1.25fr_1fr]">
              <div className="relative min-h-[300px] overflow-hidden sm:min-h-[420px]">
                {chapters.map((c, i) => (
                  <Image
                    key={c.key}
                    src={c.image}
                    alt={c.alt}
                    fill
                    priority={i === 0}
                    sizes="(min-width: 1024px) 640px, 100vw"
                    className={`object-cover ${c.position} transition-all duration-[1400ms] ${i === index ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f14]/75 via-[#0a0f14]/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-left text-white sm:p-7">
                  <p className="font-label text-[11.5px] text-emerald-300">
                    {chapter.place} · {chapter.coords}
                  </p>
                  <p key={chapter.key} className="rise mt-2 max-w-[480px] text-[14.5px] leading-relaxed text-white/90">
                    {chapter.line}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4 bg-slate-50/70 p-4 sm:p-6">
                <div className="flex gap-1.5" role="tablist" aria-label="Field stories">
                  {chapters.map((c, i) => {
                    const TabIcon = c.icon;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        role="tab"
                        aria-selected={i === index}
                        onClick={() => setIndex(i)}
                        className={`relative flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-lg border px-2 py-2 text-[11.5px] font-medium transition ${
                          i === index ? "border-slate-300 bg-white text-[#0a0f14] shadow-sm" : "border-transparent text-slate-500 hover:bg-white/70"
                        }`}
                      >
                        <TabIcon size={13} />
                        <span className="hidden truncate sm:inline">{c.module}</span>
                        {i === index && !paused && (
                          <span key={`${c.key}-bar`} className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-emerald-500" style={{ animation: `progress ${ROTATE_MS}ms linear forwards` }} />
                        )}
                      </button>
                    );
                  })}
                </div>
                <RecordPanel key={chapter.key} chapter={chapter} active />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
