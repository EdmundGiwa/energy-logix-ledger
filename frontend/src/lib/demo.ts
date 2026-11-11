/**
 * Book-a-Demo catalog and blueprint recommender.
 *
 * Option keys mirror `backend/demo_requests/catalog.py` (the API rejects unknown keys).
 * The recommender only suggests which modules to show on the call; it grants nothing.
 */
import { apiRequest } from "@/lib/api";

export type IconName =
  | "Ship" | "Pipe" | "Tank" | "Truck" | "Building" | "Shield" | "Package" | "Wrench" | "Calendar"
  | "Receipt" | "Globe" | "Chart" | "Cube" | "Barrel" | "Users" | "Anchor" | "QR" | "Satellite"
  | "Wind" | "Flame" | "Fuel" | "Layers" | "Gauge" | "Route";

type Option = { label: string; hint?: string; icon?: IconName };

export const SEGMENTS = {
  epc_contractor: { label: "EPC / EPCI contractor", hint: "Projects, fabrication, hook-up & commissioning", icon: "Building" },
  pipeline_facilities: { label: "Pipeline & facilities", hint: "Maintenance, integrity, NDT, tanks", icon: "Pipe" },
  bunkering_marketing: { label: "Bunkering & petroleum marketing", hint: "Marine fuel, trading, depots, retail", icon: "Fuel" },
  marine_offshore: { label: "Marine & offshore logistics", hint: "OSVs, supply base, crew boats, agency", icon: "Anchor" },
  haulage_depot: { label: "Haulage, depots & tank farms", hint: "Trucks, gantries, product loading", icon: "Truck" },
  oilfield_services: { label: "Integrated oilfield services", hint: "Several service lines under one roof", icon: "Layers" },
  refining_processing: { label: "Modular refining & processing", hint: "Refinery, gas processing, blending", icon: "Flame" },
  other: { label: "Something else", hint: "Power, renewables, consulting…", icon: "Globe" },
} satisfies Record<string, Option>;

export const OPERATIONS = {
  bunkering: { label: "Bunkering & marine fuel" },
  truck_haulage: { label: "Truck haulage" },
  depot_tank_farm: { label: "Depot / tank farm" },
  vessel_charter: { label: "Vessel charter & OSVs" },
  supply_base: { label: "Supply base & deck cargo" },
  crew_transfer: { label: "Crew transfer & POB" },
  epc_projects: { label: "EPC projects" },
  fabrication: { label: "Fabrication & installation" },
  pipeline_maintenance: { label: "Pipeline maintenance" },
  inspection_ndt: { label: "Inspection & NDT" },
  tank_cleaning: { label: "Tank cleaning & field services" },
  equipment_rental: { label: "Equipment rental" },
  refining: { label: "Refining & processing" },
  waste_environmental: { label: "Waste & environmental" },
  manpower_supply: { label: "Manpower supply" },
} satisfies Record<string, Option>;

export const PAIN_POINTS = {
  product_loss: { label: "Product loss or diversion" },
  slow_invoicing: { label: "Slow invoicing & IPC approvals" },
  permit_expiry: { label: "Permits & certificates expiring unnoticed" },
  paper_records: { label: "Paper waybills, BDNs & job sheets" },
  local_content: { label: "Local content reporting" },
  crew_certification: { label: "Crew certification & rotations" },
  client_visibility: { label: "Clients chasing status updates" },
  inventory_leakage: { label: "Stores & inventory leakage" },
  hse_incidents: { label: "HSE incidents & permit-to-work" },
  multi_currency: { label: "NGN / USD cash-flow visibility" },
  project_overruns: { label: "Project cost & schedule overruns" },
} satisfies Record<string, Option>;

export const COUNTRIES = {
  NG: { label: "Nigeria" },
  UG: { label: "Uganda" },
  GH: { label: "Ghana" },
  KE: { label: "Kenya" },
  TZ: { label: "Tanzania" },
  AO: { label: "Angola" },
  other: { label: "Other" },
} satisfies Record<string, Option>;

export const COMPANY_SIZES = {
  "1_25": { label: "1–25" },
  "26_100": { label: "26–100" },
  "101_300": { label: "101–300" },
  "301_1000": { label: "301–1,000" },
  "1000_plus": { label: "1,000+" },
} satisfies Record<string, Option>;

export const CURRENT_TOOLS = {
  paper_excel: { label: "Paper & Excel" },
  whatsapp_email: { label: "WhatsApp & email" },
  erp: { label: "An ERP (SAP, Sage, Odoo…)" },
  industry_software: { label: "Industry software" },
  mixed: { label: "A mix of these" },
} satisfies Record<string, Option>;

export const MEETING_FORMATS = {
  google_meet: { label: "Google Meet", icon: "Globe" },
  zoom: { label: "Zoom", icon: "Globe" },
  teams: { label: "Microsoft Teams", icon: "Globe" },
  whatsapp: { label: "WhatsApp call", icon: "Users" },
  phone: { label: "Phone call", icon: "Users" },
  on_site: { label: "On-site visit", icon: "Building" },
} satisfies Record<string, Option>;

