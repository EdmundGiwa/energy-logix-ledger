# Offshore Expansion: Research and Feature Map

Status: front-end only (mock data). Backend, APIs and data models still need building. Last updated 21 Oct 2026.

## 1. Why offshore

Rigs, FPSOs and platforms cannot run without a steady flow of supplies from shore. One platform supply vessel (PSV) run usually carries:

- **Deck cargo:** containers (CCUs), baskets, pipe, chemicals in tote tanks, spares, and provisions.
- **Bulk liquids** in below-deck tanks: marine gas oil (diesel), drill water, potable water, liquid mud and brine.
- **Dry bulk:** cement, barite and bentonite.
- **People**, who usually travel by helicopter or crew boat rather than on the PSV.

The vessel comes back with **backload**: empty CCUs, waste skips, drill cuttings, returned rental tools and scrap.

Onne Oil and Gas Free Zone is the main offshore logistics base in Nigeria. An older industry interview (Intels, 2015) put about 90% of Nigerian offshore activity as supported from Onne. Treat that figure as dated and check it. A 2026 study of Nigerian offshore service vessels found PSV deployment grew about 5.2% a year from 2009 to 2023, driven by deepwater work.

Each of these hand-offs is done by a different firm: vessel owner, base operator, fuel supplier, mud company, chandler, rental tool company, waste contractor, security provider. They exchange paper manifests, WhatsApp photos and spreadsheets. That is the gap Offshora fills: one signed record across every hand-off.

## 2. Who buys

| Segment | Pain | Lead modules |
|---|---|---|
| OSV owners (PSV, AHTS, crew boats) | Disputed off-hire, chargeable days, certificates, cabotage | VesselOps, MarineGuard |
| Supply base / logistics operators | Lost CCUs, DG mistakes, backload not reconciled | OffshoreLink, EquipTrack |
| Fuel, water and mud suppliers | Meter vs. rig sounding disputes, short deliveries | RigSupply, BunkerFlow |
| Chandlers and provisioners | Orders not sized to POB, cold chain, proof of delivery | MarineStores, OffshoreLink |
| Rental tool and CCU owners | Equipment left offshore, unbilled days, expired certificates | EquipTrack |
| Operator logistics departments | No single view across vendors, POB accuracy, ESG reporting | All, through Client Portal |

## 3. Gap analysis against existing modules

| Offshore need | Existing coverage | Gap now filled by |
|---|---|---|
| Bunkering vessels | BunkerFlow | (covered) |
| Diesel, water, mud to rigs | Not covered | **RigSupply** |
| Deck cargo, CCUs, DG, backload | Not covered | **OffshoreLink** |
| Helicopter and crew boat seats, POB | SafePass credential gate only | **CrewTransit** (uses SafePass) |
| Charter, on/off-hire, vessel certs | Overview fleet card only | **VesselOps** |
| Rental equipment and lifting gear | Not covered | **EquipTrack** |
| Gulf of Guinea security | Not covered | **MarineGuard** |
| Offshore waste, MARPOL books, emissions | TankWorks sludge manifests only | **EnviroLedger** |
| Provisions sized to crew numbers | MarineStores (catalogue only) | MarineStores, new "Offshore Provisioning & Catering" section |

## 4. New modules (front end built)

All pages use the shared `ModulePage` template and are under `frontend/src/app/dashboard/`.

### 13. OffshoreLink: supply base and deck cargo (`/dashboard/offshore-link`)
- Multi-drop PSV voyage planner (rigs, FPSOs, platforms, jackets)
- Deck space and deck load planner
- Lift-by-lift manifest with QR / RFID tag, weight and destination
- CCU register with inspection intervals aligned with DNV-ST-E271 (formerly 2.7-1)
- Lifting set certificate check before load-out
- IMDG dangerous goods declaration with segregation checks that block load-out
- Backload reconciliation, overdue-CCU alerts with rental exposure
- Weather / port sailing holds with master's go / no-go
- Shared voyages with cost split between operators

