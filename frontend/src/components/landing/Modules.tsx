"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { Icon } from "./icons";
import { seeded } from "./charts";
import { Reveal, SectionHeading, Spotlight } from "./primitives";
import { NewBadge } from "@/components/ui/NewBadge";

type Group = "Offshore" | "Marine" | "Pipeline & EPC" | "Depot & Haulage" | "HSE & Compliance" | "Commercial";
type Preview =
  | "bunker"
  | "pipe"
  | "refinery"
  | "haul"
  | "epc"
  | "safe"
  | "stores"
  | "tank"
  | "shield"
  | "billing"
  | "portal"
  | "owner"
  | "offshore"
  | "rigsupply"
  | "crew"
  | "vessel"
  | "equip"
  | "guard"
  | "enviro";

type Module = {
  n: number;
  name: string;
  tag: string;
  group: Group;
  icon: ComponentType<{ size?: number; className?: string }>;
  phase: string;
  addon?: string;
  blurb: string;
  features: string[];
  preview: Preview;
  isNew?: boolean;
};

const modules: Module[] = [
  {
    n: 1,
    name: "BunkerFlow",
    tag: "Marine fuel and port services",
    group: "Marine",
    icon: Icon.Ship,
    phase: "Phase 1 · MVP",
    addon: "e-BDN export interoperability add-on",
    blurb: "Nomination to dual-signed e-BDN, with soundings corrected to standard and every sample seal tracked.",
    features: [
      "Nomination intake, stem confirmation, price quote and invoice",
      "Tank sounding with ASTM 54B / 56 conversion, fore and aft, trim and temperature correction",
      "e-BDN with flashpoint, viscosity, sulphur and water content, signed by Chief Engineer and supplier",
      "Sample seal tracking and MARPOL Annex VI-linked records",
      "STS transfer ledger: mooring, fenders, vapour balancing, pump rate, JSA",
      "Port husbandry: fresh water, lube oils, spares and provisions with receipts",
      "e-BDN export in standard formats for international counterparties",
    ],
    preview: "bunker",
  },
  {
    n: 2,
    name: "PipeIntegrity",
    tag: "Pipeline services and EPC support",
    group: "Pipeline & EPC",
    icon: Icon.Pipe,
    phase: "Phase 2",
    addon: "Intelligent pigging ingestion · CP and asset integrity add-ons",
    blurb: "Pig runs, hydrotests, NDT, cathodic protection and right-of-way checks for every line, in one integrity record.",
    features: [
      "Pigging run tracker: scraper, brush, gauging, intelligent MFL/UT, launcher to receiver",
      "Hydrotest engine: pressure vs. temperature, hold-period validation, pressure-drop alerts",
      "Code basis per line: ASME B31.4 (liquid), B31.8 (gas), API 1110 test procedure",
      "NDT and corrosion registry with weld IDs and remaining-life calculation",
      "Cathodic protection: CIPS and DCVG surveys, rectifier readings, anode records",
      "Valve leak detection and maintenance, chemical cleaning and commissioning packs",
      "Right-of-way surveillance with geotagged photos; IOC audit-format export",
    ],
    preview: "pipe",
  },
  {
    n: 3,
    name: "RefineryLink",
    tag: "Gantry, tank farm and depot",
    group: "Depot & Haulage",
    icon: Icon.Tank,
    phase: "Phase 3",
    addon: "Lagos e-Call-Up connector · Gantry bridge (subject to access)",
    blurb: "Depot reconciliation at every discharge, not at month-end, from ATG import to quality certificate per batch.",
    features: [
      "Terminal offtake and truck appointment scheduling",
      "Holding-park queue manager: check-in, RFID or QR read, slot assignment, driver accreditation",
      "Automated tank gauging import and ullage dips; GOV to NSV at 15 °C or 20 °C",
      "Gantry meter ticket reconciliation with AccuLoad and Smith Meter batch controllers",
      "Quality certificate per batch: density, flash point, distillation, RON, sulphur ppm",
      "Lagos e-Call-Up connector, conditional on confirmed API access",
    ],
    preview: "refinery",
  },
  {
    n: 4,
    name: "HaulTrac",
    tag: "Bulk road haulage",
    group: "Depot & Haulage",
    icon: Icon.Truck,
    phase: "Phase 1 · MVP",
    blurb: "From weighbridge to buyer e-signature, every truck carries a tamper-evident e-Waybill.",
    features: [
      "Weighbridge tare and gross capture with digital weighbridge integration",
      "Encrypted, tamper-evident e-Waybill with QR dispatch data",
      "Compartment valve and geofence monitoring via telematics",
      "Route deviation and unauthorised-stop alerts",
      "Proof of delivery: ullage, temperature, water-paste test, buyer e-signature",
      "Fleet compliance: papers, licences, tanker inspection and calibration certificates",
      "Fee and levy ledger with evidence for disputes",
    ],
    preview: "haul",
  },
  {
    n: 5,
    name: "EPC-Link",
    tag: "Procurement, OCTG and local content",
    group: "Pipeline & EPC",
    icon: Icon.Building,
    phase: "Phase 2",
    addon: "NCFCC / NOGIC-JQS export pack · free in Growth and above",
    blurb: "Stay tender-ready: NCFCC readiness, Nigerian Content spend and bid dossiers, all from one place.",
    features: [
      "Material requisition and pipe yard control: heat numbers, MTCs, wall thickness, bays, QR tags",
      "NCDMB Nigerian Content spend engine: payroll, local fabrication, raw materials",
      "NCFCC readiness checker and renewal alerts",
      "NOGIC-JQS export pack for registration, tenders and M&E reporting",
      "NCEC expiry and calibration tracker for cranes and test spreads",
      "Bid dossier export: NUPRC permits, NCDMB documents, PENCOM, ITF, NSITF",
      "Vendor prequalification workflow for IOC tenders",
    ],
    preview: "epc",
  },
  {
    n: 6,
    name: "SafePass",
    tag: "HSE, permits and rotations",
    group: "HSE & Compliance",
    icon: Icon.Shield,
    phase: "Phase 1 · MVP",
    addon: "WhatsApp crew-expiry bot add-on",
    blurb: "No valid ticket, no seat on the boat. No passed gas test, no permit.",
    features: [
      "Mobilisation gate: BOSIET, HUET, OSP, STCW, medical. Blocks manifests when credentials expire within 30 days",
      "Digital Permit-to-Work: hot work, confined space, heights, excavation; multi-level approvals",
      "Gas test entry (H₂S, LEL, O₂) with interlocks that block permit issue on failure",
      "JSA and toolbox talk records",
      "Hazard observation and near-miss reporting, offline with photos and risk matrix",
      "CAPA tracking to closure",
      "Rotation scheduler (14/14, 28/28) with standby vs. active day-rate ledger",
    ],
    preview: "safe",
  },
  {
    n: 7,
    name: "MarineStores",
    tag: "Ship spares, provisions and consumables",
    group: "Marine",
    icon: Icon.Package,
    phase: "Phase 3",
    addon: "MarineStores · Refrigerant gas tracking add-ons",
    blurb: "One catalogue for everything you put on board, from lube grades to refrigerant cylinders.",
    features: [
      "Catalogue for ship spares, PPE, safety and life-saving equipment, deck and engine stores",
      "Branded lubricant catalogue with grade and pack-size lookup",
      "Bonded stores and provisions management",
      "Medical supplies with expiry tracking",
      "Charts and publications subscription tracking",
      "Refrigerant gas inventory (R404, R22, R407, R134a, R407C, R410A) with cylinder and recovery logs",
    ],
    preview: "stores",
  },
  {
    n: 8,
    name: "TankWorks",
    tag: "Tank and field services",
    group: "Pipeline & EPC",
    icon: Icon.Wrench,
    phase: "Phase 3",
    addon: "TankWorks job-costing add-on",
    blurb: "Job costing for tank evacuation, cleaning, blasting and recoating, linked to confined-space permits.",
    features: [
      "Job costing for tank evacuation, cleaning, blasting and recoating",
      "Confined-space entry linked to SafePass permits",
      "Sludge and waste disposal manifests",
      "Recoating inspection records: DFT readings and adhesion tests",
      "Crew hours and equipment utilisation per job",
    ],
    preview: "tank",
  },
  {
    n: 9,
    name: "Compliance Shield",
    tag: "Regulatory calendar",
    group: "HSE & Compliance",
    icon: Icon.Calendar,
    phase: "Phase 2",
    blurb: "Every licence, permit and certificate on one calendar, with alerts well before expiry.",
    features: [
      "Single calendar for NCDMB, NUPRC, NMDPRA, NIMASA, NPA and ISO renewals",
      "Automatic alerts at 90, 60, 30 and 7 days",
      "Audit pack generation per regulator or client",
      "Evidence trail for ISO 9001, 14001 and 45001 audits",
    ],
    preview: "shield",
  },
  {
    n: 10,
    name: "Billing & Commercial",
    tag: "Job costing to cash",
    group: "Commercial",
    icon: Icon.Receipt,
    phase: "Phase 3",
    blurb: "Invoice in naira or dollars with the rate captured, and get paid through local gateways.",
    features: [
      "Job costing across modules",
      "Interim payment certificates (IPC) for EPC contracts",
      "Invoices in NGN and USD with a rate snapshot",
      "Payment links through local gateways such as Paystack and Flutterwave",
      "Customer statements and ageing reports",
    ],
    preview: "billing",
  },
  {
    n: 11,
    name: "Client Portal",
    tag: "External, read-only",
    group: "Commercial",
    icon: Icon.Globe,
    phase: "Phase 2",
    addon: "Client Portal add-on · free in Enterprise",
    blurb: "Your IOC and EPC clients see the BDNs, PODs and certificates themselves, and ask their other vendors to use Offshora too.",
    features: [
      "Read-only portal for IOCs, EPC clients and fleet customers",
      "Shared BDNs, PODs, test certificates and inspection reports",
      "Creates pull from the demand side: clients see it working",
    ],
    preview: "portal",
  },
  {
    n: 12,
    name: "Owner Dashboard",
    tag: "Cross-module KPIs",
    group: "Commercial",
    icon: Icon.Chart,
    phase: "Phase 4",
    blurb: "Turnaround, shrinkage, reconciliation status and certificate risk across the whole business on one screen.",
    features: [
      "Live KPIs: turnaround time, shrinkage %, reconciliation status, certificate risk, utilisation",
      "Exception feed: variances over 0.5%, failed gas tests, expired credentials",
    ],
    preview: "owner",
  },
  {
    n: 13,
    isNew: true,
    name: "OffshoreLink",
    tag: "Supply base and deck cargo logistics",
    group: "Offshore",
    icon: Icon.Cube,
    phase: "Phase 2 · Offshore",
    addon: "Shared-voyage cost split add-on",
    blurb: "Every lift from the supply base quay to the rig deck and back, on one manifest. No CCU goes missing, and no dangerous good sails in the wrong place.",
    features: [
      "Multi-drop PSV voyage planner for rigs, FPSOs, platforms and jackets",
      "Deck space and deck load planner with stowage drawing",
      "Lift-by-lift manifest with QR / RFID tag, weight and destination",
      "CCU and lifting-set certificate check before every load-out (aligned with DNV-ST-E271 / 2.7-1)",
      "IMDG dangerous goods declaration with segregation checks that block load-out",
      "Backload reconciliation and overdue-CCU alerts with rental exposure",
      "Weather and port sailing holds with master's go / no-go",
    ],
    preview: "offshore",
  },
  {
    n: 14,
    isNew: true,
    name: "RigSupply",
    tag: "Offshore fuel, water and bulk supply",
    group: "Offshore",
    icon: Icon.Barrel,
    phase: "Phase 2 · Offshore",
    blurb: "Diesel, drill water, mud, brine and cement delivered to the rig and reconciled to the litre, with days-of-supply alerts before anyone runs short.",
    features: [
      "MGO / AGO delivery tickets to rigs, FPSOs and platforms",
      "Drill water, potable water, brine and liquid mud (OBM / WBM / SBM)",
      "Dry bulk: cement, barite and bentonite tonnage per transfer",
      "Vessel meter vs. rig sounding reconciliation with variance alerts",
      "Sample seals and density at 15 °C on every fuel transfer",
      "Rig tank levels and days-of-supply forecast per product",
      "Suggests extra drops onto planned OffshoreLink voyages",
    ],
    preview: "rigsupply",
  },
  {
    n: 15,
    isNew: true,
    name: "CrewTransit",
    tag: "Helicopter, crew boat and POB",
    group: "Offshore",
    icon: Icon.Users,
    phase: "Phase 2 · Offshore",
    blurb: "Book seats on flights and crew boats, check every ticket before boarding, and keep personnel-on-board counts right when plans change.",
    features: [
      "Helicopter manifests with seat allocation and standby list",
      "Crew boat and walk-to-work transfers with sea-state limits",
      "Passenger and baggage weight capture at check-in",
      "Seat blocked automatically when BOSIET, HUET or medical has expired (via SafePass)",
      "Live POB per installation with bed and lifeboat capacity limits",
      "Weather cancellation and rebooking without re-entry",
      "Muster list export for the offshore installation manager",
    ],
    preview: "crew",
  },
  {
    n: 16,
    isNew: true,
    name: "VesselOps",
    tag: "OSV charter, fleet and vessel compliance",
    group: "Offshore",
    icon: Icon.Anchor,
    phase: "Phase 2 · Offshore",
    blurb: "On-hire, off-hire, daily vessel reports and certificates for PSVs, AHTS, crew boats and tugs, so every chargeable day is backed by a signed record.",
    features: [
      "Charter party register: day rates, mob / demob and fuel terms",
      "On-hire / off-hire ledger signed by owner and charterer",
      "Daily vessel report: activities, position, DP hours, fuel and water ROB",
      "Class, flag, ISM / ISPS and P&I certificates with expiry alerts",
      "NIMASA cabotage registration and waiver tracking",
      "OVID / CMID inspection findings tracked to close-out",
      "Charter invoices raised from chargeable days into Billing",
    ],
    preview: "vessel",
  },
  {
    n: 17,
    isNew: true,
    name: "EquipTrack",
    tag: "Rental equipment, CCUs and lifting gear",
    group: "Offshore",
    icon: Icon.QR,
    phase: "Phase 3",
    blurb: "Know where every rented tool, container and sling is, whether its certificate is valid, and how many days you are paying for it.",
    features: [
      "One register for owned and rented tools, CCUs, tanks and lifting gear",
      "QR / RFID tag with location history: base, vessel, installation",
      "CCU periodic inspection and lifting-gear thorough examination dates",
      "Expired items blocked from OffshoreLink manifests",
      "On-rent / off-rent dates with chargeable-day counter",
      "Idle equipment alerts with daily cost exposure",
      "Supplier invoice check against tracked rental days",
    ],
    preview: "equip",
  },
  {
    n: 18,
    isNew: true,
    name: "MarineGuard",
    tag: "Maritime security and voyage risk",
    group: "Offshore",
    icon: Icon.Satellite,
    phase: "Phase 3",
    blurb: "Voyage risk assessments, escort bookings and MDAT-GoG reports for Gulf of Guinea transits, with every incident on record.",
    features: [
      "Voyage risk assessment per route, vessel and time of day",
      "Security escort booking with rendezvous, comms plan and cost",
      "MDAT-GoG initial, daily and final report tracker",
      "BMP West Africa ship-protection checklist and citadel drill records",
      "AIS status log with reasons for any change",
      "Offline incident capture: statements, photos, positions, time line",
    ],
    preview: "guard",
  },
  {
    n: 19,
    isNew: true,
    name: "EnviroLedger",
    tag: "Offshore waste, discharges and emissions",
    group: "HSE & Compliance",
    icon: Icon.Wind,
    phase: "Phase 3",
    addon: "ESG reporting pack add-on",
    blurb: "Waste tracked from the installation to licensed disposal, MARPOL record books kept current, and fuel-based emissions ready for client ESG reports.",
    features: [
      "Waste transfer notes from installation to vessel, base and disposal",
      "Drill cuttings, oily waste, chemicals and scrap with custody-gap alerts",
      "MARPOL Annex I oil record book and Annex V garbage record book",
      "Oil spill reporting pack for NOSDRA, plus drill and readiness records",
      "Fuel-based CO₂ per vessel, voyage, installation and client",
      "Data ready for IMO DCS and CII where the vessel size requires it",
    ],
    preview: "enviro",
  },
];