export const MODULES = {
  bunkerflow: { label: "BunkerFlow", hint: "Nomination to dual-signed e-BDN", icon: "Ship" },
  haultrac: { label: "HaulTrac", hint: "e-Waybills, trips and product loss", icon: "Truck" },
  refinerylink: { label: "RefineryLink", hint: "Gantry, tank farm and depot stock", icon: "Tank" },
  tankworks: { label: "TankWorks", hint: "Tank cleaning, inspection and field jobs", icon: "Wrench" },
  pipeintegrity: { label: "PipeIntegrity", hint: "Inspections, hydrotests, CP and pigging", icon: "Pipe" },
  epclink: { label: "EPC-Link", hint: "Progress, IPCs, procurement, local content", icon: "Building" },
  safepass: { label: "SafePass", hint: "Permits-to-work, certifications, rotations", icon: "Shield" },
  marinestores: { label: "MarineStores", hint: "Spares, provisions and consumables", icon: "Package" },
  compliance_shield: { label: "Compliance Shield", hint: "Licences, permits and expiry calendar", icon: "Calendar" },
  billing: { label: "Billing & Commercial", hint: "Job costing to cash, NGN and USD", icon: "Receipt" },
  client_portal: { label: "Client Portal", hint: "Read-only view for your operators", icon: "Globe" },
  owner_dashboard: { label: "Owner Dashboard", hint: "Cross-business KPIs for the MD", icon: "Chart" },
  offshorelink: { label: "OffshoreLink", hint: "Supply base and deck cargo", icon: "Cube" },
  rigsupply: { label: "RigSupply", hint: "Offshore fuel, water and bulk", icon: "Barrel" },
  crewtransit: { label: "CrewTransit", hint: "Crew boats, helicopters and POB", icon: "Users" },
  vesselops: { label: "VesselOps", hint: "OSV charter and vessel compliance", icon: "Anchor" },
  equiptrack: { label: "EquipTrack", hint: "Rental equipment, CCUs, lifting gear", icon: "QR" },
  marineguard: { label: "MarineGuard", hint: "Maritime security and voyage risk", icon: "Satellite" },
  enviroledger: { label: "EnviroLedger", hint: "Waste, discharges and emissions", icon: "Wind" },
} satisfies Record<string, Option>;

export type SegmentKey = keyof typeof SEGMENTS;
export type OperationKey = keyof typeof OPERATIONS;
export type PainKey = keyof typeof PAIN_POINTS;
export type CountryKey = keyof typeof COUNTRIES;
export type SizeKey = keyof typeof COMPANY_SIZES;
export type ToolsKey = keyof typeof CURRENT_TOOLS;
export type MeetingKey = keyof typeof MEETING_FORMATS;
export type ModuleKey = keyof typeof MODULES;

export const isSegment = (value: unknown): value is SegmentKey =>
  typeof value === "string" && Object.hasOwn(SEGMENTS, value);

const SEGMENT_MODULES: Record<SegmentKey, ModuleKey[]> = {
  epc_contractor: ["epclink", "safepass", "billing", "compliance_shield"],
  pipeline_facilities: ["pipeintegrity", "safepass", "compliance_shield", "client_portal"],
  bunkering_marketing: ["bunkerflow", "refinerylink", "billing"],
  marine_offshore: ["vesselops", "marinestores", "offshorelink", "billing"],
  haulage_depot: ["haultrac", "refinerylink", "billing"],
  oilfield_services: ["owner_dashboard", "safepass", "billing"],
  refining_processing: ["refinerylink", "haultrac", "compliance_shield"],
  other: ["safepass", "compliance_shield", "billing"],
};

const OPERATION_MODULES: Record<OperationKey, ModuleKey[]> = {
  bunkering: ["bunkerflow"],
  truck_haulage: ["haultrac"],
  depot_tank_farm: ["refinerylink"],
  vessel_charter: ["vesselops"],
  supply_base: ["offshorelink"],
  crew_transfer: ["crewtransit"],
  epc_projects: ["epclink"],
  fabrication: ["epclink", "safepass"],
  pipeline_maintenance: ["pipeintegrity"],
  inspection_ndt: ["pipeintegrity", "client_portal"],
  tank_cleaning: ["tankworks"],
  equipment_rental: ["equiptrack"],
  refining: ["refinerylink"],
  waste_environmental: ["enviroledger"],
  manpower_supply: ["safepass"],
};

const PAIN_MODULES: Partial<Record<PainKey, ModuleKey[]>> = {
  slow_invoicing: ["billing"],
  multi_currency: ["billing"],
  permit_expiry: ["compliance_shield"],
  local_content: ["compliance_shield"],
  crew_certification: ["safepass"],
  hse_incidents: ["safepass"],
  client_visibility: ["client_portal"],
  inventory_leakage: ["marinestores"],
  project_overruns: ["epclink"],
};