### 14. RigSupply: offshore fuel, water and bulk (`/dashboard/rig-supply`)
- MGO / AGO, drill water, potable water, brine, liquid mud (OBM / WBM / SBM)
- Dry bulk: cement, barite, bentonite
- Vessel meter vs. rig sounding reconciliation with variance alerts
- Sample seals, density at 15 °C
- Rig tank levels and days-of-supply forecast per product
- Suggests extra drops onto planned OffshoreLink voyages

### 15. CrewTransit: helicopter, crew boat and POB (`/dashboard/crew-transit`)
- Helicopter manifests, seat allocation, standby list
- Crew boat and walk-to-work transfers with sea-state limits
- Passenger and baggage weights
- Seat blocked automatically when BOSIET / HUET / medical has expired (via SafePass)
- Live POB per installation, bed and lifeboat capacity limits, muster list export
- Weather rebooking

Reference: CGI Viewpoint POB (formerly Vantage POB) is the main global product here. It was reported to have a Nigerian government contract through West Atlantic Energy. CrewTransit should **integrate with it where operators already use it**, not try to replace it at large IOCs.

### 16. VesselOps: OSV charter, fleet and compliance (`/dashboard/vessel-ops`)
- Charter party register (day rates, mob / demob, fuel terms)
- On-hire / off-hire ledger signed by both parties; off-hire claims with evidence
- Daily vessel report: activities, position, DP hours, fuel / water ROB
- Class, flag, ISM / ISPS, P&I certificates with expiry alerts
- NIMASA cabotage registration and waiver tracking
- OVID / CMID inspection findings tracked to close-out
- Charter invoices into Billing

### 17. EquipTrack: rentals, CCUs and lifting gear (`/dashboard/equip-track`)
- One register for owned and rented tools, CCUs, tanks, slings
- QR / RFID location history (base, vessel, installation)
- Inspection and certificate dates; expired items blocked from manifests
- On-rent / off-rent, chargeable-day counter, idle alerts, supplier invoice check

### 18. MarineGuard: maritime security (`/dashboard/marine-guard`)
- Voyage risk assessment per route, vessel and time of day
- Security escort booking with rendezvous, comms plan and cost
- MDAT-GoG initial / daily / final report tracker
- BMP West Africa checklist, citadel drill records
- AIS status log with reasons (industry bulletins say the Nigerian Navy arrests ships found with AIS switched off)
- Offline incident capture

### 19. EnviroLedger: waste, discharges and emissions (`/dashboard/enviro-ledger`)
- Waste transfer notes from installation to vessel, base and licensed disposal
- Custody-gap alerts (no disposal certificate)
- MARPOL Annex I oil record book and Annex V garbage record book
- Oil spill reporting pack for NOSDRA
- Fuel-based CO₂ per vessel, voyage, installation, client; ESG export

## 5. How the new modules connect to existing ones

- **SafePass → CrewTransit:** credential checks gate flight and boat seats.
- **CrewTransit → MarineStores:** live POB sizes provision orders.
- **OffshoreLink ↔ RigSupply:** bulk drops ride on planned voyages.
- **EquipTrack → OffshoreLink:** expired CCUs and slings cannot be manifested.
- **OffshoreLink → EnviroLedger:** backloaded skips start the waste chain of custody.
- **VesselOps → EnviroLedger:** daily fuel use feeds emissions.
- **VesselOps / EquipTrack / RigSupply → Billing:** chargeable days and delivered volumes become invoices.
- **MarineGuard → SafePass:** incident follow-ups become CAPA actions.
- **Compliance Shield:** cabotage, vessel certificates, CCU and sling expiry all land on the one calendar.
- **Client Portal:** operators see manifests, PODs, delivery tickets and waste certificates.

## 6. Landing page changes

- New **Offshore** section (`components/landing/Offshore.tsx`, anchor `#offshore`, added to the navbar). It shows six steps from supply base to backload, the modules behind each step, and six buyer segments.
- **Modules** section: new "Offshore" filter tab, 7 new module cards with interactive previews, count changed from 12 to 19, OffshoreLink shown as a featured card.
- **Hero:** new first chapter "Every lift, on record" (OffshoreLink); tagline now reads "Built for offshore & onshore energy contractors".
- **Roadmap:** offshore logistics added as segment 01; offshore modules added to Phases 2 and 3.
- **Pricing:** five new add-on lines (marked as proposals).

