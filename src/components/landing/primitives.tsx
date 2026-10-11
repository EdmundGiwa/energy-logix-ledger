"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

export function useInView<T extends Element>(threshold = 0.18) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.12);
  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

export function CountUp({
  to,
  duration = 1600,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">
      <span className="h-1.5 w-1.5 rounded-sm bg-emerald-600" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  center = false,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  center?: boolean;
}) {
  return (
    <Reveal className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-[1.95rem] font-extrabold leading-[1.12] tracking-[-0.035em] text-slate-900 sm:text-[2.35rem] md:text-[2.75rem]">
        {title}
      </h2>
      {sub && <p className="mt-4 text-[15px] leading-relaxed text-slate-600 md:text-[16px]">{sub}</p>}
    </Reveal>
  );
}

/** Card with a soft light that follows the cursor. */
export function Spotlight({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  return (
    <Tag
      ref={ref}
      onPointerMove={(e: React.PointerEvent<HTMLElement>) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--sx", `${e.clientX - r.left}px`);
        el.style.setProperty("--sy", `${e.clientY - r.top}px`);
      }}
      className={`spotlight ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "crit" | "info";
  children: ReactNode;
}) {
  const map = {
    ok: "bg-emerald-50 text-emerald-800 ring-emerald-200/90",
    warn: "bg-amber-50 text-amber-800 ring-amber-200/90",
    crit: "bg-rose-50 text-rose-800 ring-rose-200/90",
    info: "bg-sky-50 text-sky-800 ring-sky-200/90",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${map[tone]}`}>
      {children}
    </span>
  );
}
