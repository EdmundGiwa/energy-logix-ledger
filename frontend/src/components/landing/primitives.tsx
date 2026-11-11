"use client";

import {
  Fragment,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";

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
    <span className="font-label inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-700 ring-1 ring-emerald-100">
      <span className="h-1.5 w-1.5 rounded-[2px] bg-emerald-500" />
      {children}
    </span>
  );
}

/** Four crop-mark corners. Parent needs the `corners` class; colour follows `currentColor`. */
export function Corners() {
  return (
    <>
      <span aria-hidden className="corner tl" />
      <span aria-hidden className="corner tr" />
      <span aria-hidden className="corner bl" />
      <span aria-hidden className="corner br" />
    </>
  );
}

/** Full-width hairline with a centred plus marker, used between sections. */
export function RulePlus({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`rule-plus mx-auto max-w-[1360px] ${className}`} />;
}

type WithChildren = { children?: ReactNode; className?: string; style?: CSSProperties };

/**
 * Reveals text word by word from a blur as it scrolls into view.
 * Accepts rich children: styled spans are split into one styled clone per word so
 * accent colours survive the per-word transforms.
 *
 * Pass rich children only from client components: JSX created in a server component
 * reaches the browser as lazy references this walker cannot split, which causes a
 * hydration mismatch.
 */
export function BlurText({
  children,
  className = "",
  stagger = 55,
  delay = 0,
  as: Tag = "span",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  as?: ElementType;
}) {
  const { ref, inView } = useInView<HTMLElement>(0.25);
  let index = 0;
  const nextDelay = () => ({ transitionDelay: `${delay + index++ * stagger}ms` });
  const words = (text: string, wrap: (word: string, key: string) => ReactNode, keyBase: string) =>
    text.split(/(\s+)/).map((part, k) => (part.trim() === "" ? part : wrap(part, `${keyBase}-${k}`)));

  const walk = (node: ReactNode, keyBase: string): ReactNode => {
    if (typeof node === "string" || typeof node === "number") {
      return words(String(node), (word, key) => (
        <span key={key} className="bw" style={nextDelay()}>
          {word}
        </span>
      ), keyBase);
    }
    if (Array.isArray(node)) return node.map((child, k) => <Fragment key={`${keyBase}.${k}`}>{walk(child, `${keyBase}.${k}`)}</Fragment>);
    if (isValidElement(node)) {
      const el = node as ReactElement<WithChildren>;
      if (el.type === Fragment) return walk(el.props.children, keyBase);
      const inner = el.props.children;
      if (typeof inner === "string") {
        return words(inner, (word, key) =>
          cloneElement(el, { key, className: `${el.props.className ?? ""} bw`, style: { ...el.props.style, ...nextDelay() } }, word),
        keyBase);
      }
      return inner === undefined ? el : cloneElement(el, undefined, walk(inner, keyBase));
    }
    return node;
  };

  return (
    <Tag ref={ref} className={`${inView ? "is-in" : ""} ${className}`}>
      {walk(children, "w")}
    </Tag>
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
    <div className={`corners px-5 py-6 text-slate-400 sm:px-8 sm:py-8 ${center ? "mx-auto max-w-4xl text-center" : "max-w-4xl"}`}>
      <Corners />
      <Reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
      </Reveal>
      <h2 className="font-display mt-4 text-[2.15rem] leading-[1.06] text-[#0a0f14] sm:text-[2.8rem] lg:text-[3.3rem]">
        {!center && <span className="ring-dot mr-[0.35em] -translate-y-[0.08em] text-[0.9em]" aria-hidden />}
        <BlurText>{title}</BlurText>
      </h2>
      {sub && (
        <Reveal delay={150}>
          <p className={`mt-4 text-[15.5px] leading-relaxed text-slate-600 md:text-[16.5px] ${center ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>{sub}</p>
        </Reveal>
      )}
    </div>
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