## 7. Claims to verify before selling

1. **DNV-ST-E271** is the current standard (2023 edition, amended 2024). Say "aligned with", not "certified". Certification is done by DNV or another body, not by software.
2. **IMO CII** only applies to ships of 5,000 GT and above. Most PSVs and crew boats are smaller. IMCA has said the standard IMO carbon metric does not fit offshore vessels. Pitch emissions as "fuel-based CO₂ for client ESG reports", and DCS / CII "where the vessel size requires it".
3. **Cabotage:** NIMASA has said it plans to stop granting waivers, but most of the sources found are from 2019 or undated. Check the current policy with NIMASA.
4. **NOSDRA spill reporting:** the format and deadlines were not confirmed in this research. Get the current NOSDRA requirements before building the export.
5. **Security escorts:** this research did not confirm how escort contracts work off Nigeria today (Navy-backed providers, the Deep Blue project). Talk to a security provider before building the booking flow.
6. **Add-on prices** are placeholders. Validate them in pilots, as with the rest of the pricing.
7. **Mock data** uses real field and vessel-type names for realism (Bonga, Agbami, Usan). Replace or anonymise them before public demos, so it doesn't look like those operators are customers.

## 8. Considered, not built yet

- **LPG / CNG distribution** (cylinder tracking, virtual pipelines): onshore, a separate market.
- **Drilling daily reports (IADC DDR) and mud logging:** run by drilling contractors in specialist tools. Import the data instead of building it.
- **Subsea, ROV and diving operations:** niche, with heavy IMCA-specific workflows.
- **Weather / metocean feed:** for now OffshoreLink only records sailing holds. A forecast provider integration would be an add-on.

## 9. Backend work this needs (next)

New Django apps or models: `Voyage`, `ManifestLift`, `CargoUnit`, `DGDeclaration`, `BulkTransfer`, `RigTankLevel`, `Flight`, `Booking`, `POBSnapshot`, `Charter`, `HireEvent`, `DailyVesselReport`, `VesselCertificate`, `Asset`, `RentalPeriod`, `RiskAssessment`, `SecurityReport`, `WasteTransferNote`, `RecordBookEntry`. They should follow the same tenant row-level security and audit-event pattern as `bunkering` and `haulage`.

## Sources

- Onne / Onne Oil and Gas Free Zone: https://en.wikipedia.org/wiki/Onne ; Intels interview: https://theenergyyear.com/?p=4542
- Nigerian OSV trend study (2026): https://ujcontent.uj.ac.za/esploro/outputs/journalArticle/Operational-trends-and-growth-analysis-of/9963660907691
- Offshore supply chain overview: https://www.identecsolutions.com/transport-and-supply-of-oil-platforms-industry-knowledge-hub
- DNV-ST-E271 (2.7-1): https://www.dnv.com/oilgas/download/dnv-st-e271-offshore-containers.html
- BMP West Africa: https://britanniapandi.com/wp-content/uploads/2025/05/BMP-West-Africa-2.pdf
- OCIMF Gulf of Guinea bulletin: https://ocimf.org/news-and-events/news/bulletins/highlighting-the-threats-to-vessels-operating-in-the-gulf-of-guinea-gog
- LISCR bulletin (AIS / Nigerian Navy): https://www.liscr.com/marketing/liscr/media/liscr/online%20library/maritime/msb-01-2026.pdf
- NIMASA cabotage waivers: https://businessday.ng/maritime/article/nimasa-targets-5-year-cabotage-waiver-cessation-in-nigerias-shipping-business/ ; https://globallawexperts.com/requirements-for-the-issuance-of-cabotage-waivers/
- CGI Viewpoint POB (Vantage POB): https://www.cgi.com/en/media/brochure/cgi-vantagepob ; Nigeria deal: https://www.energyvoice.com/?p=22733
- POB manifests background: https://www.identecsolutions.com/news/offshore-installations-how-pob-monitoring-evolved-from-lists-to-real-time-systems
- IMO CII: https://marine-offshore.bureauveritas.com/shipping-decarbonization/carbon-index/cii ; IMCA on offshore carbon metric: https://www.imca-int.com/?p=277567
