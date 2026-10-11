# PetroLedger Energy OS
## Product Specification v2.0

Expanded from PetroLogix Core (PRD-ENG-2026-EXP). Status: working draft. Pricing is a proposal and has not been validated with customers.

---

## 0. Brand

**Recommended name: PetroLedger**
Tagline: *Every litre, every line, on record.*

Why it fits: the product's core promise is an audit trail (fuel reconciliation, hydrotest records, PTW sign-offs, e-waybills), and "line" covers both pipelines and transit lines.

| Option | Reasoning | Risk |
|---|---|---|
| **PetroLedger** (recommended) | Audit trail + pipeline line | Common word in fintech; check trademarks |
| TankRoute | Clear for depot/haulage | Narrow, sounds like routing only |
| Corelink Energy | Good for enterprise | Generic, likely taken |
| PetroLogix Core | Already in your PDF | Name collision risk with existing firms |

**Before you commit to any name, check:** Nigerian CAC business name search, the Nigerian Trademarks Registry, WIPO Global Brand Database, domain availability (.com, .ng), and social handles. I could not verify trademark availability with the tools available here.

**Relationship to PetroLogix:** PetroLedger keeps the "Petro" family name from your PetroLogix PRD. PetroLogix Core can stay as the internal product code, or become the platform name under the PetroLedger brand. Check that "PetroLogix" itself is not already registered before using it publicly.

