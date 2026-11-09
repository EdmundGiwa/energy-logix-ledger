export type SlideVisualKind =
  | "hook"
  | "problem"
  | "platform"
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
  | "enviro"
  | "security"
  | "roi"
  | "cta";

export type AccentTone = "emerald" | "sky" | "teal" | "amber";

export interface PitchSlide {
  id: string;
  index: number;
  chapter: string;
  title: string;
  badge: string;
  moduleNumber?: number;
  eyebrow: string;
  headlineLead: string;
  headlineAccent: string;
  subtitle: string;
  painLabel: string;
  painStatement: string;
  impactStat: {
    value: string;
    label: string;
    sub: string;
  };
  features: string[];
  visual: SlideVisualKind;
  tone: AccentTone;
  bgImage: string;
  bgPosition: string;
  locationTag: string;
}

export const PITCH_SLIDES: PitchSlide[] = [
  {
    id: "01-hook",
    index: 0,
    chapter: "Intro",
    title: "Offshora Energy OS",
    badge: "www.ofshora.com",
    eyebrow: "Offshora Energy OS · www.ofshora.com",
    headlineLead: "Every hand-off,",
    headlineAccent: "on one sealed ledger.",
    subtitle:
      "The operating system built for offshore and onshore energy contractors—from the supply base quay and bunker barge to the rig deck, pipeline, tank farm, and haulage corridor.",
    painLabel: "Why contractors switch",
    painStatement:
      "One disputed bunker stem, missing waybill, or expired crew ticket can wipe out a month of margin—or disqualify an IOC tender.",
    impactStat: {
      value: "19",
      label: "Integrated modules",
      sub: "Offline-first · SHA-256 sealed · Dual ₦ / $",
    },
    features: [
      "Works 100% offline in the field on local SQLite, delta-syncing when VSAT or 4G returns",
      "Cryptographically sealed records across marine, offshore, pipeline, depot, and haulage",
      "Built-in NCDMB NCFCC readiness checks and NOGIC-JQS tender export packs",
      "Dual-currency NGN & USD commercial ledgers with locked FX rate snapshots",
    ],
    visual: "hook",
    tone: "emerald",
    bgImage: "/images/rig-aerial.jpg",
    bgPosition: "object-[48%_50%]",
    locationTag: "West African Offshore & Onshore Corridor",
  },
  {
    id: "02-problem",
    index: 1,
    chapter: "The Problem",
    title: "Why Contractors Bleed Margin",
    badge: "Industry Pain",
    eyebrow: "The Hidden Cost of Paper, Excel & WhatsApp",
    headlineLead: "Your records are scattered.",
    headlineAccent: "Your liability isn't.",
    subtitle:
      "Multi-service energy firms run bunkering on Monday, haulage on Tuesday, and pipeline or offshore supply all month—using disconnected clipboards, spreadsheets, and chat threads.",
    painLabel: "Where money disappears",
    painStatement:
      "Unreconciled 0.5%–1.5% fuel shrinkage, unbilled vessel & tool days, month-end depot surprises, and scrambled audit binders before every IOC bid.",
    impactStat: {
      value: "$360k+",
      label: "Annual stem exposure",
      sub: "Illustrative 0.5% variance across ten 1,000 MT stems/mo",
    },
    features: [
      "Paper BDNs & waybills get altered, soaked, or lost before invoicing",
      "WhatsApp approvals carry zero cryptographic or audit standing before an IOC",
      "Month-end depot reconciliation discovers shortages weeks too late to dispute",
      "Expired crew BOSIET or crane NCEC certificates trigger costly mobilization delays",
    ],
    visual: "problem",
    tone: "amber",
    bgImage: "/images/rig-dusk.jpg",
    bgPosition: "object-[58%_42%]",
    locationTag: "Field-to-Finance Gap Analysis",
  },
  {
    id: "03-platform",
    index: 2,
    chapter: "Core Platform",
    title: "Offline-First Field Architecture",
    badge: "Core OS",
    eyebrow: "Included in Every Offshora Subscription",
    headlineLead: "No offshore signal?",
    headlineAccent: "Zero data lost.",
    subtitle:
      "Engineered for offshore barges, remote pipeline right-of-ways, and tank farms where connectivity drops constantly.",
    painLabel: "Why cloud-only SaaS fails",
    painStatement:
      "Standard web apps freeze when VSAT drops on deck—forcing crews back to paper notes that never get typed in accurately.",
    impactStat: {
      value: "0 ms",
      label: "Offline capture lag",
      sub: "Local SQLite cache + automatic delta sync",
    },
    features: [
      "Offline-first capture with conflict-aware sync—signed records are never silently overwritten",
      "Append-only audit trail recording actor, tenant, timestamp, and SHA-256 proof",
      "Role-based access gating for MD, Ops GM, Dispatcher, Barge Master, Technician & Driver",
      "Designed for Zebra, Honeywell, and ATEX-rated handhelds with 48px gloved tap targets",
    ],
    visual: "platform",
    tone: "teal",
    bgImage: "/images/rig-vessel.jpg",
    bgPosition: "object-[50%_50%]",
    locationTag: "Barge · Jetty · Pipeline ROW · Depot",
  },
  {
    id: "04-bunkerflow",
    index: 3,
    chapter: "Module 01",
    moduleNumber: 1,
    title: "BunkerFlow — Marine Fuel & e-BDN",
    badge: "Pilot-ready",
    eyebrow: "Module 01 · Marine Fuel & Port Services",
    headlineLead: "Every bunker stem reconciled",
    headlineAccent: "before the barge casts off.",
    subtitle:
      "From stem nomination to tank soundings, ASTM D1250 volume/mass conversion, MARPOL sample seals, and dual-signed Electronic Bunker Delivery Notes.",
    painLabel: "Why marine suppliers need it",
    painStatement:
      "Manual temperature and trim math on a rolling deck leads to short-delivery claims, demurrage standoffs, and unpaid bunker invoices.",
    impactStat: {
      value: "0.18%",
      label: "Target stem variance",
      sub: "ASTM Table 54B & 56 automated on deck",
    },
    features: [
      "Nomination intake, stem confirmation, pricing quote, and commercial hand-off",
      "Fore/aft tank soundings with trim & temperature correction via ASTM Tables 54B / 56",
      "Dual-signed e-BDN (Chief Engineer + Supplier) logging flashpoint, viscosity, sulphur & water",
      "Tamper-evident MARPOL Annex VI sample seal tracking and STS transfer safety checklists",
    ],
    visual: "bunker",
    tone: "sky",
    bgImage: "/images/rig-vessel.jpg",
    bgPosition: "object-[62%_50%]",
    locationTag: "Lagos · Port Harcourt · Onne · Warri Anchorages",
  },
  {
    id: "05-pipeintegrity",
    index: 4,
    chapter: "Module 02",
    moduleNumber: 2,
    title: "PipeIntegrity — Pigging, Hydrotest & NDT",
    badge: "Pilot-ready",
    eyebrow: "Module 02 · Pipeline Services & Asset Integrity",
    headlineLead: "Every weld, pig run & test",
    headlineAccent: "audit-ready for IOCs.",
    subtitle:
      "Unifies pigging runs, zero-drop hydrotests, NDT weld registries, ASME B31G remaining-life math, and NACE SP0169 cathodic protection surveys.",
    painLabel: "Why pipeline EPCs need it",
    painStatement:
      "IOCs hold back milestone payments when hydrotest hold charts, weld radiographs, or CP survey logs are missing or inconsistent.",
    impactStat: {
      value: "0.0 bar",
      label: "Zero-drop gate",
      sub: "API 1110 · ASME B31.4 / B31.8 validation",
    },
    features: [
      "Pigging run lifecycle from launcher pressure and transit velocity to receiver debris weight",
      "Hydrotest pressure vs. temperature curve validation with hold-period completion gates",
      "NDT & corrosion registry with weld IDs, wall thickness, and ASME B31G remaining-life calc",
      "CIPS/DCVG cathodic protection logs, geotagged ROW surveillance & IOC dossier exports",
    ],
    visual: "pipe",
    tone: "emerald",
    bgImage: "/images/rig-aerial.jpg",
    bgPosition: "object-[38%_50%]",
    locationTag: "Trunklines · Flowlines · Export Pipelines",
  },
  {
    id: "06-refinerylink",
    index: 5,
    chapter: "Module 03",
    moduleNumber: 3,
    title: "RefineryLink — Gantry, Tank Farm & Depot",
    badge: "Pilot-ready",
    eyebrow: "Module 03 · Terminal Offtake & Custody Reconciliation",
    headlineLead: "Reconcile your depot",
    headlineAccent: "at every single discharge.",
    subtitle:
      "Connects tank gauging, GOV-to-NSV conversion, gantry batch tickets, batch quality certificates, and standalone holding-park queue control.",
    painLabel: "Why depot operators need it",
    painStatement:
      "Waiting until month-end to reconcile tank dips against gantry tickets hides meter drift, evaporation, and unauthorized product losses.",
    impactStat: {
      value: "<0.5%",
      label: "Variance threshold",
      sub: "Continuous ATG vs. gantry batch reconciliation",
    },
    features: [
      "Manual ullage & automated tank gauging (ATG) with GOV → NSV conversion at 15 °C or 20 °C",
      "AccuLoad & Smith Meter gantry ticket reconciliation with instant variance alerts",
      "Batch quality certificates verified against NMDPRA specifications (density, flashpoint, sulphur)",
      "Standalone RFID/QR holding-park queue manager, ready for Lagos State e-Call-Up when API access is confirmed",
    ],
    visual: "refinery",
    tone: "teal",
    bgImage: "/images/rig-dusk.jpg",
    bgPosition: "object-[45%_50%]",
    locationTag: "Tank Farms · Gantries · Lekki-Epe Holding Parks",
  },
  {
    id: "07-haultrac",
    index: 6,
    chapter: "Module 04",
    moduleNumber: 4,
    title: "HaulTrac — Bulk Road Haulage & e-Waybill",
    badge: "Pilot-ready",
    eyebrow: "Module 04 · Fleet Dispatch, Corridor Tracking & POD",
    headlineLead: "From weighbridge to buyer,",
    headlineAccent: "sealed on one e-Waybill.",
    subtitle:
      "Tracks every tanker from tare/gross weigh-in and compartment sealing through corridor geofences to buyer-signed Proof of Delivery.",
    painLabel: "Why haulage fleets need it",
    painStatement:
      "Transit diversion, broken seals, water contamination disputes, and undocumented corridor levies eat straight into per-trip profit.",
    impactStat: {
      value: "3 / 3",
      label: "Compartments sealed",
      sub: "QR dispatch + buyer e-signature at discharge",
    },
    features: [
      "Weighbridge tare & gross capture generating an encrypted, QR-verifiable digital e-Waybill",
      "Corridor geofence, unauthorized-stop alerts, and compartment valve state tracking",
      "Discharge POD capturing ullage, temperature, water-paste check, and buyer acknowledgement",
      "Per-trip fee & holding-park levy ledger with receipt evidence to settle disputes cleanly",
    ],
    visual: "haul",
    tone: "emerald",
    bgImage: "/images/rig-aerial.jpg",
    bgPosition: "object-[55%_45%]",
    locationTag: "Lekki-Epe · Warri · Port Harcourt · Northern Corridors",
  },
  {
    id: "08-epclink",
    index: 7,
    chapter: "Module 05",
    moduleNumber: 5,
    title: "EPC-Link — OCTG Yard & Nigerian Content",
    badge: "Pilot-ready",
    eyebrow: "Module 05 · Pipe Yard Control & NCDMB Readiness",
    headlineLead: "Win more IOC tenders with",
    headlineAccent: "instant NCDMB proof.",
    subtitle:
      "Links WBS material requisitions, QR-tagged pipe-yard heat numbers and MTCs directly to your Nigerian Content spend and NCFCC readiness.",
    painLabel: "Why EPC contractors need it",
    painStatement:
      "Missing Mill Test Certificates in the yard or an expired NCFCC blocks NCEC equipment approvals and disqualifies multi-million-dollar bids.",
    impactStat: {
      value: "1-Click",
      label: "NOGIC-JQS export",
      sub: "Live NCFCC gap checker + MTC 3.1 / 3.2 traceability",
    },
    features: [
      "Pipe-yard inventory by outer diameter, wall thickness, bay/rack, heat number & MTC 3.1/3.2",
      "WBS-coded material requisitions with version-locked approvals and automatic stock decrement",
      "Automated Nigerian Content spend engine across payroll, local fabrication & raw materials",
      "NCFCC readiness checker, NCEC crane/spread tracker, and NOGIC-JQS JSON bid dossier export",
    ],
    visual: "epc",
    tone: "sky",
    bgImage: "/images/rig-vessel.jpg",
    bgPosition: "object-[40%_55%]",
    locationTag: "Pipe Yards · Fabrication Bases · IOC Tenders",
  },
  {
    id: "09-safepass",
    index: 8,
    chapter: "Module 06",
    moduleNumber: 6,
    title: "SafePass — HSE, Permits & Mobilization Gate",
    badge: "Pilot-ready",
    eyebrow: "Module 06 · Workforce Credentials & Permit-to-Work",
    headlineLead: "No valid ticket, no boat.",
    headlineAccent: "No gas pass, no permit.",
    subtitle:
      "Hard-gates crew manifests against expiring safety tickets and interlocks high-risk Permits-to-Work with atmospheric gas test thresholds.",
    painLabel: "Why HSE & Ops leaders need it",
    painStatement:
      "Sending a technician to the heliport with an expired BOSIET—or issuing hot-work permits on paper without verified LEL/H₂S checks—risks lives and contracts.",
    impactStat: {
      value: "30-Day",
      label: "Expiry gate lock",
      sub: "BOSIET · HUET · OSP · STCW · Medical",
    },
    features: [
      "Automated mobilization gate blocking manifest additions when credentials expire within 30 days",
      "Digital Permit-to-Work (hot work, confined space, heights, excavation) with multi-tier sign-off",
      "H₂S, LEL, and O₂ gas-test interlocks that prevent permit activation on failed readings",
      "JSA, toolbox talks, CAPA closure tracking, and 14/14 or 28/28 crew rotation day-rate ledgers",
    ],
    visual: "safe",
    tone: "amber",
    bgImage: "/images/rig-dusk.jpg",
    bgPosition: "object-[60%_40%]",
    locationTag: "Heliports · Jetties · Offshore Platforms",
  },
  {
    id: "10-marinestores",
    index: 9,
    chapter: "Module 07",
    moduleNumber: 7,
    title: "MarineStores — Spares, Lubes & Refrigerants",
    badge: "Pilot-ready",
    eyebrow: "Module 07 · Ship Chandlery, Consumables & Bonded Stores",
    headlineLead: "Every drum, spare & cylinder",
    headlineAccent: "tracked onto the vessel.",
    subtitle:
      "Controls ship spares, branded marine lubricants, PPE, medical chests, bonded provisions, and MARPOL Annex VI refrigerant gas cylinders.",
    painLabel: "Why chandlers & fleets need it",
    painStatement:
      "Expired medical kits fail port state inspections, lube grades get mixed up, and untracked refrigerant cylinders breach MARPOL logs.",
    impactStat: {
      value: "6 Gases",
      label: "Cylinder custody",
      sub: "R404 · R22 · R407 · R134a · R407C · R410A",
    },
    features: [
      "Structured catalogue for engine/deck spares, PPE, life-saving appliances & bonded stores",
      "Branded marine lubricant lookup by viscosity grade, OEM spec, and drum/pack size",
      "Vessel medical supply expiry tracking and nautical chart/publication renewal alerts",
      "MARPOL Annex VI refrigerant cylinder serial tracking, charging logs & signed delivery receipts",
    ],
    visual: "stores",
    tone: "teal",
    bgImage: "/images/rig-vessel.jpg",
    bgPosition: "object-[52%_48%]",
    locationTag: "Bonded Warehouses · Supply Boats · Fleet Stores",
  },
  {
    id: "11-tankworks",
    index: 10,
    chapter: "Module 08",
    moduleNumber: 8,
    title: "TankWorks — Tank Cleaning, Blasting & Recoat",
    badge: "Pilot-ready",
    eyebrow: "Module 08 · Industrial Tank & Field Services",
    headlineLead: "Protect job margins and",
    headlineAccent: "confined-space safety.",
    subtitle:
      "Connects tank evacuation, SA 2.5 abrasive blasting, internal recoating QA, NESREA waste manifests, and live job costing.",
    painLabel: "Why tank contractors need it",
    painStatement:
      "Tank turnaround jobs overrun abrasive/paint budgets fast—while missing DFT coating proofs or waste manifests delay client sign-off.",
    impactStat: {
      value: "SA 2.5",
      label: "Blast & DFT QA",
      sub: "SSPC-PA 2 DFT + ASTM D4541 pull-off logs",
    },
    features: [
      "Confined-space entry hard-linked to SafePass permits and atmospheric gas clearance",
      "Hazardous sludge evacuation & NESREA chain-of-custody disposal manifest sign-offs",
      "Abrasive blasting, SSPC-PA 2 dry-film thickness (DFT) readings & adhesion test records",
      "Real-time crew man-hours, compressor/equipment utilization, and consumables costing",
    ],
    visual: "tank",
    tone: "emerald",
    bgImage: "/images/rig-dusk.jpg",
    bgPosition: "object-[42%_52%]",
    locationTag: "Storage Tank Farms · Terminals · Field Turnarounds",
  },
  {
    id: "12-complianceshield",
    index: 11,
    chapter: "Module 09",
    moduleNumber: 9,
    title: "Compliance Shield — Statutory & ISO Radar",
    badge: "Pilot-ready",
    eyebrow: "Module 09 · Multi-Regulator Expiry & Audit Engine",
    headlineLead: "Never lose a contract to",
    headlineAccent: "a surprise permit expiry.",
    subtitle:
      "Puts every statutory licence, vessel endorsement, tax clearance, and ISO non-conformance onto one automated countdown radar.",
    painLabel: "Why MDs & Compliance teams need it",
    painStatement:
      "Discovering an expired NUPRC, NIMASA, or NCDMB permit mid-tender—or scrambling days before an ISO surveillance audit—costs millions.",
    impactStat: {
      value: "90·60·30·7d",
      label: "Escalating alerts",
      sub: "NCDMB · NUPRC · NMDPRA · NIMASA · ISO",
    },
    features: [
      "Unified register across NCDMB, NUPRC, NMDPRA, NIMASA, Cabotage, FMEnv, NPA & FIRS",
      "Automated 90/60/30/7-day renewal alerts with critical stop-work risk indicators",
      "Application tracking numbers, submission history, and regulator verification sign-offs",
      "ISO 9001, 14001, 45001 & API Spec Q1/Q2 audit management with NCR closure evidence",
    ],
    visual: "shield",
    tone: "sky",
    bgImage: "/images/rig-aerial.jpg",
    bgPosition: "object-[60%_45%]",
    locationTag: "Corporate HQ · Compliance & Tender Desk",
  },
  {
    id: "13-billing",
    index: 12,
    chapter: "Module 10",
    moduleNumber: 10,
    title: "Billing & Commercial — Field Work to Cash",
    badge: "Pilot-ready",
    eyebrow: "Module 10 · Dual-Currency Invoicing, IPCs & Ageing",
    headlineLead: "Turn signed field tickets",
    headlineAccent: "into paid invoices faster.",
    subtitle:
      "Generates NGN and USD invoices and EPC Interim Payment Certificates directly from approved operational records—with zero FX ambiguity.",
    painLabel: "Why CFOs & Commercial leads need it",
    painStatement:
      "Re-keying field tickets into spreadsheets delays billing by weeks, while unrecorded Naira/USD exchange rates spark client payment disputes.",
    impactStat: {
      value: "₦ + $",
      label: "Minor-unit precision",
      sub: "Kobo/Cents ledger + locked FX snapshot",
    },
    features: [
      "Pulls approved billable items straight from BunkerFlow, HaulTrac, TankWorks & PipeIntegrity",
      "Commercial invoices with statutory 7.5% VAT, 5% WHT, and locked FX rate snapshots",
      "EPC Interim Payment Certificates (IPCs) with gross valuation, 5% retention & QS sign-off",
      "Real-time customer statements and 4-bucket AR ageing (0–30, 31–60, 61–90, >90 days)",
    ],
    visual: "billing",
    tone: "emerald",
    bgImage: "/images/rig-vessel.jpg",
    bgPosition: "object-[46%_52%]",
    locationTag: "Commercial & Finance Control",
  },
  {
    id: "14-clientportal",
    index: 13,
    chapter: "Module 11",
    moduleNumber: 11,
    title: "Client Portal — IOC & Buyer Verification",
    badge: "Pilot-ready",
    eyebrow: "Module 11 · External Read-Only Evidence Room",
    headlineLead: "Let your clients verify",
    headlineAccent: "every seal themselves.",
    subtitle:
      "Gives IOCs, EPC primes, and fleet buyers a tenant-isolated read-only portal to inspect approved BDNs, PODs, hydrotests, and invoices.",
    painLabel: "Why it wins repeat contracts",
    painStatement:
      "Clients hate chasing PDF attachments on email. Giving operators instant cryptographic proof builds trust that competitors can't match.",
    impactStat: {
      value: "SHA-256",
      label: "Live seal check",
      sub: "Zero access to drafts or internal notes",
    },
    features: [
      "Strict external customer boundary—clients see only approved records scoped to them",
      "Instant SHA-256 cryptographic seal verification on e-BDNs, PODs, and hydrotest certs",
      "Immutable external access log recording who viewed or downloaded each certificate",
      "Turns transparency into demand-side pull: operators ask their other vendors for Offshora",
    ],
    visual: "portal",
    tone: "teal",
    bgImage: "/images/rig-aerial.jpg",
    bgPosition: "object-[50%_40%]",
    locationTag: "IOC Operators · EPC Primes · Fleet Buyers",
  },
  {
    id: "15-ownerdashboard",
    index: 14,
    chapter: "Module 12",
    moduleNumber: 12,
    title: "Owner Dashboard — Executive Command View",
    badge: "Pilot-ready",
    eyebrow: "Module 12 · Live Cross-Module KPIs & Exception Feed",
    headlineLead: "Your entire operation",
    headlineAccent: "on one live screen.",
    subtitle:
      "Projects live turnaround time, shrinkage %, reconciliation rate, utilization, and statutory risk across every vessel, depot, and yard.",
    painLabel: "Why MDs & Board Directors need it",
    painStatement:
      "Waiting for Friday PowerPoint packs means you find out about a 0.9% stem variance, failed gas test, or expiring permit after the damage is done.",
    impactStat: {
      value: "98.2%",
      label: "Same-day reconciled",
      sub: "Live exception feed + sealed board exports",
    },
    features: [
      "Live KPIs across all modules filtered by site, date window, and NGN/USD currency",
      "Severity-ranked exception feed (>0.5% variance, failed gas tests, expiring credentials) with ack workflow",
      "One-click executive board briefs, variance ledgers, and SHA-256 sealed audit exports",
      "Control-room visual hierarchy aligned with ISO 11064 operator ergonomics",
    ],
    visual: "owner",
    tone: "emerald",
    bgImage: "/images/rig-dusk.jpg",
    bgPosition: "object-[50%_45%]",
    locationTag: "Managing Director & Control Room View",
  },
  {
    id: "16-offshorelink",
    index: 15,
    chapter: "Module 13",
    moduleNumber: 13,
    title: "OffshoreLink — Supply Base & PSV Deck Cargo",
    badge: "Offshore Suite",
    eyebrow: "Module 13 · Quayside Load-Out, CCUs & Backload",
    headlineLead: "Every crane lift to the rig,",
    headlineAccent: "and every CCU back ashore.",
    subtitle:
      "Plans multi-drop PSV voyages, deck stowage, QR/RFID lift manifests, DNV-ST-E271 aligned CCU checks, IMDG segregation, and backload.",
    painLabel: "Why supply bases & PSVs need it",
    painStatement:
      "Containers go missing offshore on daily rental, incompatible dangerous goods get stowed side-by-side, and backload skips arrive undocumented.",
    impactStat: {
      value: "46 / 46",
      label: "Lifts tagged & weighed",
      sub: "IMDG segregation + CCU cert lock before sailing",
    },
    features: [
      "Multi-drop PSV voyage & visual deck-load planner across rigs, FPSOs, and platforms",
      "CCU & lifting-set inspection check before load-out (aligned with DNV-ST-E271 / 2.7-1)",
      "IMDG dangerous goods segregation check that flags incompatible classes before stowage",
      "Backload reconciliation tracking returned CCUs, waste skips, and shared-voyage cost splits",
    ],
    visual: "offshore",
    tone: "sky",
    bgImage: "/images/rig-aerial.jpg",
    bgPosition: "object-[45%_50%]",
    locationTag: "Onne · Lekki · Warri Supply Bases → Offshore",
  },
  {
    id: "17-rigsupply",
    index: 16,
    chapter: "Module 14",
    moduleNumber: 14,
    title: "RigSupply — Offshore Fuel, Water, Mud & Bulk",
    badge: "Offshore Suite",
    eyebrow: "Module 14 · Below-Deck Liquid & Dry Bulk Transfers",
    headlineLead: "Vessel meter vs. rig tank,",
    headlineAccent: "reconciled to the litre.",
    subtitle:
      "Tracks MGO, drill water, potable water, liquid mud (OBM/WBM/SBM), brine, cement, barite, and bentonite—plus rig days-of-supply forecasts.",
    painLabel: "Why rig suppliers need it",
    painStatement:
      "Hose transfers offshore trigger constant disputes between PSV flowmeters and rig tank soundings—while running low on drill water halts drilling.",
    impactStat: {
      value: "Δ 0.18%",
      label: "Hose transfer check",
      sub: "Live rig days-of-supply forecast per product",
    },
    features: [
      "Delivery tickets for MGO/AGO, drill/potable water, brine, liquid mud & dry bulk tonnages",
      "Instant vessel meter vs. installation sounding reconciliation with variance alerts",
      "Sample seal logging and density @ 15 °C recorded on every offshore fuel transfer",
      "Rig tank inventory & days-of-supply countdown suggesting top-ups on planned PSV runs",
    ],
    visual: "rigsupply",
    tone: "teal",
    bgImage: "/images/rig-vessel.jpg",
    bgPosition: "object-[58%_50%]",
    locationTag: "PSV Bulk Tanks → Rig & FPSO Manifolds",
  },
  {
    id: "18-crewtransit",
    index: 17,
    chapter: "Module 15",
    moduleNumber: 15,
    title: "CrewTransit — Helicopters, Crew Boats & POB",
    badge: "Offshore Suite",
    eyebrow: "Module 15 · Aviation, Marine Transfers & Live Muster",
    headlineLead: "Every seat cleared,",
    headlineAccent: "every lifeboat count exact.",
    subtitle:
      "Manages helicopter and crew-boat manifests, passenger/baggage weights, weather rebookings, and live Personnel-on-Board (POB) limits.",
    painLabel: "Why offshore logistics teams need it",
    painStatement:
      "Weather cancellations scramble Excel flight lists in minutes, risking bed/lifeboat over-capacity or boarding someone with an expired HUET.",
    impactStat: {
      value: "94 / 100",
      label: "Live POB vs. beds",
      sub: "Auto-gated by SafePass BOSIET / HUET / Medical",
    },
    features: [
      "Helicopter & crew-boat seat allocation, standby lists, and check-in payload weights",
      "Automatic boarding block via SafePass if BOSIET, HUET, or medical fitness is expired",
      "Live POB per installation checked against bed and lifeboat capacity limits",
      "One-click weather rebooking and instant OIM emergency muster list export",
    ],
    visual: "crew",
    tone: "emerald",
    bgImage: "/images/rig-aerial.jpg",
    bgPosition: "object-[52%_48%]",
    locationTag: "Heliports · Crew Boat Jetties · Installations",
  },
  {
    id: "19-vesselops",
    index: 18,
    chapter: "Module 16",
    moduleNumber: 16,
    title: "VesselOps — OSV Charter, Fleet & Cabotage",
    badge: "Offshore Suite",
    eyebrow: "Module 16 · On-Hire Ledgers, DPRs & Vessel Compliance",
    headlineLead: "Back every charter day",
    headlineAccent: "with a dual-signed record.",
    subtitle:
      "Covers PSV, AHTS, crew boat, and tug charters—from on-hire/off-hire timestamps and daily DP/ROB reports to NIMASA cabotage and OVID close-out.",
    painLabel: "Why OSV owners need it",
    painStatement:
      "Charterers dispute chargeable days and fuel ROB when daily vessel reports and off-hire breakdown logs aren't signed contemporaneously.",
    impactStat: {
      value: "100%",
      label: "Signed hire events",
      sub: "Class · ISM/ISPS · P&I · Cabotage · OVID/CMID",
    },
    features: [
      "Charter party register capturing day rates, mob/demob fees, and bunker clauses",
      "Dual-signed on-hire / off-hire ledger with breakdown evidence and chargeable-day math",
      "Daily Vessel Report (DPR): 24h activity log, DP hours, position, fuel & water ROB",
      "Class, flag, P&I, NIMASA cabotage tracking, and OVID/CMID inspection finding close-out",
    ],
    visual: "vessel",
    tone: "sky",
    bgImage: "/images/rig-vessel.jpg",
    bgPosition: "object-[48%_46%]",
    locationTag: "PSV · AHTS · Crew Boat · Anchor Handling Fleets",
  },
  {
    id: "20-equiptrack",
    index: 19,
    chapter: "Module 17",
    moduleNumber: 17,
    title: "EquipTrack — Rentals, CCUs & Lifting Gear",
    badge: "Offshore Suite",
    eyebrow: "Module 17 · Asset Location, Sling Certs & Rental Burn",
    headlineLead: "Stop paying daily rent on",
    headlineAccent: "idle tools forgotten offshore.",
    subtitle:
      "Tracks every owned and rented CCU, chemical tank, sling, shackle, and downhole tool across base, vessel, and rig with a live rental day counter.",
    painLabel: "Why contractors & tool owners need it",
    painStatement:
      "Rented baskets and tools sit idle on rig decks for weeks racking up thousands in unbudgeted day-rates—or fail supplier invoice checks.",
    impactStat: {
      value: "$0",
      label: "Unverified rental days",
      sub: "QR/RFID location history + sling expiry lock",
    },
    features: [
      "Single QR/RFID register for owned & rented CCUs, tote tanks, slings, and specialist tools",
      "Periodic inspection & thorough lifting-gear examination dates blocking expired manifests",
      "Automatic on-rent / off-rent day counter with idle offshore cost-exposure alerts",
      "Reconciles third-party rental supplier invoices directly against tracked ashore dates",
    ],
    visual: "equip",
    tone: "amber",
    bgImage: "/images/rig-dusk.jpg",
    bgPosition: "object-[55%_50%]",
    locationTag: "Yards · Quaysides · Offshore Decks",
  },
  {
    id: "21-marineguard",
    index: 20,
    chapter: "Module 18",
    moduleNumber: 18,
    title: "MarineGuard — Gulf of Guinea Voyage Security",
    badge: "Offshore Suite",
    eyebrow: "Module 18 · Transit Risk, Escorts & MDAT-GoG Reporting",
    headlineLead: "Every transit assessed,",
    headlineAccent: "every AIS & MDAT log on file.",
    subtitle:
      "Structured voyage risk assessments, escort rendezvous plans, MDAT-GoG position reports, BMP West Africa checklists, and AIS status logs.",
    painLabel: "Why Gulf of Guinea fleets need it",
    painStatement:
      "Unlogged AIS state changes risk naval detention, while missed MDAT-GoG reports or undocumented citadel drills fail operator marine assurance.",
    impactStat: {
      value: "12 / 12",
      label: "BMP WA checklist",
      sub: "MDAT-GoG Initial · Daily · Final + AIS log",
    },
    features: [
      "Route, vessel, and time-of-day Voyage Risk Assessment (VRA) before departure",
      "Security escort coordination recording rendezvous coordinates, comms plan & cost",
      "MDAT-GoG initial, daily, and final report tracker plus citadel drill records",
      "Timestamped AIS status log with master's reason code and offline incident capture",
    ],
    visual: "guard",
    tone: "sky",
    bgImage: "/images/rig-vessel.jpg",
    bgPosition: "object-[36%_50%]",
    locationTag: "Gulf of Guinea Transit Corridors",
  },
  {
    id: "22-enviroledger",
    index: 21,
    chapter: "Module 19",
    moduleNumber: 19,
    title: "EnviroLedger — Offshore Waste, MARPOL & ESG",
    badge: "Offshore Suite",
    eyebrow: "Module 19 · Waste Chain of Custody & Voyage Emissions",
    headlineLead: "From rig skip to disposal,",
    headlineAccent: "zero custody gaps.",
    subtitle:
      "Closes the loop on drill cuttings, oily waste, MARPOL Annex I & V record books, spill readiness, and fuel-based CO₂ reporting for client ESG.",
    painLabel: "Why operators demand it",
    painStatement:
      "One missing waste disposal certificate exposes both contractor and IOC to regulatory fines—and operators now require per-voyage CO₂ metrics.",
    impactStat: {
      value: "4-Step",
      label: "Waste custody chain",
      sub: "Platform → Vessel → Base → Licensed Disposal",
    },
    features: [
      "Waste transfer notes tracking cuttings, slops, and scrap with custody-gap alerts",
      "Digital MARPOL Annex I Oil Record Book and Annex V Garbage Record Book entries",
      "Spill drill readiness logs and structured incident packs for NOSDRA workflows",
      "Fuel-based CO₂ calculations per vessel, voyage, and client ESG report (plus IMO DCS/CII where size applies)",
    ],
    visual: "enviro",
    tone: "emerald",
    bgImage: "/images/rig-aerial.jpg",
    bgPosition: "object-[42%_44%]",
    locationTag: "Offshore Installations → Licensed Treatment Facilities",
  },
  {
    id: "23-security",
    index: 22,
    chapter: "Trust & Compliance",
    title: "IOC-Grade Security & Multi-Regulator Mapping",
    badge: "Defense in Depth",
    eyebrow: "Built for Enterprise Audits & Data Sovereignty",
    headlineLead: "Evidence you can put",
    headlineAccent: "before any IOC auditor.",
    subtitle:
      "Multi-tenant isolation, cryptographic record sealing, NDPA 2023 privacy governance, and connector-first ERP coexistence.",
    painLabel: "Why IT & Legal approve Offshora",
    painStatement:
      "Offshora doesn't ask large contractors to rip out SAP, Oracle, or Odoo—it seals field truth and syncs clean financial & compliance packs.",
    impactStat: {
      value: "AES-256",
      label: "+ TLS 1.3 & RLS",
      sub: "Strict tenant isolation · Append-only history",
    },
    features: [
      "PostgreSQL row-level tenant isolation, server-enforced RBAC, and non-repudiable SHA-256 seals",
      "Mapped to NCDMB, NUPRC, NMDPRA, NIMASA, NPA, MARPOL VI, ASTM D1250 & API 1110",
      "NDPA 2023 personal-data governance with flexible cloud or in-country hosting options",
      "Interface designed to WCAG 2.1 AA and aligned with ISO 11064 control-room ergonomics",
    ],
    visual: "security",
    tone: "teal",
    bgImage: "/images/rig-dusk.jpg",
    bgPosition: "object-[50%_50%]",
    locationTag: "Enterprise Security · ERP Connectors · Regulator Ready",
  },
  {
    id: "24-roi",
    index: 23,
    chapter: "ROI & Pricing",
    title: "Pays for Itself on Your First Stems",
    badge: "Transparent Tiers",
    eyebrow: "Interactive ROI & Modular Annual Licensing",
    headlineLead: "Start with 10 trucks.",
    headlineAccent: "Scale to a private cloud.",
    subtitle:
      "Recovering just 0.5% variance on marine fuel or haulage trips can dwarf your annual software license—with transparent USD and NGN pricing.",
    painLabel: "Commercial flexibility",
    painStatement:
      "License only the operational modules you run today—from Micro Haulage ($3,600/yr) and Starter ($9,500/yr) up to Enterprise & Single-Tenant Whitelabel.",
    impactStat: {
      value: "10×+",
      label: "Illustrative ROI",
      sub: "Validated on your own fleet in a 60-day pilot",
    },
    features: [
      "Micro Haulage ($3.6k / ₦5.5M) · Starter ($9.5k / ₦14.5M) · Growth ($22.5k / ₦34M)",
      "Enterprise ($48k / ₦72M) & Single-Tenant Whitelabel (from $75k / ₦112.5M)",
      "NGN quotes state the locked reference FX rate upfront—zero hidden currency surprises",
      "8% discount on 2-year terms and 12% discount on 3-year prepaid agreements",
    ],
    visual: "roi",
    tone: "emerald",
    bgImage: "/images/rig-aerial.jpg",
    bgPosition: "object-[56%_50%]",
    locationTag: "Indicative Proposal Pricing · USD & NGN",
  },
  {
    id: "25-cta",
    index: 24,
    chapter: "Start Now",
    title: "Launch Your 60-Day Paid Pilot",
    badge: "www.ofshora.com",
    eyebrow: "Zero Guesswork · Audited Field Proof",
    headlineLead: "Pick one module.",
    headlineAccent: "Prove the ROI in 60 days.",
    subtitle:
      "Deploy BunkerFlow, HaulTrac, SafePass, or any Pilot-ready module on your live vessels, trucks, or lines—with 100% of the pilot fee credited when you convert.",
    painLabel: "How we start together",
    painStatement:
      "Agree one measurable KPI upfront—shrinkage %, turnaround time, reconciliation speed, or permit compliance—and review audited results at Day 60.",
    impactStat: {
      value: "$2,500",
      label: "60-Day Pilot (₦3.75M)",
      sub: "100% credited toward Year-1 subscription",
    },
    features: [
      "Step 1 — Visit www.ofshora.com and select your highest-urgency operational module",
      "Step 2 — We onboard your fleet, tanks, or crew roster and configure your target KPI",
      "Step 3 — Your field teams run offline & online for 60 days with dedicated onboarding support",
      "Step 4 — Receive a SHA-256 sealed executive ROI report and credit the fee to your annual plan",
    ],
    visual: "cta",
    tone: "emerald",
    bgImage: "/images/rig-dusk.jpg",
    bgPosition: "object-[65%_40%]",
    locationTag: "Lagos · Port Harcourt · Warri · Onne · www.ofshora.com",
  },
];

