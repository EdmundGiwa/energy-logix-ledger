"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Icon, LogoMark, Wordmark } from "@/components/landing/icons";
import { Contours } from "@/components/dashboard/Patterns";
import { StoryStageControls, type StageAspect } from "@/components/ui/StoryStageControls";
import { PITCH_SLIDES, type AccentTone } from "./slidesData";
import { SlideVisual } from "./SlideVisuals";

const SLIDE_DURATION_MS = 8500;

const TONE_STYLES: Record<
  AccentTone,
  { glow: string; pill: string; painBorder: string; statGrad: string }
> = {
  emerald: {
    glow: "bg-emerald-500/22",
    pill: "border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
    painBorder: "border-amber-400/30 bg-amber-500/10",
    statGrad: "from-emerald-300 via-emerald-400 to-teal-300",
  },
  sky: {
    glow: "bg-sky-500/22",
    pill: "border-sky-400/35 bg-sky-500/15 text-sky-200",
    painBorder: "border-amber-400/30 bg-amber-500/10",
    statGrad: "from-sky-300 via-cyan-300 to-emerald-300",
  },
  teal: {
    glow: "bg-teal-500/22",
    pill: "border-teal-400/35 bg-teal-500/15 text-teal-200",
    painBorder: "border-amber-400/30 bg-amber-500/10",
    statGrad: "from-teal-200 via-emerald-300 to-cyan-300",
  },
  amber: {
    glow: "bg-amber-500/20",
    pill: "border-amber-400/35 bg-amber-500/15 text-amber-200",
    painBorder: "border-rose-400/35 bg-rose-500/12",
    statGrad: "from-amber-200 via-amber-300 to-emerald-300",
  },
};

type ViewTransitionDoc = Document & {
  startViewTransition?: (
    arg: (() => void) | { update: () => void; types?: string[] }
  ) => unknown;
};

