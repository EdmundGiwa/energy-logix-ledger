import type { ComponentType } from "react";
import { Icon } from "./icons";

/** The four field stories told on the landing page: one module, one signed record each. */
type IconC = ComponentType<{ size?: number; className?: string }>;
export type Tone = "ok" | "warn" | "crit";

export type Chapter = {
  key: string;
  word: string;
  module: string;
  icon: IconC;
  image: string;
  alt: string;
  position: string;
  place: string;
  coords: string;
  line: string;
  record: { title: string; id: string };
  steps: { label: string; meta: string; flag?: boolean }[];
  metric: { label: string; value: number; decimals?: number; unit: string; note: string; seed: number };
  toast: { tone: Tone; title: string; text: string };
};

export const chapters: Chapter[] = [
  {
    key: "lift",
    word: "lift",
    module: "OffshoreLink",
    icon: Icon.Cube,
    image: "/images/rig-aerial.jpg",
    alt: "Platform supply vessel working alongside an offshore installation",
    position: "object-[45%_50%]",
    place: "Onne supply base → Bonga FPSO",
    coords: "4.72° N · 7.15° E",
    line: "Deck cargo, fuel, water, mud, provisions and crew, from the supply base quay to the rig and back. Every lift is tagged, weighed and signed for.",
    record: { title: "PSV voyage · Onne → Bonga", id: "VOY-2026-0611" },
    steps: [
      { label: "Voyage & deck plan approved", meta: "2 drops" },
      { label: "46 lifts tagged & weighed", meta: "46 / 46" },
      { label: "CCU & sling certificates checked", meta: "All valid" },
      { label: "DG segregation conflict", meta: "Re-stowed", flag: true },
      { label: "Master & base signed manifest", meta: "2 / 2" },
    ],
    metric: { label: "Deck cargo out", value: 1940, unit: "t", note: "84% deck utilisation", seed: 7 },
    toast: { tone: "ok", title: "MGO 420 m³ to Rig Okoro-2", text: "Vessel vs. rig variance 0.18%" },
  },
  {
    key: "bunker",
    word: "litre",
    module: "BunkerFlow",
    icon: Icon.Ship,
    image: "/images/rig-vessel.jpg",
    alt: "Supply vessel alongside an offshore platform",
    position: "object-[62%_50%]",
    place: "Lagos Offshore Anchorage",
    coords: "6.38° N · 3.37° E",
    line: "Soundings corrected to ASTM 54B, dual-signed e-BDNs and sealed samples. Every bunker stem reconciles before the barge casts off.",
    record: { title: "e-BDN · MV Atlantic Grace", id: "BDN-2026-0418" },
    steps: [
      { label: "Stem nominated", meta: "420 MT VLSFO" },
      { label: "Tanks sounded fore & aft", meta: "6 tanks" },
      { label: "Corrected · ASTM 54B / 56", meta: "VCF 0.98143" },
      { label: "Variance checked", meta: "0.18% ✓" },
      { label: "Chief Engineer & supplier signed", meta: "2 / 2" },
    ],
    metric: { label: "Delivered today", value: 3420, unit: "MT", note: "+6.2% vs. plan", seed: 4 },
    toast: { tone: "ok", title: "Sample seal S-2291 logged", text: "MARPOL Annex VI record attached" },
  },
  {
    key: "pipe",
    word: "line",
    module: "PipeIntegrity",
    icon: Icon.Pipe,
    image: "/images/rig-aerial.jpg",
    alt: "Aerial view of an offshore platform with a support vessel",
    position: "object-[38%_50%]",
    place: "Trunkline TL-04 · Delta corridor",
    coords: "5.52° N · 5.75° E",
    line: "Pig runs, hydrotests, NDT and cathodic protection on one integrity record, ready to export in your IOC client's audit format.",
    record: { title: "Pig run · PG-17 · TL-04", id: "PIG-2026-0117" },
    steps: [
      { label: "Launched at KP-0", meta: "62 bar" },
      { label: "Passed marker KP-46", meta: "38 min late", flag: true },
      { label: "Receiver crew alerted", meta: "Auto" },
      { label: "Arrived at KP-71", meta: "16:05" },
      { label: "Debris logged & photographed", meta: "4.2 kg" },
    ],
    metric: { label: "Line pressure", value: 148.6, decimals: 1, unit: "bar", note: "Stable ±0.4 bar", seed: 12 },
    toast: { tone: "warn", title: "Transit velocity 0.9 m/s", text: "Below run plan · receiver notified" },
  },
  {
    key: "safe",
    word: "permit",
    module: "SafePass",
    icon: Icon.Shield,
    image: "/images/rig-dusk.jpg",
    alt: "Offshore production platform lit up at dusk",
    position: "object-[60%_40%]",
    place: "Platform A · Offshore Bonny",
    coords: "4.42° N · 7.15° E",
    line: "No valid ticket, no seat on the boat. Expired BOSIET and HUET certificates block the manifest, and a failed gas test locks the permit.",
    record: { title: "Crew manifest · Day shift", id: "MAN-2026-1010" },
    steps: [
      { label: "Manifest drafted", meta: "24 crew" },
      { label: "BOSIET · HUET · OSP checked", meta: "21 / 24" },
      { label: "3 crew blocked · expiring < 30 d", meta: "Blocked", flag: true },
      { label: "Standby crew swapped in", meta: "Onne base" },
      { label: "Gas test passed · PTW-0412", meta: "LEL 2%" },
    ],
    metric: { label: "Crew readiness", value: 97.8, decimals: 1, unit: "%", note: "Target 98.5%", seed: 21 },
    toast: { tone: "crit", title: "E. Okon removed from manifest", text: "OSP certificate expired 2 days ago" },
  },
];