const groups: ("All" | "New" | Group)[] = ["All", "New", "Offshore", "Marine", "Pipeline & EPC", "Depot & Haulage", "HSE & Compliance", "Commercial"];

/* ------------------------------------------------------------------ */
/* Previews                                                            */
/* ------------------------------------------------------------------ */

function Row({ l, r, tone = "text-slate-900" }: { l: string; r: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-[12.5px] last:border-0">
      <span className="text-slate-500">{l}</span>
      <span className={`font-mono font-semibold ${tone}`}>{r}</span>
    </div>
  );
}

function Ring({ pct, label }: { pct: number; label: string }) {
  const c = 2 * Math.PI * 42;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="url(#ringG)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)" }}
        />
        <defs>
          <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#10b981" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-3xl font-extrabold text-slate-900">{Math.round(pct * 100)}%</p>
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function Bars({ seed, n = 14, tone = "bg-emerald-500" }: { seed: number; n?: number; tone?: string }) {
  const d = useMemo(() => seeded(n, seed, 0.25, 1), [seed, n]);
  return (
    <div className="flex h-24 items-end gap-1.5">
      {d.map((v, i) => (
        <span key={i} className={`bar-anim flex-1 rounded-t-md ${tone}`} style={{ height: `${v * 100}%`, opacity: 0.45 + v * 0.55, animationDelay: `${i * 0.04}s` }} />
      ))}
    </div>
  );
}

