// Small deterministic chart primitives (no randomness → no hydration mismatch)

export function seeded(n: number, seed = 1, min = 0.25, max = 1) {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const wave = (Math.sin(i / 2.3 + seed) + 1) / 2;
    out.push(min + (max - min) * (0.55 * r + 0.45 * wave));
  }
  return out;
}

export function Sparkline({
  data,
  color = "#fbbf24",
  height = 44,
  id,
}: {
  data: number[];
  color?: string;
  height?: number;
  id: string;
}) {
  const w = 160;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - v * (height - 4) - 2] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.45" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function SegmentBar({
  value,
  segments = 28,
  tone = "amber",
}: {
  value: number;
  segments?: number;
  tone?: "amber" | "azure" | "ok" | "red";
}) {
  const on = Math.round(segments * value);
  const color = { amber: "bg-gold", azure: "bg-sky", ok: "bg-ok", red: "bg-crit" }[tone];
  return (
    <div className="flex h-3 gap-[3px]">
      {Array.from({ length: segments }).map((_, i) => (
        <span key={i} className={`flex-1 rounded-[2px] ${i < on ? color : "bg-white/10"}`} />
      ))}
    </div>
  );
}
