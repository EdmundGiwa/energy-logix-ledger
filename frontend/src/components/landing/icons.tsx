import type { SVGProps } from "react";
import { BRAND } from "@/lib/brand";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export const Icon = {
  Grid: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Chart: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-6" />
    </svg>
  ),
  Wrench: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />
    </svg>
  ),
  Shield: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Barrel: (p: IconProps) => (
    <svg {...base(p)}>
      <ellipse cx="12" cy="5" rx="7" ry="2.5" />
      <path d="M5 5v14c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5" />
      <path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </svg>
  ),
  Cube: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m12 2 9 5v10l-9 5-9-5V7z" />
      <path d="m3 7 9 5 9-5M12 12v10" />
    </svg>
  ),
  Users: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14c2.3 0 4 1.5 4.6 4" />
    </svg>
  ),
  Clipboard: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
    </svg>
  ),
  Settings: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  Sparkle: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5 13.2 11l2.3 1-2.3 1L12 15.5 10.8 13l-2.3-1 2.3-1z" />
      <path d="m5.6 5.6 1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </svg>
  ),
  Mic: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  ),
  Arrow: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  ArrowUpRight: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  ),
  Cloud: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M7 18a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5A3.75 3.75 0 0 1 17.5 18z" />
    </svg>
  ),
  Wind: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8" />
    </svg>
  ),
  Wave: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
    </svg>
  ),
  Clock: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  Ship: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 17l1.5-5h15L21 17" />
      <path d="M6 12V8h8l3 4M10 8V5h3" />
      <path d="M2 20c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" />
    </svg>
  ),
  Fuel: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3 21h13M7 8h5" />
      <path d="M15 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3" />
    </svg>
  ),
  Alert: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  Check: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m5 12 5 5L20 7" />
    </svg>
  ),
  X: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  Lock: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ),
  Wifi: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0M12 20h.01" />
    </svg>
  ),
  WifiOff: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m2 2 20 20M8.5 16a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 5.2-2.7M16.7 10.4a10 10 0 0 1 2.3 2.1M2 9a15 15 0 0 1 4.2-2.8M10.7 5a15 15 0 0 1 11.3 4M12 20h.01" />
    </svg>
  ),
  Sync: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8" />
      <path d="M21 3v5h-5M3 21v-5h5" />
    </svg>
  ),
  Database: (p: IconProps) => (
    <svg {...base(p)}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </svg>
  ),
  Server: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="3" width="18" height="8" rx="2" />
      <rect x="3" y="13" width="18" height="8" rx="2" />
      <path d="M7 7h.01M7 17h.01" />
    </svg>
  ),
  Satellite: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m13 7 4-4 4 4-4 4zM3 17l4-4 4 4-4 4z" />
      <path d="m9 9 6 6M14.5 9.5l-5 5" />
      <path d="M17 21a4 4 0 0 0 4-4M17 17.5a.5.5 0 0 0 .5-.5" />
    </svg>
  ),
  Phone: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  ),
  Monitor: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  QR: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </svg>
  ),
  FileText: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  ),
  Eye: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  IdCard: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="8" cy="12" r="2.5" />
      <path d="M14 10h4M14 14h4M4.5 17c.6-1.5 2-2.3 3.5-2.3s2.9.8 3.5 2.3" />
    </svg>
  ),
  Pen: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  ),
  Palette: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4.1-4-7.4-9-7.4z" />
      <circle cx="7.5" cy="10.5" r="1" />
      <circle cx="11" cy="7" r="1" />
      <circle cx="15.5" cy="8" r="1" />
    </svg>
  ),
  Layers: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m12 2 10 5-10 5L2 7z" />
      <path d="m2 12 10 5 10-5M2 17l10 5 10-5" />
    </svg>
  ),
  Menu: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  Pin: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  Bolt: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  ),
  Anchor: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 7.5V21M8 11h8M4 14a8 8 0 0 0 16 0" />
    </svg>
  ),
  Truck: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M2 16V7a1 1 0 0 1 1-1h11v10M14 9h4l3 3.5V16h-2" />
      <circle cx="6.5" cy="17" r="2" />
      <circle cx="16.5" cy="17" r="2" />
      <path d="M8.5 17h6" />
    </svg>
  ),
  Pipe: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M2 8h9a5 5 0 0 1 5 5v9" />
      <path d="M2 14h6a2 2 0 0 1 2 2v6" />
      <path d="M2 6v10M8 22h10" />
    </svg>
  ),
  Gauge: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 18a9 9 0 1 1 16 0" />
      <path d="m12 14 4-5" />
      <circle cx="12" cy="14" r="1.2" />
    </svg>
  ),
  Flask: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3" />
      <path d="M7 15h10" />
    </svg>
  ),
  Calendar: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2" />
    </svg>
  ),
  Receipt: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  ),
  Globe: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
    </svg>
  ),
  Tank: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 8c0-2.2 3.6-4 8-4s8 1.8 8 4v9c0 1.7-3.6 3-8 3s-8-1.3-8-3z" />
      <path d="M4 8c0 1.7 3.6 3 8 3s8-1.3 8-3M9 14v3M12 14.5v3M15 14v3" />
    </svg>
  ),
  Package: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m3 7 9-4 9 4v10l-9 4-9-4z" />
      <path d="m3 7 9 4 9-4M12 11v10M7.5 5l9 4" />
    </svg>
  ),
  Snow: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 2v20M4.2 6.5l15.6 11M19.8 6.5 4.2 17.5" />
      <path d="m9 4 3 2 3-2M9 20l3-2 3 2" />
    </svg>
  ),
  Scale: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z" />
    </svg>
  ),
  Route: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5" />
    </svg>
  ),
  Plug: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5" />
    </svg>
  ),
  Building: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h3a1 1 0 0 1 1 1v11M2 21h20" />
      <path d="M8 7h4M8 11h4M8 15h4" />
    </svg>
  ),
  Key: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="8" cy="15" r="4.5" />
      <path d="m11.2 11.8 9.3-9.3M17 6l3 3M14.5 8.5l2 2" />
    </svg>
  ),
  Fingerprint: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6.5 19.5c1.2-2 1.8-4.5 1.8-7.5a3.7 3.7 0 0 1 7.4 0c0 1.2-.1 2.4-.3 3.5M12 12c0 3.7-.8 6.8-2.4 9.3M15.2 19c.4-.9.7-1.9.9-2.9M4.3 15.5c.4-1.1.5-2.3.5-3.5a7.2 7.2 0 0 1 12-5.4M19.2 9.5c.3.8.4 1.6.4 2.5 0 1.2-.1 2.3-.3 3.4" />
    </svg>
  ),
  Play: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M7 4.5v15l12-7.5z" />
    </svg>
  ),
  Pause: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M8 5v14M16 5v14" />
    </svg>
  ),
  Chevron: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  ),
  Flame: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 21c-3.9 0-7-2.8-7-6.6 0-3.3 2.4-5.4 3.6-7.9.4 1.6 1.4 2.9 2.4 3.4C11 6.5 12.6 4 15 3c-.3 2.6.7 4.4 2 6 1.2 1.5 2 3.1 2 5.4 0 3.8-3.1 6.6-7 6.6z" />
    </svg>
  ),
  Wallet: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5" />
      <path d="M17 14h.01" />
    </svg>
  ),
  Message: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-6.2A8 8 0 1 1 21 12z" />
    </svg>
  ),
  Help: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
    </svg>
  ),
};

