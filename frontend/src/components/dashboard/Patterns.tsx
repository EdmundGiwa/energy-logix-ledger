// Decorative, deterministic SVG patterns for the dashboard (no randomness → no hydration mismatch).

/** Wobbly closed loop around (cx, cy), like one line on a topographic map. */
function contourPath(cx: number, cy: number, r: number, seed: number, points = 72) {
  let d = "";
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2;
    const wobble =
      1 +
      0.09 * Math.sin(3 * t + seed) +
      0.05 * Math.sin(5 * t + seed * 1.7) +
      0.03 * Math.sin(8 * t + seed * 0.6);
    const x = cx + r * wobble * Math.cos(t) * 1.25;
    const y = cy + r * wobble * Math.sin(t);
    d += `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d + "Z";
}

/** A cluster of nested contour rings. Coordinates are in a 1000×1000 viewBox. */
export function Contours({
  cx,
  cy,
  rings = 9,
  gap = 34,
  start = 30,
  seed = 1,
  stroke = "currentColor",
  accentEvery = 4,
  accent = "#10b981",
  className = "",
}: {
  cx: number;
  cy: number;
  rings?: number;
  gap?: number;
  start?: number;
  seed?: number;
  stroke?: string;
  accentEvery?: number;
  accent?: string;
  className?: string;
}) {
  return (
    <g className={className} fill="none">
      {Array.from({ length: rings }).map((_, i) => {
        const isAccent = accentEvery > 0 && i % accentEvery === accentEvery - 1;
        return (
          <path
            key={i}
            d={contourPath(cx, cy, start + i * gap, seed + i * 0.35)}
            stroke={isAccent ? accent : stroke}
            strokeWidth={isAccent ? 1.4 : 1}
            strokeOpacity={isAccent ? 0.55 : 0.5}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
}

/** Full-page backdrop: two contour fields, soft glows and grain. Sits behind all dashboard content. */
export function DashboardBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Soft colour blooms */}
      <div className="dash-bloom absolute -right-[10%] -top-[18%] h-[620px] w-[720px] rounded-full bg-emerald-300/25 blur-[120px]" />
      <div className="dash-bloom absolute -bottom-[22%] -left-[8%] h-[560px] w-[680px] rounded-full bg-sky-300/20 blur-[120px] [animation-delay:-9s]" />
      <div className="absolute left-[38%] top-[42%] h-[420px] w-[520px] rounded-full bg-teal-200/15 blur-[130px]" />

      {/* Topographic contours */}
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" className="dash-drift absolute inset-0 h-full w-full text-slate-400/40">
        <Contours cx={900} cy={60} rings={13} gap={30} start={24} seed={1.2} />
        <Contours cx={70} cy={940} rings={12} gap={32} start={20} seed={3.4} accent="#0ea5e9" />
        <Contours cx={560} cy={520} rings={5} gap={26} start={18} seed={5.1} accentEvery={0} className="opacity-60" />
      </svg>

      {/* Fine grain so large flat areas don't band */}
      <div className="dash-grain absolute inset-0" />
    </div>
  );
}

/** Flowing "seismic trace" lines for header bands. */
export function SeismicBand({ className = "" }: { className?: string }) {
  const lines = Array.from({ length: 7 }).map((_, k) => {
    let d = "";
    for (let x = 0; x <= 1200; x += 10) {
      const y =
        60 +
        k * 9 +
        Math.sin(x / 90 + k * 0.6) * (10 + k * 1.5) +
        Math.sin(x / 37 + k) * 3 * Math.exp(-(((x - 760) / 170) ** 2)) * (k + 1);
      d += `${x ? "L" : "M"}${x},${y.toFixed(1)}`;
    }
    return d;
  });
  return (
    <svg viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden className={`pointer-events-none ${className}`}>
      <defs>
        <linearGradient id="seis" x1="0" x2="1">
          <stop offset="0" stopColor="#10b981" stopOpacity="0" />
          <stop offset="0.45" stopColor="#10b981" stopOpacity="0.55" />
          <stop offset="0.75" stopColor="#0ea5e9" stopOpacity="0.45" />
          <stop offset="1" stopColor="#0ea5e9" stopOpacity="0" />
        </linearGradient>
      </defs>
      {lines.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="url(#seis)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity={0.35 + i * 0.07} />
      ))}
    </svg>
  );
}

/** Contour texture for coloured cards (white lines on emerald or navy). */
export function CardContours({ className = "", seed = 2 }: { className?: string; seed?: number }) {
  return (
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <Contours cx={980} cy={80} rings={11} gap={70} start={40} seed={seed} stroke="#ffffff" accent="#ffffff" accentEvery={0} />
    </svg>
  );
}