export type Recommendation = { key: ModuleKey; reasons: string[] };

/** Ranked module suggestions with the reasons shown to the prospect. */
export function recommendModules(input: {
  segment: SegmentKey | null;
  operations: OperationKey[];
  painPoints: PainKey[];
  size: SizeKey | null;
}): Recommendation[] {
  const found = new Map<ModuleKey, Set<string>>();
  const add = (key: ModuleKey, reason: string) => {
    if (!found.has(key)) found.set(key, new Set());
    found.get(key)!.add(reason);
  };
  if (input.segment) {
    for (const key of SEGMENT_MODULES[input.segment]) add(key, `Core for ${SEGMENTS[input.segment].label.toLowerCase()}`);
  }
  for (const op of input.operations) for (const key of OPERATION_MODULES[op]) add(key, `You run ${OPERATIONS[op].label.toLowerCase()}`);
  for (const pain of input.painPoints) for (const key of PAIN_MODULES[pain] ?? []) add(key, `Fixes: ${PAIN_POINTS[pain].label.toLowerCase()}`);
  const bigEnough = input.size === "101_300" || input.size === "301_1000" || input.size === "1000_plus";
  if (bigEnough || input.operations.length >= 4) add("owner_dashboard", "Several service lines to oversee");

  return [...found.entries()]
    .map(([key, reasons]) => ({ key, reasons: [...reasons] }))
    .sort((a, b) => b.reasons.length - a.reasons.length);
}

// ── API ─────────────────────────────────────────────────────────────────────

export type Availability = { timezone: string; duration_minutes: number; slots: string[] };

export type DemoRequestPayload = {
  segment: SegmentKey;
  operations: OperationKey[];
  company_name: string;
  company_website: string;
  company_size: SizeKey;
  countries: CountryKey[];
  pain_points: PainKey[];
  interested_modules: ModuleKey[];
  current_tools: ToolsKey;
  full_name: string;
  work_email: string;
  phone: string;
  job_title: string;
  notes: string;
  scheduled_start: string;
  prospect_timezone: string;
  meeting_format: MeetingKey;
  on_site_location: string;
  consent_to_contact: boolean;
};

export type DemoReceipt = {
  reference: string;
  status: string;
  scheduled_start: string;
  duration_minutes: number;
  meeting_format: MeetingKey;
};

export const demoApi = {
  availability: () => apiRequest<Availability>("/demo-requests/availability/"),
  create: (payload: DemoRequestPayload) =>
    apiRequest<DemoReceipt>("/demo-requests/", { method: "POST", body: JSON.stringify(payload) }),
};

// ── Time helpers ────────────────────────────────────────────────────────────

export const TEAM_TIMEZONE = "Africa/Lagos";

export const COMMON_TIMEZONES = [
  { id: "Africa/Lagos", label: "Lagos (WAT)" },
  { id: "Africa/Kampala", label: "Kampala (EAT)" },
  { id: "Africa/Nairobi", label: "Nairobi (EAT)" },
  { id: "Africa/Accra", label: "Accra (GMT)" },
  { id: "Africa/Luanda", label: "Luanda (WAT)" },
  { id: "Europe/London", label: "London" },
  { id: "Asia/Dubai", label: "Dubai" },
  { id: "America/Chicago", label: "Houston (CT)" },
];

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || TEAM_TIMEZONE;
  } catch {
    return TEAM_TIMEZONE;
  }
}

/** YYYY-MM-DD of an instant in a given zone. */
export function dayKey(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatLongDate(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

/** Names buyers in our markets recognise; Intl falls back to "GMT+1"-style labels for these. */
const ZONE_NAMES: Record<string, string> = {
  "Africa/Lagos": "WAT",
  "Africa/Luanda": "WAT",
  "Africa/Douala": "WAT",
  "Africa/Kampala": "EAT",
  "Africa/Nairobi": "EAT",
  "Africa/Dar_es_Salaam": "EAT",
  "Africa/Accra": "GMT",
};

export function zoneAbbrev(iso: string, timeZone: string) {
  if (ZONE_NAMES[timeZone]) return ZONE_NAMES[timeZone];
  const part = new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "short" })
    .formatToParts(new Date(iso))
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}

/** RFC 5545 calendar file for the confirmed booking. */
export function buildIcs(receipt: DemoReceipt, companyName: string): string {
  const start = new Date(receipt.scheduled_start);
  const end = new Date(start.getTime() + receipt.duration_minutes * 60_000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escapeText = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Offshora//Book a Demo//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${receipt.reference}@ofshora.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(`Offshora demo · ${companyName}`)}`,
    `DESCRIPTION:${escapeText(`Tailored Offshora walkthrough. Reference ${receipt.reference}. Your meeting link follows by email.`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