/**
 * Offshora mark: the "O" of the name framing an offshore platform on open water.
 * Navy-to-teal tile, slate ring, mint platform, emerald sea.
 */
export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="os-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b1523" />
          <stop offset="1" stopColor="#0a3d3a" />
        </linearGradient>
        <linearGradient id="os-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#065f46" />
        </linearGradient>
        <clipPath id="os-ring">
          <circle cx="24" cy="24" r="11.8" />
        </clipPath>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="12" fill="url(#os-tile)" stroke="rgba(15,23,42,0.12)" />
      <g clipPath="url(#os-ring)">
        <path d="M19 24v6M23 24v6M27 24v6" stroke="#a7f3d0" strokeWidth="1.7" />
        <path d="M16.5 22.2h15v2.2h-15z" fill="#a7f3d0" />
        <path d="M18 22.2l2.9-7.4 2.9 7.4z" fill="#a7f3d0" />
        <path d="M25.6 18.4h5v3.8h-5z" fill="#a7f3d0" />
        <path d="M28.8 18.4v-3" stroke="#a7f3d0" strokeWidth="1.2" />
        <path d="M8 28.6q2.5-1.5 5 0t5 0 5 0 5 0 5 0 5 0 5 0V40H8z" fill="url(#os-sea)" />
        <path d="M8 28.6q2.5-1.5 5 0t5 0 5 0 5 0 5 0 5 0 5 0" fill="none" stroke="#6ee7b7" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M10 32.6q2.5-1.2 5 0t5 0 5 0 5 0 5 0 5 0" fill="none" stroke="#34d399" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      </g>
      <circle cx="24" cy="24" r="13.6" fill="none" stroke="#e2e8f0" strokeWidth="3.6" />
    </svg>
  );
}

const wordmarkSize = {
  sm: { name: "text-[13px]", sub: "mt-0.5 text-[8px]" },
  md: { name: "text-[15.5px]", sub: "mt-1 text-[9.5px]" },
};

export function Wordmark({
  className = "",
  tone = "light",
  size = "md",
  descriptor = true,
}: {
  className?: string;
  /** "light" for white backgrounds, "dark" for navy panels. */
  tone?: "light" | "dark";
  size?: keyof typeof wordmarkSize;
  descriptor?: boolean;
}) {
  const sz = wordmarkSize[size];
  const dark = tone === "dark";
  return (
    <span className={`leading-none ${className}`}>
      <span className={`block font-extrabold uppercase tracking-[0.08em] ${sz.name} ${dark ? "text-white" : "text-slate-900"}`}>
        {BRAND.lead}
        <span className={dark ? "text-emerald-400" : "text-emerald-600"}>{BRAND.accent}</span>
      </span>
      {descriptor && (
        <span className={`block font-bold uppercase tracking-[0.32em] ${sz.sub} ${dark ? "text-emerald-400/70" : "text-emerald-700"}`}>
          {BRAND.descriptor}
        </span>
      )}
    </span>
  );
}