export function PitchDeck() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [paused, setPaused] = useState(false);
  const [holdPaused, setHoldPaused] = useState(false);
  const [aspect, setAspect] = useState<StageAspect>("16:9");
  const [cinemaMode, setCinemaMode] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  const slide = PITCH_SLIDES[index];
  const tone = TONE_STYLES[slide.tone];
  const effectivePaused = paused || holdPaused;

  const slideMeta = useMemo(
    () =>
      PITCH_SLIDES.map((s) => ({
        id: s.id,
        index: s.index,
        chapter: s.chapter,
        title: s.title,
        badge: s.badge,
      })),
    []
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    if (mq.matches) {
      setPaused(true);
    }
    // Auto-select 9:16 vertical mode on narrow mobile viewports for native TikTok feel
    if (window.innerWidth < 680) {
      setAspect("9:16");
    }
  }, []);

  // Keep document title synchronized with active slide for accessibility & tab clarity
  useEffect(() => {
    document.title = `${slide.title} (${index + 1}/${PITCH_SLIDES.length}) | Offshora Pitch Deck`;
  }, [index, slide.title]);

  const navigateTo = useCallback(
    (targetIdx: number, explicitDir?: "forward" | "backward") => {
      const total = PITCH_SLIDES.length;
      const next = ((targetIdx % total) + total) % total;
      if (next === index) return;

      const dir: "forward" | "backward" =
        explicitDir ?? (next > index ? "forward" : "backward");

      const apply = () => {
        setDirection(dir);
        setIndex(next);
      };

      const doc = document as ViewTransitionDoc;
      if (
        typeof doc.startViewTransition !== "function" ||
        reducedMotionRef.current ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        apply();
        return;
      }

      try {
        doc.startViewTransition({
          update: () => flushSync(apply),
          types: [dir],
        });
      } catch {
        doc.startViewTransition(() => flushSync(apply));
      }
    },
    [index]
  );

  const stepSlide = useCallback(
    (delta: -1 | 1) => {
      navigateTo(index + delta, delta > 0 ? "forward" : "backward");
    },
    [index, navigateTo]
  );

  const handleCycleEnd = useCallback(() => {
    if (
      reducedMotionRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    stepSlide(1);
  }, [stepSlide]);

  // Keyboard navigation & shortcuts.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.closest("dialog"))
      ) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) {
          if (e.key === " ") return;
        }
        e.preventDefault();
        stepSlide(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        stepSlide(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        navigateTo(0, "backward");
      } else if (e.key === "End") {
        e.preventDefault();
        navigateTo(PITCH_SLIDES.length - 1, "forward");
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setAspect((a) => (a === "16:9" ? "9:16" : "16:9"));
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setCinemaMode((c) => !c);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigateTo, stepSlide]);

  // Touch horizontal swipe (pan-y preserves vertical scroll)
  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    if (aspect === "9:16") {
      setHoldPaused(true);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    setHoldPaused(false);
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const dx = e.clientX - swipeStartX.current;
    const dy = e.clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;

    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      if (dx < 0) stepSlide(1);
      else stepSlide(-1);
      return;
    }

    // In 9:16 TikTok story mode, tapping left/right edge steps slides when not clicking a button/link/input
    if (
      aspect === "9:16" &&
      Math.abs(dx) < 10 &&
      Math.abs(dy) < 10 &&
      !(e.target instanceof HTMLElement && e.target.closest("button, a, input, label, dialog"))
    ) {
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      if (relX < 0.26) stepSlide(-1);
      else if (relX > 0.74) stepSlide(1);
    }
  };

  const enterAnimClass = direction === "forward" ? "pitch-enter-fwd" : "pitch-enter-back";

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#040c16] text-white select-none">
      {/* Ambient Outer Backdrop (visible especially around 9:16 vertical reel on desktop) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className={`absolute -left-32 top-1/4 h-[520px] w-[520px] rounded-full blur-[150px] transition-colors duration-1000 ${tone.glow}`} />
        <div className="absolute -bottom-40 right-0 h-[540px] w-[680px] rounded-full bg-emerald-500/15 blur-[160px]" />
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
          className="dash-drift absolute inset-0 h-full w-full text-white/[0.06]"
        >
          <Contours cx={880} cy={120} rings={11} gap={34} start={28} seed={1.4} />
          <Contours cx={110} cy={900} rings={10} gap={36} start={24} seed={3.1} accent="#38bdf8" />
        </svg>
        <div className="hero-noise absolute inset-0" />
      </div>

      {/* Top Site Header (auto-hides in Record/Cinema mode unless hovered) */}
      <header
        className={`relative z-30 transition-opacity duration-300 ${
          cinemaMode ? "opacity-0 hover:opacity-100 focus-within:opacity-100" : "opacity-100"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 pt-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-xl py-1 pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <LogoMark size={32} />
              <Wordmark tone="dark" size="sm" />
            </Link>
            <span className="hidden h-4 w-px bg-white/15 sm:inline-block" aria-hidden="true" />
            <a
              href="https://www.ofshora.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-3 py-1 font-mono text-[11px] font-bold text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-500/20 md:inline-flex focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <Icon.Globe size={12} />
              www.ofshora.com
            </a>
          </div>

          <div className="hidden items-center gap-3 text-[11px] text-white/55 lg:flex">
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono">← / →</span>
            <span>Navigate</span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono">V</span>
            <span>16:9 / 9:16 TikTok</span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono">C</span>
            <span>Clean Record</span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono">G</span>
            <span>All 25 Slides</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/Offshora-Energy-OS-Pitch-Deck.pptx"
              download="Offshora-Energy-OS-Pitch-Deck.pptx"
              className="hero-ghost inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white transition hover:border-emerald-400/50 hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" />
              </svg>
              <span>Download .pptx</span>
            </a>
            <Link
              href="/book-demo"
              className="hero-btn inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              Book 60-Day Pilot <Icon.ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Presentation Stage */}
      <main
        id="pitch-main"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setHoldPaused(false)}
        className="relative z-20 flex flex-1 items-center justify-center px-2 py-2 [touch-action:pan-y] sm:px-6 sm:py-3"
      >
        {aspect === "16:9" ? (
          /* ============================================================== */
          /* 16:9 WIDESCREEN EXECUTIVE BUYER DECK                           */
          /* ============================================================== */
          <div className="relative flex min-h-[calc(100svh-126px)] w-full max-w-[1380px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/12 bg-[#06111d] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
            {/* Slide Background Photo + Gradients */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              <Image
                key={slide.bgImage + slide.id}
                src={slide.bgImage}
                alt=""
                fill
                preload={index === 0}
                sizes="100vw"
                className={`kenburns object-cover ${slide.bgPosition} opacity-35`}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#06111d] via-[#06111d]/90 to-[#06111d]/65" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#06111d] via-transparent to-[#06111d]/75" />
              <div className={`absolute -right-24 -top-24 h-96 w-96 rounded-full blur-[120px] ${tone.glow}`} />
            </div>

            {/* Top Story Rail inside Stage */}
            <div className="relative z-20">
              <StoryStageControls
                slides={slideMeta}
                activeIndex={index}
                durationMs={SLIDE_DURATION_MS}
                paused={effectivePaused}
                aspect={aspect}
                cinemaMode={cinemaMode}
                onSelect={(idx) => navigateTo(idx)}
                onStep={stepSlide}
                onTogglePause={() => setPaused((p) => !p)}
                onToggleAspect={setAspect}
                onToggleCinema={() => setCinemaMode((c) => !c)}
                onCycleEnd={handleCycleEnd}
              />
            </div>

            {/* Directional View-Transition Slide Body */}
            <div
              key={slide.id}
              className={`pitch-stage-vt ${enterAnimClass} relative z-10 grid flex-1 items-center gap-8 px-6 py-5 sm:px-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-12 lg:px-14`}
            >
              {/* Left Narrative Column */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] ${tone.pill}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {slide.chapter} · {slide.badge}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60">
                    <Icon.Pin size={13} className="text-emerald-300" />
                    {slide.locationTag}
                  </span>
                </div>

                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                    {slide.eyebrow}
                  </p>
                  <h1 className="mt-2 text-3xl font-extrabold leading-[1.06] tracking-[-0.035em] text-white sm:text-4xl xl:text-[2.85rem]">
                    {slide.headlineLead}{" "}
                    <span className={`bg-gradient-to-r ${tone.statGrad} bg-clip-text text-transparent`}>
                      {slide.headlineAccent}
                    </span>
                  </h1>
                  <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-white/75 sm:text-[15px]">
                    {slide.subtitle}
                  </p>
                </div>

                {/* Why They Need It + Impact KPI */}
                <div className="grid gap-3 sm:grid-cols-[1.35fr_0.65fr]">
                  <div className={`rounded-2xl border p-3.5 backdrop-blur-md ${tone.painBorder}`}>
                    <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-amber-200">
                      ⚡ {slide.painLabel}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-white/90 sm:text-[13px]">
                      {slide.painStatement}
                    </p>
                  </div>

                  <div className="flex flex-col justify-center rounded-2xl border border-white/12 bg-white/[0.05] p-3.5 backdrop-blur-md">
                    <p className={`font-mono text-2xl font-extrabold bg-gradient-to-r ${tone.statGrad} bg-clip-text text-transparent sm:text-3xl`}>
                      {slide.impactStat.value}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-white">{slide.impactStat.label}</p>
                    <p className="mt-0.5 text-[10.5px] text-white/55">{slide.impactStat.sub}</p>
                  </div>
                </div>

                {/* Key Capabilities */}
                <ul className="grid gap-2 pt-1 sm:grid-cols-2">
                  {slide.features.map((feat, idx) => (
                    <li
                      key={feat}
                      className="rise flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-snug text-white/85"
                      style={{ animationDelay: `${80 + idx * 55}ms` }}
                    >
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded bg-emerald-400/20 font-mono text-[10px] font-extrabold text-emerald-300">
                        ✓
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right Interactive Visual Column */}
              <div className="flex flex-col justify-center gap-3">
                <SlideVisual kind={slide.visual} />
                <div className="flex items-center justify-between px-2 text-[11px] text-white/55">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300/90">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Offshora Energy OS · Every hand-off, on record.
                  </span>
                  <span className="font-mono font-bold text-white/80">www.ofshora.com</span>
                </div>
              </div>
            </div>

            {/* Persistent Subtle Bottom Brand Strip for Screen Recordings */}
            <div className="relative z-10 flex items-center justify-between border-t border-white/[0.07] bg-slate-950/50 px-6 py-2 text-[11px] text-white/55 backdrop-blur-md">
              <span className="font-mono">
                SLIDE {String(index + 1).padStart(2, "0")} / {String(PITCH_SLIDES.length).padStart(2, "0")} · {slide.title.toUpperCase()}
              </span>
              <span className="font-mono font-semibold text-emerald-300">https://www.ofshora.com</span>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* 9:16 VERTICAL TIKTOK / REELS STORY STAGE                       */
          /* ============================================================== */
          <div className="flex flex-col items-center justify-center">
            <div className="relative flex h-[min(88svh,840px)] w-[min(95vw,440px)] flex-col justify-between overflow-hidden rounded-[36px] border-2 border-white/18 bg-[#06111d] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.95)]">
              {/* Vertical Background Photo + Vignette */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <Image
                  key={slide.bgImage + slide.id}
                  src={slide.bgImage}
                  alt=""
                  fill
                  preload={index === 0}
                  sizes="460px"
                  className={`kenburns object-cover ${slide.bgPosition} opacity-35`}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#06111d]/90 via-[#06111d]/82 to-[#06111d]/96" />
                <div className={`absolute -right-20 top-16 h-64 w-64 rounded-full blur-[90px] ${tone.glow}`} />
              </div>

              {/* Story Progress Bars at Very Top of 9:16 Reel */}
              <div className="relative z-20 pt-1">
                <div
                  role="progressbar"
                  aria-label="Reel slide progress"
                  aria-valuemin={1}
                  aria-valuemax={PITCH_SLIDES.length}
                  aria-valuenow={index + 1}
                  className="flex w-full items-center gap-0.5 px-3 pt-2.5"
                >
                  {PITCH_SLIDES.map((s, idx) => {
                    const past = idx < index;
                    const curr = idx === index;
                    return (
                      <span key={s.id} className="block h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                        {past && <span className="block h-full w-full bg-emerald-400" />}
                        {curr && (
                          <span
                            key={`vseg-${index}`}
                            onAnimationEnd={handleCycleEnd}
                            className="story-progress-bar block h-full w-full origin-left bg-emerald-300"
                            style={{
                              animationDuration: `${SLIDE_DURATION_MS}ms`,
                              animationPlayState: effectivePaused ? "paused" : "running",
                            }}
                          />
                        )}
                      </span>
                    );
                  })}
                </div>

                {/* Reel Creator Header */}
                <div className="flex items-center justify-between px-4 pt-2">
                  <div className="flex items-center gap-2">
                    <LogoMark size={28} />
                    <div>
                      <p className="text-xs font-extrabold tracking-wide text-white">
                        OFF<span className="text-emerald-400">SHORA</span>
                      </p>
                      <p className="font-mono text-[10px] font-semibold text-emerald-300">www.ofshora.com</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${tone.pill}`}>
                    {String(index + 1).padStart(2, "0")}/{PITCH_SLIDES.length} · {slide.badge}
                  </span>
                </div>
              </div>

              {/* 9:16 Vertical Slide Content */}
              <div
                key={`v-${slide.id}`}
                className={`pitch-stage-vt ${enterAnimClass} no-scrollbar relative z-10 flex flex-1 flex-col justify-between gap-3 overflow-y-auto px-4 py-3`}
              >
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                    {slide.chapter} · {slide.moduleNumber ? `Module ${String(slide.moduleNumber).padStart(2, "0")}` : "Energy OS"}
                  </p>
                  <h1 className="mt-1 text-[1.48rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-white">
                    {slide.headlineLead}{" "}
                    <span className={`bg-gradient-to-r ${tone.statGrad} bg-clip-text text-transparent`}>
                      {slide.headlineAccent}
                    </span>
                  </h1>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/75">{slide.subtitle}</p>
                </div>

                {/* Center Animated HUD Card */}
                <SlideVisual kind={slide.visual} compact />

                {/* Punchy Why-You-Need-It + KPI Pill */}
                <div className="space-y-2">
                  <div className={`rounded-2xl border p-2.5 ${tone.painBorder}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                        ⚡ {slide.painLabel}
                      </span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-emerald-300">
                        {slide.impactStat.value} {slide.impactStat.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-snug text-white/90">{slide.painStatement}</p>
                  </div>

                  <ul className="space-y-1">
                    {slide.features.slice(0, 3).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[11px] leading-snug text-white/80">
                        <span className="mt-0.5 font-mono font-bold text-emerald-300">✓</span>
                        <span className="line-clamp-2">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bottom Reel Watermark CTA */}
              <div className="relative z-20 flex items-center justify-between border-t border-white/10 bg-slate-950/80 px-4 py-2.5 backdrop-blur-md">
                <span className="text-[11px] font-semibold text-white/80">Every hand-off, on record.</span>
                <span className="rounded-lg bg-emerald-500 px-2.5 py-1 font-mono text-[10.5px] font-extrabold text-slate-950">
                  ofshora.com
                </span>
              </div>
            </div>

            {/* External Controls below 9:16 Frame (hidden in Clean Record mode) */}
            <div className="mt-2 w-full max-w-[680px]">
              <StoryStageControls
                slides={slideMeta}
                activeIndex={index}
                durationMs={SLIDE_DURATION_MS}
                paused={effectivePaused}
                aspect={aspect}
                cinemaMode={cinemaMode}
                onSelect={(idx) => navigateTo(idx)}
                onStep={stepSlide}
                onTogglePause={() => setPaused((p) => !p)}
                onToggleAspect={setAspect}
                onToggleCinema={() => setCinemaMode((c) => !c)}
                onCycleEnd={() => {}}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