**Logo:** provided as `petroledger_logo.svg`. It follows the PetroLogix design system: Petro Navy (#0B1F33) for the tile and wordmark, Industrial Azure (#0284C7) for the pipeline elbow and the section-bar accent that matches the PDF headers, Canvas Slate (#F8FAFC) for the ledger lines, and Safety Amber (#D97706) for the single status dot. Wordmark is bold uppercase, matching the H1 style in the PDF.

**Design claims to correct:** the PDF says "WCAG 2.1 AA Certified" and "ISO 11064 Control Room Compliant." WCAG has no certification. ISO 11064 is a design standard, not a certificate. Use "designed to WCAG 2.1 AA" and "designed in line with ISO 11064." Overclaiming in a tender pack can cost you the bid.

---

## 1. What Changed From the PetroLogix PRD and Why

Research on Edflo Energy's public site and Dangote/Lagos e-call-up coverage surfaced these gaps.

**Missing service lines (from Edflo's published services):**
- Cathodic protection design, installation, maintenance, CIPS and DCVG surveys
- Asset integrity management and valve leak detection, maintenance and replacement
- Tank evacuation, cleaning, blasting and recoating
- Pipeline chemical cleaning and commissioning services
- In-line inspection and fabrication/repair (on-site and off-site)
- Marine lubricants (branded supply: Total, Shell, Mobil, Castrol, Oryx), fresh water
- Bonded stores/provisions, medical supplies, PPE, life-saving equipment
- Ship spares, deck and engine stores, charts and publications
- Refrigerant gases (R404, R22, R407, R134a, R407C, R410A)
- General procurement, and onshore/offshore petroleum product supply

**Missing or corrected items on the Dangote/Lagos side:**
- The e-call-up system is run by the **Lagos State Government** (Lekki-Epe corridor, via mycallup.com), not by Dangote. Your PDF calls it "Dangote e-callup." Pitch it as a *government-platform connector* and make sure you can actually get API access before promising it.
- The rollout has been contentious. Truck operators (NARTO) and marketers (IPMAN) suspended loading at Dangote over a ₦12,500-per-truck fee in June 2025, and proposed ₦2,500 instead. Check the current status before building around it.
- Reports describe five designated holding parks, RFID tagging for articulated trucks, and peak-hour truck bans (5–9am and 6–10pm). These are real product requirements: holding-park queue management, driver accreditation, RFID reads, and fee ledgers.

**Compliance corrections:**
- NCDMB operates its services electronically through the **NOGIC-JQS** portal. PetroLedger should **integrate with and export to** NOGIC-JQS, not replace it.
- NCDMB requires a valid **NCDF Compliance Certificate (NCFCC)** before it will issue NCEC equipment certificates and approvals. An NCFCC readiness checker is a strong entry feature because it solves an immediate pain point.
- NCDMB has also launched a digital training-provider certification (NCTRC, July 2026). Relevant if you add a training module later.

**Technical corrections to the PDF:**
- ASTM Table 54B handles volume correction to a reference temperature. Table 56 handles volume-to-mass (weight) conversion. Check the "vacuum vs. air" wording against the standard before quoting it to a client.
- ASME B31.8 covers gas transmission. For liquid pipelines, ASME B31.4 usually applies. Confirm which code governs each line before writing validation rules.

**Bunkering:** Singapore's MPA is moving to mandate electronic Bunker Delivery Notes (eBDN) and has whitelisted several eBDN providers. I found no published Nigerian mandate. Verify with NIMASA and the Nigeria Ports Authority before claiming a regulatory driver. Export-ready eBDN formats are still a strong differentiator for West African bunkering firms serving international vessels.

---

## 2. Competitive Landscape

| Competitor / Reference | What they do | Implication for PetroLedger |
|---|---|---|
| **Edflo Energy** (Lagos) | Pipeline services, pigging, NDT, cathodic protection, marine fuel/lube/provision supply across West African ports | Your first target and a model. Multi-service in one firm is the sales story. |
| **Lagos State e-Call-Up** (mycallup.com) | Government truck scheduling for Lekki-Epe / Dangote corridor | Integration opportunity; access and fee politics are a risk. |
| **ZeroNorth** | Digital eBDN, bunker procurement, emissions analytics | Global bunker suite. Strong on procurement, not built for Nigerian pipelines or haulage. |
| **StormGeo Bunker Management** | Bunker planning and procurement, eBDN integration | Global shipping-side tool. |
| **DNV Ofiniti FuelBoss** | Bunkering nomination-to-BDN, LNG and conventional | Strong in LNG and Singapore-whitelisted eBDN. Not local. |
| **Bunker Suite / Vertom / Bunkerlink** | eBDN platform trials (Rotterdam 2025) | Shows eBDN is moving into real operations. |
| **Vortex E-BDN** | Paper-to-digital BDN conversion | Low-cost reference point for eBDN pricing. |
| **Coretec** (Kenya) | Oil depot management: inventory, orders, safety, maintenance | Depot-side competitor. Lacks Nigerian content, haulage, and marine. |
| **SAP / Oracle / Odoo partners** in Nigeria and Gulf markets | Enterprise ERP with oil-and-gas modules | Large-client competitors. PetroLedger should connect to them, not compete head-on. |
| **Amaiden Energy** (Port Harcourt) | Established Nigerian oilfield services firm with in-house software roles | Shows large local firms build in-house. A white-label option appeals to them. |
| **Enertia** (Houston) | Upstream oil and gas SaaS | Upstream-focused. Not a direct competitor. |

**Positioning:** Global bunker tools cover one step well. Dangote-era logistics, NCDMB compliance, offline field work in Nigerian conditions, and multi-service contractor workflows are underserved. PetroLedger is one system for a firm that does all of these.

---

## 3. Product Modules

Modules are grouped by who buys them. A Starter customer may only license one or two.

### Core Platform (included in all tiers)
- Role-based access (MD, GM, dispatcher, barge master, technician, driver, compliance officer)
- Offline-first sync (SQLite on device, delta sync on reconnect)
- Immutable audit log (every edit, sign-off and deletion timestamped and user-attributed)
- Document vault (MTCs, NDT reports, certificates, insurance, NCEC, NCFCC, permits)
- Persistent status bar: cached record count, connection heartbeat, last sync time
- Bilingual UI (English first; Pidgin and French as later locale options)
- Naira and USD dual ledgers with rate snapshot per transaction

### Module 1: BunkerFlow (marine fuel and port services)
- Nomination intake, stem confirmation, price quote and invoice
- Tank sounding with ASTM 54B / 56 conversion, forward/aft soundings, trim and temperature correction
- e-BDN with flashpoint, viscosity, sulphur, water content, and dual signatures (Chief Engineer and supplier)
- Sample seal tracking and MARPOL Annex VI-linked records
- STS transfer ledger: mooring checklist, fender check, vapour balancing, pump-rate monitoring, JSA
- Port husbandry tracker: fresh water, lube oils, spares, provisions with delivery receipts
- Export: e-BDN in standard formats for international counterparties

### Module 2: PipeIntegrity (pipeline services and EPC support)
- Pigging run tracker (scraper, brush, gauging, intelligent MFL/UT): launcher pressure, tracking, transit velocity, receiver arrival, debris recovered
- Hydrotest engine: pressure vs. temperature curves, hold-period validation, pressure-drop alerts. Confirm code basis per line (B31.4 for liquid, B31.8 for gas, API 1110 for test procedure)
- NDT and corrosion registry: weld IDs, radiography, magnetic particle, wall thickness, remaining-life calculation
- Cathodic protection module: CIPS and DCVG survey logs, rectifier readings, anode records
- Valve leak detection and maintenance records
- Asset integrity dashboard with inspection due dates
- Chemical cleaning and commissioning packs
- Right-of-way surveillance log: encroachment, third-party tampering, valve station checks, geotagged photos
- Export to IOC audit formats (Shell, Chevron, NNPC/NPDC-style reports)

### Module 3: RefineryLink (gantry, tank farm and depot)
- Terminal offtake and truck appointment scheduling
- Lagos e-Call-Up connector (conditional on API access; see Section 5)
- Holding-park queue manager: check-in, RFID or QR read, slot assignment, driver accreditation
- Automated tank gauging import and ullage dips; GOV to NSV conversion at 15°C or 20°C
- Gantry meter ticket reconciliation with flowmeter batch controllers (AccuLoad, Smith Meter)
- Quality certificate linked to each batch (density, flash point, distillation, RON, sulphur ppm)
- Continuous depot reconciliation at every discharge, replacing month-end reconciliation

### Module 4: HaulTrac (bulk road haulage)
- Weighbridge tare and gross capture (digital weighbridge integration)
- Encrypted, tamper-evident e-Waybill with QR dispatch data
- Compartment valve and geofence monitoring via telematics
- Route deviation and unauthorized-stop alerts
- Customer discharge and proof of delivery: ullage, temperature, water-paste test, buyer e-signature
- Fleet compliance: vehicle papers, driver licences, tanker inspection and calibration certificates
- Fee and levy ledger (per-truck charges, holding-park fees), supporting disputes with evidence

### Module 5: EPC-Link (procurement, OCTG, local content)
- Material requisition and pipe yard control: heat numbers, MTCs, wall thickness, bay locations, QR tags
- NCDMB Nigerian Content spend engine (payroll, local fabrication, raw materials)
- NCDF Compliance Certificate (NCFCC) readiness checker and renewal alerts
- NOGIC-JQS export pack for registration, tender and M&E reporting
- NCEC (Nigerian Content Equipment Certificate) expiry and calibration tracker for cranes and test spreads
- Bid dossier export: NUPRC permits, NCDMB documents, PENCOM, ITF, NSITF
- Vendor prequalification workflow for IOC tenders

### Module 6: SafePass (HSE, permits and rotations)
- Offshore mobilization gate: BOSIET, HUET, OSP, STCW, medical fitness. Blocks manifest additions when credentials expire within 30 days.
- Digital Permit-to-Work: hot work, confined space, working at heights, excavation. Multi-level approvals.
- Gas test entry (H2S, LEL, O2) with interlocks that block permit issue on failed tests
- JSA and toolbox talk records
- Hazard observation and near-miss reporting (offline, photos, risk matrix)
- CAPA tracking to closure
- Rotation scheduler (14/14, 28/28) and standby vs. active day-rate ledger for payroll

### Module 7: MarineStores (ship spares, provisions and consumables)
- Catalogue for ship spares, PPE, safety equipment, life-saving equipment, deck and engine stores
- Branded lubricant catalogue with grade and pack-size lookup
- Bonded stores and provisions management
- Medical supplies with expiry tracking
- Charts and publications subscription tracking
- Refrigerant gas inventory (R404, R22, R407, R134a, R407C, R410A) with cylinder tracking and recovery logs

### Module 8: TankWorks (tank and field services)
- Job costing for tank evacuation, cleaning, blasting and recoating
- Confined-space entry linked to SafePass permits
- Sludge and waste disposal manifests
- Recoating inspection records (DFT readings, adhesion tests)
- Crew hours and equipment utilization per job

### Module 9: Compliance Shield (regulatory calendar)
- Single calendar for NCDMB, NUPRC, NMDPRA, NIMASA, NPA and ISO certificate renewals
- Automatic alerts at 90, 60, 30 and 7 days
- Audit pack generation per regulator or client
- Evidence trail for ISO 9001, 14001 and 45001 audits

### Module 10: Billing and Commercial
- Job costing across modules
- Interim payment certificates (IPC) for EPC contracts
- Invoices in NGN and USD with rate snapshot
- Payment links through local gateways (e.g. Paystack, Flutterwave)
- Customer statement and ageing reports

### Module 11: Client Portal (external)
- Read-only portal for IOCs, EPC clients and fleet customers
- Shared BDNs, PODs, test certificates, inspection reports
- Creates demand-side pull: clients see the product working and ask their vendors to use it

### Module 12: Owner Dashboard
- Live cross-module KPIs: turnaround time, shrinkage %, reconciliation status, certificate expiry risk, utilization
- Exception feed (variances over 0.5%, failed gas tests, expired credentials)

---

## 4. Platform and Architecture

Keep the PDF's architecture with these changes:
- **Field-first:** all field modules work offline and sync when connected. Conflict policy is last-write-wins for non-critical fields and manual merge for signed records.
- **Data protection:** Nigeria Data Protection Act 2023 applies to personal data (crew, drivers). Plan for a Data Protection Impact Assessment, data processing agreements, and in-country hosting option for clients who require it.
- **Security:** encryption at rest and in transit; signed records use cryptographic signatures; audit log is append-only.
- **Hardware:** Zebra and Honeywell scanner support, ATEX-rated phones where clients require it.
- **Design:** the PDF's industrial design system (navy, azure, amber, emerald, crimson, slate) and 48px touch targets stand. Drop the "certified" language.

---

## 5. Integrations

| Partner / System | Purpose | Status |
|---|---|---|
| Lagos e-Call-Up (mycallup.com) | Truck scheduling, RFID reads | Needs API access. Do not price until confirmed. |
| Dangote Refinery gantry | Loading orders, meter tickets | Commercial agreement needed. |
| NOGIC-JQS (NCDMB) | Registration, tenders, M&E | Export or upload. No public API assumed. |
| NCDMB NCFCC portal | Compliance certificate status | Manual check or export until API is confirmed. |
| Weighbridges | Tare and gross | Vendor-by-vendor. |
| Flowmeter controllers (AccuLoad, Smith Meter) | Gantry meter tickets | Vendor-specific adapters. |
| Telematics providers | Geofence, valve state | Partner-by-partner. |
| SAP, Oracle, Odoo, QuickBooks, Sage | Financial sync | Connector packs. |
| WhatsApp Business API | Crew expiry bot, alerts | Add-on. |
| Paystack / Flutterwave | Payments | Standard. |
| Zebra / Honeywell | Scanners | Hardware bundle. |

---

## 6. Compliance Matrix

| Regulator / Standard | Requirement | PetroLedger feature |
|---|---|---|
| NCDMB / NOGICD Act 2010 | Nigerian content spend, NCFCC, NCEC, JQS registration | EPC-Link, Compliance Shield |
| NUPRC | Permits, pipeline integrity | PipeIntegrity, Compliance Shield |
| NMDPRA | Wholesale metering, depot accuracy | RefineryLink |
| NIMASA | Cabotage, crew, vessel permits | SafePass, Compliance Shield |
| NPA (Nigerian Ports Authority) | Port operations | BunkerFlow |
| MARPOL Annex VI | Fuel quality records, BDN | BunkerFlow |
| ASTM D1250 (Tables 54/56) | Measurement conversion | BunkerFlow, RefineryLink |
| API MPMS | Measurement | RefineryLink |
| API 1110 / ASME B31.4 or B31.8 | Hydrotest | PipeIntegrity |
| ISO 9001 / 14001 / 45001 | Quality, environment, safety | Compliance Shield |
| ISO 13623 | Pipeline systems | PipeIntegrity |
| NDPA 2023 | Personal data | Core Platform |

---

## 7. Commercial Model and Pricing

All prices are proposals. NGN figures use the rates in the PRD (approximately ₦1,500 to ₦1,527 per USD). Reset NGN prices quarterly and state the rate in every quote.

### 7.1 Base Subscription Tiers (annual, prepaid)

| Tier | Scope | USD / yr | NGN / yr | Included |
|---|---|---|---|---|
| **Micro Haulage** (new) | Up to 10 trucks, 1 depot | $3,600 | ₦5,500,000 | HaulTrac lite, e-Waybill, 2 admin seats |
| **Starter** | Up to 35 crew, 2 vessels or 10 trucks | $9,500 | ₦14,500,000 | SafePass, field PTW, one of BunkerFlow or HaulTrac, 2 admin seats |
| **Growth** | Up to 120 crew, 6 vessels, 30 trucks, 2 yards | $22,500 | ₦34,000,000 | BunkerFlow, PipeIntegrity, HaulTrac, Compliance Shield, NCFCC checker, 8 admin seats |
| **Enterprise** | Up to 400 crew, 15 vessels, 100 trucks, unlimited yards | $48,000 | ₦72,000,000 | Full suite excluding whitelabel, RefineryLink, EPC-Link, client portal, API access, 24/7 account team |
| **Whitelabel / Single-tenant** | Dedicated cloud tenant, custom domain | From $75,000 | From ₦112,500,000 | Everything, custom branding, private DB, SAP/Oracle connectors |

The Micro Haulage tier is new. A $9,500 entry price locks out small haulers who are a large share of the market. Test it in pilots before you rely on it.

### 7.2 Add-On Modules (monthly)

| Add-on | USD / mo | NGN / mo | Notes |
|---|---|---|---|
| Lagos e-Call-Up connector | $500 | ₦750,000 | Only sell after API access is confirmed |
| Gantry / Dangote bridge | $500 | ₦750,000 | Commercial agreement required |
| Intelligent pigging ingestion | $750 | ₦1,125,000 | Carried over from PRD |
| WhatsApp crew expiry bot | $250 | ₦375,000 | Carried over from PRD |
| Cathodic protection and asset integrity | $400 | ₦600,000 | New |
| TankWorks (tank services job costing) | $350 | ₦525,000 | New |
| MarineStores (catalogue, bonded stores) | $300 | ₦450,000 | New |
| Refrigerant gas tracking | $150 | ₦225,000 | New |
| e-BDN export interoperability | $400 | ₦600,000 | New |
| NCFCC / NOGIC-JQS export pack | $250 | ₦375,000 | Free in Growth and above |
| Client Portal | $300 | ₦450,000 | Free in Enterprise |

### 7.3 One-Time Fees

| Item | USD | NGN | Notes |
|---|---|---|---|
| Starter setup | $4,000 | ₦6,000,000 | Onboarding, data migration |
| Growth setup | $8,000 | ₦12,000,000 | New |
| Enterprise setup | $12,000 – $20,000 | ₦18M – ₦30M | On-site training, weighbridge and gantry integration, letterhead templates |
| Whitelabel setup | $25,000 – $60,000 | ₦37.5M – ₦90M | Custom domain, branding, ERP connectors |
| Site integration (weighbridge or flowmeter) | $3,000 – $8,000 per site | ₦4.5M – ₦12M | Scope per site |
| Paid pilot (60 days) | $2,500 | ₦3,750,000 | Credited against first-year subscription if converted |
| Hardware (scanners, rugged tablets) | Cost + 15% | Cost + 15% | Pass-through |

### 7.4 Support and Services

| Service | USD / yr | NGN / yr |
|---|---|---|
| Standard support (business hours, 5 days) | Included | Included |
| Priority support (extended hours, 4-hour response) | $6,000 | ₦9,000,000 |
| 24/7 dedicated support | $18,000 | ₦27,000,000 |
| Additional training days | $800 / day | ₦1,200,000 / day |

### 7.5 Discounts and Terms
- Annual prepaid: standard price. Two-year prepaid: 8% off. Three-year: 12% off.
- Pilot credit: $2,500 credited on conversion within 60 days.
- Payment terms: 50% on signing, 50% at go-live for Growth and above. Annual prepaid for Starter.
- FX clause: NGN invoices re-priced if the reference rate moves more than 10% from the quote rate.

### 7.6 ROI Check Before You Pitch

The PRD's ROI claims are plausible but unverified. Test them before quoting them to a prospect. Worked example using assumptions you must replace with real figures:

- Shrinkage saving per bunker stem = stem volume (MT) × fuel price per MT × 0.5%
- Example: 1,000 MT stem at an assumed $600/MT = $600,000 per stem; 0.5% = $3,000 per stem; 10 stems per month = $30,000 per month, or $360,000 per year

Replace the assumed price per MT with the current benchmark before quoting. Use the same method for demurrage, lost tender and averted diversion claims. Prospects will check these.

---

## 8. Go-to-Market

**Target segments (in order):**
1. Multi-service contractors like Edflo Energy (pipeline + marine + procurement). Highest fit with the full suite.
2. Indigenous bulk haulage firms serving the Lekki-Epe corridor. Highest volume, most price-sensitive. Micro and Starter tiers.
3. Marine fuel and lube suppliers at Lagos, Port Harcourt, Onne and Warri. BunkerFlow-led.
4. Pipeline integrity and NDT contractors serving IOCs. PipeIntegrity plus NCDMB pack.
5. Depot operators and terminal owners. RefineryLink, later phase.

**Sales motion:**
- Lead with the pain point for each buyer. Ops GMs care about shrinkage and turnaround. MDs care about tender wins and NCDMB status. HSE managers care about permit compliance.
- Offer a 60-day paid pilot on one module. Measure a single KPI (shrinkage, TAT, reconciliation time) and report it back.
- Build a reference list from the pilot. IOC prequalification depends on references.

**Expected sales cycle:** IOC vendor prequalification can take 6–18 months. Indigenous haulage and marine buyers can decide in weeks. Plan cash flow accordingly.

**Contacts:** I have not identified decision-makers at any named company. Verify through LinkedIn, company announcements and industry events before outreach.

---

## 9. Risks and Open Questions

| Risk | Impact | Mitigation |
|---|---|---|
| No confirmed API access to Lagos e-Call-Up or Dangote | Core RefineryLink feature may not ship | Build the holding-park module standalone. Treat the connector as optional until access is confirmed. |
| Fee and levy disputes on the Lekki-Epe corridor | Customer suspensions and reputational risk | Keep the product neutral on fees. Do not endorse any levy. |
| Naira devaluation | Margin erosion on NGN pricing | Quarterly rate reset; FX clause; USD for large contracts. |
| Incumbent ERP vendors (SAP, Oracle, Odoo partners) | Large clients prefer existing ERP | Connector-first architecture. |
| Global eBDN vendors entering West Africa | Price pressure on BunkerFlow | Focus on local integration (haulage, pipeline, NCDMB). |
| Data protection (NDPA 2023) | Liability for crew and driver data | DPIA before launch; data processing agreements; in-country hosting option. |
| Overclaimed certifications or ROI | Lost bids, legal exposure | Remove "certified" claims; validate ROI with pilot data. |
| Offline sync conflicts on signed records | Dispute risk | Signed records are immutable after sign-off; corrections are new entries. |
| Founder-level domain gaps (pipeline, marine, haulage) | Product credibility | Hire or contract a domain advisor per module. |

**Open questions to answer before building:**
1. Do you have domain experts for pigging, bunkering and haulage on the team or as advisors?
2. What is your capital budget for MVP, and what is your timeline?
3. Which first customer will you pilot with, and what pilot KPI will you measure?
4. Will you host in Nigeria, in a foreign cloud region, or both?

---

## 10. Roadmap

**Phase 1 (MVP, 4–6 months):** Core platform (offline sync, audit log, vault), BunkerFlow (sounding and e-BDN), HaulTrac (e-Waybill and POD), SafePass (PTW and expiry gate). Pilot with 2–3 customers.

**Phase 2 (6–9 months):** PipeIntegrity (pigging, hydrotest, NDT, cathodic protection), EPC-Link (NCDMB pack, NCFCC checker), Compliance Shield, Client Portal.

**Phase 3 (9–15 months):** RefineryLink (gantry, ATG, e-Call-Up connector if access allowed), MarineStores, TankWorks, Billing, integrations (SAP, Oracle, Odoo).

**Phase 4 (15+ months):** Whitelabel deployments, eBDN export interoperability, owner analytics, multi-country (Ghana, Côte d'Ivoire, Cameroon).

---

## 11. Sources (accessed during research)

- Edflo Energy Services Limited, homepage and services page: https://edfloenergy.com/ and https://edfloenergy.com/services/
- Lagos e-Call-Up coverage (ICIR, Techpoint, Guardian Nigeria, Daily Trust, Shipping Position, SweetCrude Reports, 2024–2025)
- NCDMB digital platform announcements (Prime Business Africa, MSME Africa, Shipping Position, 2025–2026)
- Bunkering and eBDN: ZeroNorth, StormGeo, DNV Ofiniti FuelBoss, Manifold Times, Ship & Bunker, Bunker Suite (2024–2026)

Verify any claim from these sources before using it in a tender or sales document.
