"use client";

import { useEffect, useRef } from "react";

export type StageAspect = "16:9" | "9:16";

export interface StorySlideMeta {
  id: string;
  index: number;
  chapter: string;
  title: string;
  badge?: string;
}

interface StoryStageControlsProps {
  slides: StorySlideMeta[];
  activeIndex: number;
  durationMs: number;
  paused: boolean;
  aspect: StageAspect;
  cinemaMode: boolean;
  onSelect: (index: number) => void;
  onStep: (delta: -1 | 1) => void;
  onTogglePause: () => void;
  onToggleAspect: (aspect: StageAspect) => void;
  onToggleCinema: () => void;
  onCycleEnd: () => void;
}

/**
 * Reusable story-style segmented progress rail, aspect-ratio switcher (16:9 deck vs 9:16 vertical reel),
 * playback transport, and native <dialog> chapter directory.
 * Built to Offshora industrial dark-HUD tokens with full keyboard & reduced-motion support.
 */
export function StoryStageControls({
  slides,
  activeIndex,
  durationMs,
  paused,
  aspect,
  cinemaMode,
  onSelect,
  onStep,
  onTogglePause,
  onToggleAspect,
  onToggleCinema,
  onCycleEnd,
}: StoryStageControlsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openDirectory = () => {
    const dlg = dialogRef.current;
    if (dlg && !dlg.open) {
      dlg.showModal();
    }
  };

  const closeDirectory = () => {
    const dlg = dialogRef.current;
    if (dlg && dlg.open) {
      dlg.close();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        const dlg = dialogRef.current;
        if (!dlg) return;
        if (dlg.open) dlg.close();
        else dlg.showModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Segmented story progress rail */}
      <div
        className="flex w-full items-center gap-1 px-3 pt-3 sm:gap-1.5 sm:px-5"
        role="group"
        aria-label={`Slide progress, slide ${activeIndex + 1} of ${slides.length}`}
      >
        {slides.map((slide, idx) => {
          const isPast = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => onSelect(idx)}
              aria-label={`Go to slide ${idx + 1}: ${slide.title}`}
              aria-current={isCurrent ? "step" : undefined}
              className="group relative flex h-6 flex-1 items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <span className="relative block h-1 w-full overflow-hidden rounded-full bg-white/15 transition-all group-hover:h-1.5 group-hover:bg-white/25">
                {isPast && <span className="block h-full w-full rounded-full bg-emerald-400/90" />}
                {isCurrent && (
                  <span
                    key={`seg-${activeIndex}`}
                    onAnimationEnd={onCycleEnd}
                    className="story-progress-bar block h-full w-full origin-left rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                    style={{
                      animationDuration: `${durationMs}ms`,
                      animationPlayState: paused ? "paused" : "running",
                    }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom control dock (hidden in clean screen-record cinema mode unless hovered/focused) */}
      <div
        className={`transition-opacity duration-300 ${
          cinemaMode ? "opacity-0 hover:opacity-100 focus-within:opacity-100" : "opacity-100"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
          {/* Left: Slide index + Directory trigger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openDirectory}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/12 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md transition hover:border-emerald-400/40 hover:bg-slate-800/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <span className="font-mono text-[11px] font-bold text-emerald-300">
                {String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
              </span>
              <span className="hidden max-w-[180px] truncate text-white/75 sm:inline">
                {slides[activeIndex]?.title}
              </span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/60">
                All slides
              </span>
            </button>
          </div>

          {/* Center: Transport buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onStep(-1)}
              aria-label="Previous slide"
              className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-white/12 bg-slate-900/80 text-white/85 backdrop-blur-md transition hover:border-emerald-400/40 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onTogglePause}
              aria-label={paused ? "Play auto-advance" : "Pause auto-advance"}
              aria-pressed={paused}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-bold text-emerald-200 backdrop-blur-md transition hover:bg-emerald-500/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              {paused ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M7 4.5v15l12-7.5z" />
                  </svg>
                  <span>Play</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M8 5v14M16 5v14" />
                  </svg>
                  <span>Auto</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onStep(1)}
              aria-label="Next slide"
              className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-white/12 bg-slate-900/80 text-white/85 backdrop-blur-md transition hover:border-emerald-400/40 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Right: Aspect Switcher (16:9 Executive vs 9:16 TikTok/Reel) + Clean Capture */}
          <div className="flex items-center gap-1.5">
            <div
              className="inline-flex rounded-xl border border-white/12 bg-slate-900/80 p-0.5 backdrop-blur-md"
              role="group"
              aria-label="Presentation aspect ratio"
            >
              <button
                type="button"
                onClick={() => onToggleAspect("16:9")}
                aria-pressed={aspect === "16:9"}
                className={`min-h-9 rounded-lg px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                  aspect === "16:9"
                    ? "bg-emerald-500 text-slate-950 shadow-xs"
                    : "text-white/70 hover:text-white"
                }`}
              >
                16:9 Deck
              </button>
              <button
                type="button"
                onClick={() => onToggleAspect("9:16")}
                aria-pressed={aspect === "9:16"}
                className={`min-h-9 rounded-lg px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                  aspect === "9:16"
                    ? "bg-emerald-500 text-slate-950 shadow-xs"
                    : "text-white/70 hover:text-white"
                }`}
              >
                9:16 TikTok
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleCinema}
              aria-pressed={cinemaMode}
              aria-label={cinemaMode ? "Exit clean recording view" : "Clean recording view (hide controls)"}
              className={`hidden min-h-10 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition sm:inline-flex focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                cinemaMode
                  ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                  : "border-white/12 bg-slate-900/80 text-white/75 hover:border-white/25 hover:text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span>Record view</span>
            </button>
          </div>
        </div>
      </div>

      {/* Native <dialog> Slide Directory */}
      <dialog
        ref={dialogRef}
        aria-labelledby="pitch-directory-heading"
        onClick={(e) => {
          if (e.target === dialogRef.current) closeDirectory();
        }}
        className="m-auto max-h-[85vh] w-[min(92vw,960px)] overflow-hidden rounded-3xl border border-white/15 bg-[#071422] p-0 text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                Offshora Pitch Deck · {slides.length} Slides
              </p>
              <h2 id="pitch-directory-heading" className="mt-0.5 text-lg font-extrabold text-white">
                Jump to any module or chapter
              </h2>
            </div>
            <button
              type="button"
              onClick={closeDirectory}
              aria-label="Close slide directory"
              className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              ✕
            </button>
          </div>

          <div className="grid gap-2.5 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-3">
            {slides.map((s, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSelect(idx);
                    closeDirectory();
                  }}
                  className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                    active
                      ? "border-emerald-400/60 bg-emerald-500/15 shadow-md"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-emerald-300">
                      {String(idx + 1).padStart(2, "0")} · {s.chapter}
                    </span>
                    {s.badge && (
                      <span className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/80">
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <span className="mt-1.5 text-sm font-bold text-white">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </dialog>
    </>
  );
}