function PreviewBody({ kind }: { kind: Preview }) {
  switch (kind) {
    case "bunker":
      return (
        <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
          <div className="relative mx-auto h-48 w-28 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="bar-anim absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-400">
              <div className="shimmer absolute inset-x-0 top-0 h-3" />
            </div>
            {[20, 40, 60, 80].map((y) => (
              <span key={y} className="absolute left-0 h-px w-3 bg-slate-300" style={{ bottom: `${y}%` }} />
            ))}
            <span className="absolute right-2 top-[30%] rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-white">2.84 m</span>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Tank 3P · Aft sounding</p>
            <Row l="Observed volume" r="412.60 m³" />
            <Row l="Trim correction" r="−0.84 m³" />
            <Row l="Temperature" r="38.5 °C" />
            <Row l="VCF · Table 54B" r="0.98143" />
            <Row l="Mass · Table 56" r="388.9 MT" tone="text-emerald-700" />
            <div className="mt-3 flex gap-2">
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">Chief Engineer ✓</span>
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">Supplier · pending</span>
            </div>
          </div>
        </div>
      );
    case "pipe": {
      const pts = seeded(30, 3, 0.86, 0.9);
      const d = pts.map((v, i) => `${i ? "L" : "M"}${(i / 29) * 300},${120 - v * 100}`).join(" ");
      return (
        <div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-bold uppercase tracking-wider text-slate-500">Hydrotest · Line TL-04 · B31.4</span>
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">Hold valid</span>
          </div>
          <svg viewBox="0 0 300 130" className="mt-3 h-40 w-full">
            {[20, 50, 80, 110].map((y) => (
              <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="#e2e8f0" />
            ))}
            <path d="M0,120 L30,26 L300,26" stroke="#93c5fd" strokeDasharray="4 4" fill="none" />
            <path d={`M0,120 L30,${120 - pts[0] * 100} ${d.replace(/^M[^L]+/, "")}`} pathLength={1} className="draw-line" stroke="#059669" strokeWidth="2.4" fill="none" />
            <text x="232" y="20" fontSize="9" fill="#0284c7" fontWeight="700">Test pressure</text>
          </svg>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Hold", "22h 14m"],
              ["ΔP", "0.3 bar"],
              ["ΔT", "+1.2 °C"],
            ].map(([a, b]) => (
              <div key={a} className="rounded-xl border border-slate-200 bg-white py-2 shadow-xs">
                <p className="text-[10.5px] text-slate-500">{a}</p>
                <p className="font-mono text-[13px] font-bold text-slate-900">{b}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "refinery":
      return (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Tank farm · GOV → NSV @ 15 °C</p>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {[0.82, 0.46, 0.67, 0.28].map((v, i) => (
              <div key={i} className="text-center">
                <div className="relative mx-auto h-32 w-full overflow-hidden rounded-t-2xl rounded-b-lg border border-slate-200 bg-slate-50">
                  <div
                    className={`bar-anim absolute inset-x-0 bottom-0 ${i === 3 ? "bg-gradient-to-t from-sky-600 to-sky-400" : "bg-gradient-to-t from-emerald-600 to-emerald-400"}`}
                    style={{ height: `${v * 100}%`, animationDelay: `${i * 0.1}s` }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-bold text-slate-900">TK-0{i + 1}</p>
                <p className="font-mono text-[10.5px] text-slate-500">{Math.round(v * 12000).toLocaleString()} m³</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px]">
            <span className="text-slate-600">Gantry bay 4 · AccuLoad ticket #88213</span>
            <span className="font-mono font-bold text-emerald-700">Δ 0.06%</span>
          </div>
        </div>
      );
    case "haul":
      return (
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">e-WAYBILL</span>
              <span className="font-mono text-[12px] text-slate-500">WB-2026-104882</span>
            </div>
            <Row l="Truck · Compartments" r="LSD 482 XY · 3" />
            <Row l="Gross / Tare" r="49.8 t / 15.2 t" />
            <Row l="Product · Volume" r="PMS · 45,000 L" />
            <Row l="Geofence" r="On route" tone="text-emerald-700" />
            <Row l="Seals" r="3/3 intact" tone="text-emerald-700" />
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
            <svg viewBox="0 0 21 21" className="h-24 w-24" shapeRendering="crispEdges">
              {Array.from({ length: 21 * 21 }).map((_, i) => {
                const x = i % 21;
                const y = Math.floor(i / 21);
                const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
                const fOn = finder && ((x % 14 === 0 || x % 14 === 6 || y % 14 === 0 || y % 14 === 6) || ((x % 14) > 1 && (x % 14) < 5 && (y % 14) > 1 && (y % 14) < 5));
                const on = finder ? fOn : ((x * 7 + y * 13 + x * y) % 5) < 2;
                return on ? <rect key={i} x={x} y={y} width="1" height="1" fill="#0f172a" /> : null;
              })}
            </svg>
            <p className="mt-1 text-[9px] font-bold text-slate-900">SIGNED · SHA-256</p>
          </div>
        </div>
      );
    case "epc":
      return (
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <Ring pct={0.82} label="NCFCC ready" />
          <div className="w-full flex-1 space-y-2">
            {[
              ["NCDF remittance evidence", true],
              ["Audited accounts uploaded", true],
              ["Nigerian Content plan", true],
              ["NOGIC-JQS profile current", false],
              ["NCEC for Crane CR-02", false],
            ].map(([t, ok]) => (
              <div key={t as string} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] shadow-xs">
                <span className={`grid h-5 w-5 place-items-center rounded-md text-[10px] font-bold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {ok ? "✓" : "!"}
                </span>
                <span className={ok ? "text-slate-600" : "font-semibold text-slate-900"}>{t as string}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "safe":
      return (
        <div className="space-y-2">
          {[
            { n: "A. Bello", c: "BOSIET", d: "212 days", s: "ok" },
            { n: "C. Eze", c: "HUET", d: "41 days", s: "ok" },
            { n: "E. Okon", c: "OSP", d: "Expired 2 d", s: "crit" },
            { n: "F. Adeyemi", c: "BOSIET", d: "19 days", s: "warn" },
          ].map((p) => (
            <div key={p.n} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-800">
                {p.n.split(" ").map((x) => x[0]).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-slate-900">{p.n}</p>
                <p className="text-[11px] text-slate-500">
                  {p.c} · {p.d}
                </p>
              </div>
              <span
                className={`rounded-md px-2.5 py-1 text-[10.5px] font-bold ${
                  p.s === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : p.s === "warn" ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {p.s === "ok" ? "Cleared" : p.s === "warn" ? "Blocked · <30d" : "Blocked"}
              </span>
            </div>
          ))}
        </div>
      );
    case "stores":
      return (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Refrigerant cylinders on hand</p>
          <div className="mt-4 grid grid-cols-6 gap-2">
            {[
              ["R404", 0.8],
              ["R22", 0.35],
              ["R407", 0.6],
              ["R134a", 0.9],
              ["R407C", 0.5],
              ["R410A", 0.2],
            ].map(([g, v], i) => (
              <div key={g as string} className="text-center">
                <div className="relative mx-auto h-24 w-9 overflow-hidden rounded-t-full rounded-b-lg border border-slate-200 bg-slate-50">
                  <div
                    className={`bar-anim absolute inset-x-0 bottom-0 ${(v as number) < 0.3 ? "bg-rose-500" : "bg-gradient-to-t from-emerald-600 to-emerald-400"}`}
                    style={{ height: `${(v as number) * 100}%`, animationDelay: `${i * 0.07}s` }}
                  />
                </div>
                <p className="mt-1.5 font-mono text-[10.5px] font-bold text-slate-900">{g as string}</p>
              </div>
            ))}
          </div>
          <Row l="Lube: Total Rubia TIR 7400 · 209 L" r="24 drums" />
          <Row l="Medical stores expiring · 60d" r="7 items" tone="text-amber-800" />
        </div>
      );
    case "tank":
      return (
        <div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-bold uppercase tracking-wider text-slate-500">Job TW-221 · Tank 7 recoat</span>
            <span className="font-mono font-bold text-emerald-800">₦18.4M / ₦21.0M</span>
          </div>
          <div className="mt-4 space-y-3">
            {[
              ["Evacuation", 1],
              ["Cleaning", 1],
              ["Blasting", 0.72],
              ["Recoating", 0.18],
            ].map(([s, v], i) => (
              <div key={s as string}>
                <div className="flex justify-between text-[12px]">
                  <span className="text-slate-700">{s as string}</span>
                  <span className="font-mono text-slate-500">{Math.round((v as number) * 100)}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="bar-anim-x h-full rounded-full bg-emerald-600" style={{ width: `${(v as number) * 100}%`, animationDelay: `${i * 0.1}s` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
              <p className="text-slate-500">DFT avg.</p>
              <p className="font-mono font-bold text-slate-900">312 µm</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
              <p className="text-slate-500">Confined-space PTW</p>
              <p className="font-bold text-emerald-700">Linked · valid</p>
            </div>
          </div>
        </div>
      );
    case "shield":
      return (
        <div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-slate-500">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
            {Array.from({ length: 28 }).map((_, i) => {
              const hit = { 3: "bg-emerald-600 text-white", 9: "bg-sky-600 text-white", 16: "bg-rose-600 text-white", 22: "bg-emerald-600 text-white", 25: "bg-sky-600 text-white" }[i];
              return (
                <span key={i} className={`grid aspect-square place-items-center rounded-lg text-[11px] font-semibold ${hit ?? "border border-slate-100 bg-slate-50 text-slate-600"}`}>
                  {i + 1}
                </span>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["90 d", "60 d", "30 d", "7 d"].map((t, i) => (
              <span key={t} className={`rounded-md px-2.5 py-1 text-[10.5px] font-bold ${i === 3 ? "border border-rose-200 bg-rose-50 text-rose-800" : "border border-slate-200 bg-slate-50 text-slate-700"}`}>
                Alert · {t}
              </span>
            ))}
          </div>
        </div>
      );
    case "billing":
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-extrabold text-slate-900">INVOICE INV-2026-0418</p>
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Paystack verified</span>
          </div>
          <div className="mt-3 space-y-1.5 text-[12px]">
            <div className="flex justify-between"><span className="text-slate-500">IPC 3 · Pipeline rehab</span><span className="font-mono font-semibold text-slate-900">$48,200.00</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Rate snapshot · 10 Oct</span><span className="font-mono text-slate-700">₦1,512.40 / $</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold"><span>Total NGN</span><span className="font-mono text-slate-950">₦72,897,680</span></div>
          </div>
          <div className="mt-3 flex gap-1.5">
            {["0–30", "31–60", "61–90", "90+"].map((b, i) => (
              <div key={b} className="flex-1 rounded-lg border border-slate-100 bg-slate-50 p-1.5 text-center">
                <p className="text-[9px] text-slate-500">{b} d</p>
                <p className="text-[11px] font-bold text-slate-900">{["$212k", "$64k", "$18k", "$4k"][i]}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "portal":
      return (
        <div className="space-y-2">
          {[
            ["e-BDN · MV Atlantic Grace", "Signed · 2 parties", Icon.FileText],
            ["POD · WB-2026-104882", "Buyer e-signature", Icon.Pen],
            ["Hydrotest certificate · TL-04", "API 1110", Icon.Gauge],
            ["MPI report · Weld W-2231", "NDT", Icon.Eye],
          ].map(([t, s, I], i) => {
            const C = I as ComponentType<{ size?: number }>;
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                  <C size={17} />
                </span>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-slate-900">{t as string}</p>
                  <p className="text-[11px] text-slate-500">{s as string}</p>
                </div>
                <Icon.Eye size={16} className="text-slate-400" />
              </div>
            );
          })}
        </div>
      );
    case "offshore":
      return (
        <div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-bold uppercase tracking-wider text-slate-500">VOY-0611 · Onne → Bonga → Agbami</span>
            <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 font-bold text-sky-800">Sailing 18:00</span>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
            {Array.from({ length: 24 }).map((_, i) => {
              const dg = i === 9 || i === 10;
              const empty = i > 20;
              return (
                <span
                  key={i}
                  className={`rise h-6 rounded-md ${dg ? "bg-rose-400" : empty ? "border border-dashed border-slate-300" : i % 3 === 0 ? "bg-sky-500" : "bg-emerald-500"}`}
                  style={{ animationDelay: `${i * 0.02}s`, opacity: empty ? 1 : 0.85 }}
                />
              );
            })}
          </div>
          <Row l="Lifts tagged & weighed" r="46 / 46" tone="text-emerald-700" />
          <Row l="Deck used" r="612 m² · 87%" />
          <Row l="DG check" r="Class 8 beside 5.1" tone="text-rose-600" />
          <Row l="Backload due" r="18 CCUs" />
        </div>
      );
    case "rigsupply":
      return (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Rig Okoro-2 · days of supply</p>
          <div className="mt-3 space-y-2.5">
            {[
              ["Diesel (MGO)", 0.78, "9.1 d", "bg-emerald-500"],
              ["Drill water", 0.22, "2.5 d", "bg-rose-500"],
              ["Potable water", 0.61, "6.8 d", "bg-emerald-500"],
              ["Liquid mud 1.45 SG", 0.44, "4.0 d", "bg-amber-400"],
              ["Cement (Class G)", 0.7, "8.2 d", "bg-emerald-500"],
            ].map(([l, v, d, c]) => (
              <div key={l as string}>
                <div className="flex justify-between text-[12px]">
                  <span className="text-slate-600">{l as string}</span>
                  <span className="font-mono font-semibold text-slate-900">{d as string}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className={`bar-anim h-full rounded-full ${c as string}`} style={{ width: `${(v as number) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] shadow-xs">
            <span className="text-slate-600">Last transfer · vessel vs. rig</span>
            <span className="font-mono font-bold text-emerald-700">Δ 0.18%</span>
          </div>
        </div>
      );
    case "crew":
      return (
        <div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-bold uppercase tracking-wider text-slate-500">FLT-1184 · AW139 · PHC → Bonga</span>
            <span className="font-mono font-bold text-slate-900">1,268 kg</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className={`rise grid h-9 place-items-center rounded-lg text-[10.5px] font-bold ${i === 7 ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-800"}`}
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                {i === 7 ? "HUET ✕" : `${String.fromCharCode(65 + Math.floor(i / 4))}${(i % 4) + 1}`}
              </span>
            ))}
          </div>
          <Row l="Credentials checked" r="11 cleared · 1 blocked" />
          <Row l="Standby list" r="1 seat filled" tone="text-emerald-700" />
          <Row l="Bonga POB after flight" r="94 / 100 beds" />
        </div>
      );
    case "vessel":
      return (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Fleet · on-hire this month</p>
          <div className="mt-3 space-y-2">
            {[
              ["AHTS Niger Titan", "On-hire", "ok"],
              ["PSV Atlantic Grace", "On-hire", "ok"],
              ["PSV Delta Star", "Off-hire · engine", "crit"],
              ["Crew boat Swift Runner", "Cabotage 41 d", "warn"],
            ].map(([v, s, t]) => (
              <div key={v} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] shadow-xs">
                <span className="font-semibold text-slate-900">{v}</span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${t === "ok" ? "bg-emerald-50 text-emerald-800" : t === "crit" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>{s}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <p className="mb-2 text-[11px] text-slate-500">Chargeable days · last 14</p>
            <Bars seed={73} />
          </div>
        </div>
      );
    case "equip":
      return (
        <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
          <div className="mx-auto">
            <Ring pct={0.86} label="Certs valid" />
          </div>
          <div>
            <Row l="Assets tracked" r="2,640" />
            <Row l="Offshore now" r="784" />
            <Row l="Sling LS-2231" r="Expires 6 d" tone="text-amber-700" />
            <Row l="Idle rental · 30 d" r="$61,000" tone="text-rose-600" />
            <Row l="CCU OC-0142" r="Passed" tone="text-emerald-700" />
          </div>
        </div>
      );
    case "guard":
      return (
        <div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-bold uppercase tracking-wider text-slate-500">VRA-0208 · Onne → Bonny terminal</span>
            <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-bold text-rose-700">High risk</span>
          </div>
          <svg viewBox="0 0 300 110" className="mt-3 h-32 w-full rounded-xl border border-slate-200 bg-sky-50/60">
            <path d="M0,20 C60,30 80,10 140,18 S240,8 300,16 L300,0 L0,0 Z" fill="#cbd5e1" />
            <circle cx="150" cy="58" r="22" fill="#fecaca" opacity="0.7" />
            <circle cx="220" cy="78" r="14" fill="#fde68a" opacity="0.8" />
            <path d="M30,30 C90,50 140,70 270,92" pathLength={1} className="draw-line" stroke="#0369a1" strokeWidth="2.4" fill="none" />
            <circle cx="30" cy="30" r="4" fill="#0369a1" />
            <circle cx="270" cy="92" r="4" fill="#059669" />
          </svg>
          <Row l="Escort" r="Booked · RV 17:30" tone="text-emerald-700" />
          <Row l="BMP West Africa checklist" r="12 / 12" tone="text-emerald-700" />
          <Row l="MDAT-GoG reports" r="Initial ✓ · Daily ✓" />
        </div>
      );
    case "enviro":
      return (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Waste chain of custody · WTN-0644</p>
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            {[
              ["Platform", "✓"],
              ["Vessel", "✓"],
              ["Base", "✓"],
              ["Disposal", "✓"],
            ].map(([a, b], i) => (
              <div key={a} className="rise rounded-xl border border-emerald-200 bg-emerald-50 py-2" style={{ animationDelay: `${i * 0.08}s` }}>
                <p className="text-[13px] font-bold text-emerald-700">{b}</p>
                <p className="text-[10.5px] font-semibold text-emerald-900">{a}</p>
              </div>
            ))}
          </div>
          <Row l="Drill cuttings" r="36.4 t · 12 skips" />
          <Row l="Garbage record book" r="Up to date" tone="text-emerald-700" />
          <Row l="Fleet CO₂ year to date" r="4,210 t" />
          <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <Bars seed={88} n={12} tone="bg-sky-500" />
          </div>
        </div>
      );
    case "owner":
      return (
        <div className="grid grid-cols-2 gap-2.5">
          {[
            ["Turnaround", "6.4 h", "−11%"],
            ["Shrinkage", "0.18%", "Below 0.5%"],
            ["Reconciled", "98.2%", "Today"],
            ["Cert. risk", "17", "Next 30 d"],
          ].map(([a, b, c]) => (
            <div key={a} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <p className="text-[11.5px] text-slate-500">{a}</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{b}</p>
              <p className="text-[10.5px] font-semibold text-emerald-700">{c}</p>
            </div>
          ))}
          <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <Bars seed={51} n={20} />
          </div>
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */

const featured = new Set([1, 4, 6, 13]);

function ModuleModal({ m, onClose, onStep }: { m: Module; onClose: () => void; onStep: (d: number) => void }) {
  const MI = m.icon;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onStep(1);
      if (e.key === "ArrowLeft") onStep(-1);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, onStep]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={m.name}>
      <button type="button" aria-label="Close" onClick={onClose} className="fade-in absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div key={m.n} className="modal-in relative max-h-[88vh] w-full max-w-[880px] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7">
        <div className="relative flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/80">
            <MI size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Module {String(m.n).padStart(2, "0")} · {m.group}
            </p>
            <h3 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-slate-900">{m.name}{m.isNew && <NewBadge size="md" />}</h3>
            <p className="text-[13px] text-slate-500">{m.tag}</p>
          </div>
          <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 sm:block">
            {m.phase}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
          >
            <Icon.X size={16} />
          </button>
        </div>
        <p className="relative mt-4 text-[14px] leading-relaxed text-slate-600">{m.blurb}</p>

        <div className="relative mt-5 grid gap-5 md:grid-cols-[1fr_1fr]">
          <ul className="space-y-2">
            {m.features.map((f, i) => (
              <li key={f} className="rise flex gap-2.5 text-[13px] leading-relaxed text-slate-700" style={{ animationDelay: `${0.05 + i * 0.035}s` }}>
                <span className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Interactive preview
            </p>
            <PreviewBody kind={m.preview} />
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          {m.addon ? (
            <p className="inline-flex items-center gap-2 text-[12px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> {m.addon}
            </p>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onStep(-1)}
              aria-label="Previous module"
              className="grid h-9 w-9 rotate-180 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Icon.Chevron size={16} />
            </button>
            <button
              type="button"
              onClick={() => onStep(1)}
              aria-label="Next module"
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Icon.Chevron size={16} />
            </button>
            <a href="#contact" onClick={onClose} className="btn-green inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-[13px] font-semibold text-white">
              Pilot this module <Icon.Arrow size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Modules() {
  const [group, setGroup] = useState<(typeof groups)[number]>("All");
  const [open, setOpen] = useState<number | null>(null);
  const list = modules.filter((m) => group === "All" || (group === "New" ? m.isNew : m.group === group));
  const current = open === null ? null : modules.find((x) => x.n === open) ?? null;
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => {
    setOpen((n) => {
      if (n === null) return n;
      const idx = modules.findIndex((x) => x.n === n);
      return modules[(idx + d + modules.length) % modules.length].n;
    });
  }, []);

  return (
    <section id="modules" className="relative scroll-mt-24 px-5 py-24 sm:px-8 md:py-28 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="19 modules · one ledger"
            title={
              <>
                License what you run. <span className="text-gradient">Add the rest later.</span>
              </>
            }
            sub="From the supply base quay to the rig deck, the depot and the pipeline. Start with one module or run the full suite on one audit trail. Click any module to see live interactive controls."
          />
          <Reveal className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:justify-end lg:px-0">
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition ${
                  group === g
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                {g === "New" ? <NewBadge size="xs" /> : g}
                {g === "New" && <span className="font-mono text-[11px] opacity-70">{modules.filter((x) => x.isNew).length}</span>}
              </button>
            ))}
          </Reveal>
        </div>

        <div className="mt-10 grid grid-flow-dense gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((m, i) => {
            const I = m.icon;
            const big = featured.has(m.n);
            return (
              <Spotlight
                key={`${group}-${m.n}`}
                as="button"
                type="button"
                onClick={() => setOpen(m.n)}
                className={`rise group rounded-2xl border border-slate-200 bg-white text-left transition duration-300 hover:border-slate-300 hover:shadow-md ${
                  big ? "sm:col-span-2 lg:row-span-2" : ""
                }`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className={`flex h-full flex-col p-5 ${big ? "lg:p-6" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid shrink-0 place-items-center rounded-xl transition duration-300 ${
                        big ? "h-11 w-11 bg-emerald-50 text-emerald-800 border border-emerald-200/90" : "h-10 w-10 bg-slate-50 text-slate-700 border border-slate-200 group-hover:border-emerald-300 group-hover:bg-emerald-50 group-hover:text-emerald-800"
                      }`}
                    >
                      <I size={big ? 21 : 18} />
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{String(m.n).padStart(2, "0")}</span>
                    {m.isNew && <NewBadge size="xs" />}
                    <span
                      className={`ml-auto rounded-md px-2 py-0.5 text-[10.5px] font-bold ${
                        m.phase.startsWith("Phase 1")
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {m.phase.startsWith("Phase 1") ? "Pilot-ready" : m.phase}
                    </span>
                  </div>
                  <p className={`mt-4 font-bold text-slate-900 ${big ? "text-[20px]" : "text-[16px]"}`}>{m.name}</p>
                  <p className="text-[12.5px] text-slate-500">{m.tag}</p>
                  {big ? (
                    <>
                      <p className="mt-3 max-w-[48ch] text-[13.5px] leading-relaxed text-slate-600">{m.blurb}</p>
                      <div className="pointer-events-none relative mt-5 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-4 [mask-image:linear-gradient(180deg,#000_70%,transparent)]">
                        <div className="origin-top-left scale-[0.92]">
                          <PreviewBody kind={m.preview} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-600">{m.blurb}</p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-emerald-700 transition group-hover:gap-1.5 group-hover:text-emerald-800">
                    View details <Icon.Arrow size={13} />
                  </span>
                </div>
              </Spotlight>
            );
          })}
          {group === "All" && (
            <a
              href="#platform"
              className="rise group flex flex-col justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5 transition hover:border-emerald-500 hover:bg-emerald-50/20"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800">
                <Icon.Layers size={18} />
              </span>
              <div className="mt-6">
                <p className="text-[16px] font-bold text-slate-900">+ Core platform</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">Offline sync, audit log, vault, roles and dual ledgers, included in every tier.</p>
              </div>
            </a>
          )}
        </div>
      </div>

      {current && <ModuleModal m={current} onClose={close} onStep={step} />}
    </section>
  );
}
