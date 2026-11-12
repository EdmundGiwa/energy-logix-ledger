# Skycave Energies Limited — End-to-End Operational Testing Storyline

**Company**: Skycave Energies Limited  
**Account Owner**: Chukwuka Ibeji, Managing Director (`support@skycave.space`)  
**Platform**: Ofshora Energy OS (`https://www.ofshora.com/dashboard`)  
**Operational Scope**: Marine & Offshore Support, Bunkering, Supply Base Deck Cargo, Crew Logistics, and Commercial Billing.

---

## 1. Scenario Background: The Bonga Deepwater Supply Campaign

Skycave Energies Limited has been awarded a 14-day offshore campaign by **Shell Petroleum Development Company (SPDC)** to support deepwater drilling operations at the **Bonga Deepwater Offshore Field (OML 118)**, located ~120 km south-west of the Niger Delta.

### Key Mission Assets:
* **Offshore Vessel**: *MV Atlantic Pioneer* (IMO: `9481234`), a 72-metre DP2 (Dynamic Positioning 2) Platform Supply Vessel (PSV).
* **Operational Base**: Federal Lighter Terminal (FLT), Onne Port, Rivers State, Nigeria.
* **Client / Operator**: Shell Petroleum Development Company of Nigeria (SPDC).
* **Primary Scope of Work**:
  1. Secure statutory cabotage and environmental permits (**Compliance Shield**).
  2. Outfit the vessel with certified engine oils and MARPOL-compliant refrigerant cylinders (**MarineStores**).
  3. Deliver 450 MT Low Sulphur Marine Gasoil (LSMGO), record tank soundings, and issue a dual-signed electronic Bunker Delivery Note (**BunkerFlow**).
  4. Log daily vessel charter operations and fuel remaining on board (**VesselOps**).
  5. Manifest quayside deck cargo containers and verify IMDG dangerous goods segregation (**OffshoreLink**).
  6. Mobilise 18 offshore technicians with verified BOSIET safety tickets (**CrewTransit**).
  7. Hand off tamper-evident audit packages to Shell representatives (**Client Portal**).
  8. Issue milestone commercial invoices with statutory 5% IPC retention and record bank remittance (**Billing & Commercial**).
  9. Review executive health, safety, and financial KPIs and export the certified Board Brief (**Owner Dashboard**).

---

## 2. Walkthrough Roadmap

```
[1. Compliance Shield]  -->  [2. MarineStores]  -->  [3. BunkerFlow]
         |                          |                      |
   Permit Logged              Engine Oils &           450 MT LSMGO
   & ISO Audit                MARPOL Cylinders        Sounded & e-BDN
         |                          |                      |
         v                          v                      v
[4. VesselOps]          -->  [5. OffshoreLink]  -->  [6. CrewTransit]
         |                          |                      |
   DP2 Charter Log            Quayside Cargo          18 POB Cleared
   & Daily ROB                34 Lifts Manifested     (BOSIET Valid)
         |                          |                      |
         v                          v                      v
[7. Client Portal]      -->  [8. Billing]       -->  [9. Owner Dashboard]
         |                          |                      |
   Deliverable Sealed         $385k Invoice Raised    KPIs Reconciled &
   (SHA-256 Digest)           & 5% IPC Certified      Board Brief Exported
```

---

## 3. Step-by-Step Testing Guide with Copy-Paste Form Data

---

### Act 1: Statutory Compliance & Regulatory Clearance
**Module**: Compliance Shield  
**URL**: [https://www.ofshora.com/dashboard/compliance-shield](https://www.ofshora.com/dashboard/compliance-shield)  
**Industry Context**: Before any offshore vessel can depart Onne for an IOC deepwater field, Nigerian law (NUPRC and NIMASA Cabotage Act) mandates valid operational permits. Missing permits result in immediate detention by naval patrols or harbour masters.

#### Step 1.1: Log Vessel Cabotage & Environmental Permit
1. On the Compliance Shield page, click **"+ Add Certificate"** (or top-right action button).
2. Fill in the modal using the exact values below:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Regulator** | `NUPRC` (or select from dropdown) | Nigerian Upstream Petroleum Regulatory Commission. |
| **Certificate Number** | `NUPRC/PTS/2026/881` | Statutory permit registry number. |
| **Certificate / Permit Title** | `Offshore Coastal Vessel Clearance & Cabotage Permit` | Legal right of the vessel to trade within Nigerian territorial waters. |
| **Issuing Authority** | `NUPRC Directorate of Marine Operations Abuja` | Official government issuing branch. |
| **Issue Date** | `2026-01-15` | Date permit was formally gazetted. |
| **Expiry Date** | `2027-01-14` | 1-year operational validity. |
| **Document Reference** | `DOC-REG-2026-NUPRC-MV-PIONEER.pdf` | Opaque vault file name. |
| **Notes & Conditions** | `Authorised for DP2 offshore support services at Bonga Deepwater Field (OML 118). Master must maintain continuous AIS beacon.` | Special conditions on permit. |

3. Click **"Save Certificate"**. The permit will instantly appear in the regulatory register.

#### Step 1.2: Schedule ISO 14001 Environmental Audit
1. Click **"+ Schedule ISO Audit"**.
2. Fill in the modal:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Standard** | `ISO 14001:2015 (Environmental)` | Environmental Management System standard governing bunker discharges and waste handling. |
| **Audit Type** | `Surveillance Audit` | Periodic third-party surveillance audit. |
| **Audit Scope** | `Offshore bunkering operations, vessel stores logistics, and refrigerant gas inventory at Onne Base` | The physical operations under audit. |
| **Certification Body** | `Bureau Veritas Nigeria Limited` | Internationally accredited classification society. |
| **Lead Auditor** | `Engr. K. Adeleke` | Lead quality surveyor. |
| **Audit Date** | `2026-11-20` | Scheduled audit date. |

3. Click **"Schedule Audit"**.

---

### Act 2: Marine Stores, Spares & MARPOL Cylinders
**Module**: MarineStores  
**URL**: [https://www.ofshora.com/dashboard/marine-stores](https://www.ofshora.com/dashboard/marine-stores)  
**Industry Context**: Offshore vessels require high-grade lubricating oils for main engines and strict control of hydrofluorocarbon refrigerants. Under MARPOL Annex VI, any ozone-depleting refrigerant gas must have its serial number, tare weight, and valve seals logged to prove zero atmospheric discharge.

#### Step 2.1: Register Engine Lubricant in Catalogue
1. Click **"+ Catalogue Item"**.
2. Enter the following details:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Item Code** | `LUB-5001` | Unique stock keeping unit. |
| **Category** | `Marine Lubricants` | Stores classification. |
| **Item Name / Description** | `Mobilgard 412 Trunk Piston Engine Oil` | Specialized high-alkaline diesel engine lubricant. |
| **Unit of Measure** | `drum (208L)` | Standard container size. |
| **Brand** | `Mobil Marine` | Approved lubricant manufacturer. |
| **IMPA Code** | `270102` | International Marine Purchasing Association catalogue code. |
| **Minimum Stock Level** | `10` | Re-order threshold for Onne warehouse. |

3. Click **"Register Catalogue Item"**.

#### Step 2.2: Register MARPOL-Compliant Refrigerant Cylinder
1. Click **"+ Register Cylinder"**.
2. Enter the cylinder tracking details:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Cylinder Serial** | `CYL-R404A-8810` | Stamped steel cylinder serial number. |
| **Gas Type** | `R404A` | Refrigerant used in the ship's galley provisions freezer. |
| **Tare Weight (kg)** | `14.50` | Empty cylinder weight stamped on bottle neck. |
| **Gross Weight (kg)** | `24.50` | Weight with refrigerant (proves 10.00 kg net gas on board). |
| **Assigned Vessel / Location** | `MV Atlantic Pioneer — Cold Room HVAC` | Equipment location aboard ship. |
| **MARPOL Annex VI Compliant** | *(Checked)* | Verifies tamper-evident valve seal is intact. |

3. Click **"Register Cylinder"**.

---

### Act 3: Marine Fuel Bunkering & Dual-Signed e-BDN
**Module**: BunkerFlow  
**URL**: [https://www.ofshora.com/dashboard/bunkerflow](https://www.ofshora.com/dashboard/bunkerflow)  
**Industry Context**: Bunkering (fuelling ships) is the highest-value, highest-risk marine operation. Differences in fuel temperature and density can cause commercial disputes or engine failure if fuel properties fall outside ISO 8217 specifications. BunkerFlow replaces disputed paper notes with custody soundings and a digitally signed Electronic Bunker Delivery Note (e-BDN).

#### Step 3.1: Create Fuel Nomination
1. Click **"+ New nomination"**.
2. Fill in the nomination form:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Customer** | `Shell Petroleum Development Company (SPDC)` | Contract counterparty. |
| **Receiving vessel** | `MV Atlantic Pioneer` | Vessel taking on fuel. |
| **IMO number** | `9481234` | Unique 7-digit IMO ship identifier. |
| **Port or delivery location** | `Onne FLT Berth 4` | Deepwater berth at Federal Lighter Terminal. |
| **Fuel product / grade** | `LSMGO (0.10% Max Sulphur)` | Low Sulphur Marine Gasoil meeting IMO MARPOL Annex VI cap. |
| **Nominated quantity (MT)** | `450.000` | Metric tonnes requested. |
| **Delivery window starts** | *(Select tomorrow at 08:00)* | Target start time. |
| **Delivery window ends** | *(Select tomorrow at 18:00)* | Target completion time. |
| **Operational notes** | `Bunkering alongside Onne Berth 4. Pumping rate capped at 75 MT/h. Continuous drip sampling required at manifold.` | Pumping and sampling safety rules. |

3. Click **"Create draft nomination"**.
4. Click on the newly created nomination from the list to view its workflow detail.
5. In the workflow header, click **"Confirm nomination"** (enter reason: `Stem confirmed with Onne jetty coordinator`) to advance status to `confirmed`.

#### Step 3.2: Record Pre-Delivery Tank Sounding
1. Click **"Record first sounding"** (or **"Record pre-delivery sounding"**).
2. Enter the manual tank dipping measurements:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Tank reference** | `1P-MGO (Port Forward)` | Double-bottom fuel storage tank. |
| **Forward sounding (m)** | `4.820` | Depth of fuel measured at forward dip tube. |
| **Aft sounding (m)** | `4.850` | Depth measured at aft dip tube. |
| **Observed temperature (°C)**| `32.500` | Fuel temperature inside tank (used for ASTM 54B correction). |
| **Density @ 15°C (kg/m³)** | `845.200` | Lab-certified density under ISO 3675. |
| **Observed volume (m³)** | `280.450` | Uncorrected volume calculated from tank calibration tables. |
| **Worksheet or method reference** | `ASTM Table 54B / Onne Ullage Sheet #41` | Calculation standard used. |
| **Independently reviewed mass (MT)** | `231.850` | Net weight calculated by cargo surveyor. |

3. Click **"Save sounding"**.
4. In the soundings table, click **"Review now"** and confirm (reason: `Cross-checked against certified sounding gauge calibration tape`). Status advances to `sounding_recorded`.

#### Step 3.3: Draft and Dual-Sign the Electronic BDN (e-BDN)
1. Click **"Prepare BDN"** (or **"Review BDN"**).
2. Enter the delivery note data:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **BDN number** | `BDN-2026-SKY-001` | Unique commercial sequence reference. |
| **Delivered quantity (MT)** | `450.000` | Total net mass delivered. |
| **Flashpoint (°C)** | `66.500` | Must be ≥ 60°C under SOLAS convention to prevent fires. |
| **Viscosity (cSt)** | `3.850` | Viscosity @ 40°C under ISO 3104. |
| **Sulphur (%)** | `0.0820` | Must be ≤ 0.1000% under emission control guidelines. |
| **Water (%)** | `0.0200` | Water-in-oil trace content (acceptable if < 0.3%). |
| **Supplier acknowledgement by** | `Chukwuka Ibeji (Managing Director)` | Skycave bunker supplier sign-off. |
| **Supplier acknowledgement time** | *(Current Date & Time)* | Time stamp of supplier signature. |
| **Receiver acknowledgement by** | `Chief Engr. M. Alabi (MV Atlantic Pioneer)` | Vessel receiving engineer sign-off. |
| **Receiver acknowledgement time** | *(Current Date & Time)* | Time stamp of receiving signature. |

3. Click **"Save BDN"**.
4. Approve the BDN when prompted. You can now download or preview the tamper-evident PDF!

---

### Act 4: Daily Vessel Reporting & Charter Dispatch
**Module**: VesselOps  
**URL**: [https://www.ofshora.com/dashboard/vessel-ops](https://www.ofshora.com/dashboard/vessel-ops)  
**Industry Context**: Offshore support vessels operate under BIMCO Supplytime charter parties. Charterers pay a daily rate (e.g. $15,000/day). Skycave must provide Daily Vessel Reports (DVR) recording fuel remaining on board (ROB), engine running hours, and dynamic positioning performance to prevent off-hire claims.

#### Step 4.1: Create Daily Vessel Operations Record
1. Click **"+ New Record"** (top right).
2. Fill in the modal:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Operation Title / Reference** | `DVR-2026-SKY-01: Bonga Deepwater PSV Transit` | Daily Vessel Report sequence. |
| **Target Asset / Vessel / Facility** | `MV Atlantic Pioneer (IMO 9481234)` | Chartered vessel. |
| **Key Metric / Quantity** | `Fuel ROB 412 m³ • Water ROB 380 m³ • DP2 Operational` | Remaining fuel/water and positioning status. |

3. Click **"Save Record"**. The entry appears immediately in the operational log with a **Verified** stamp.

---

### Act 5: Supply Base Quayside Cargo Manifest & Dangerous Goods Gate
**Module**: OffshoreLink  
**URL**: [https://www.ofshora.com/dashboard/offshore-link](https://www.ofshora.com/dashboard/offshore-link)  
**Industry Context**: Loading a supply boat deck requires strict IMDG (International Maritime Dangerous Goods) segregation. Incompatible chemicals (such as acids and oxidisers) cannot be stowed side-by-side. Every cargo carrying unit (CCU) must be weighed and tagged before sailing.

#### Step 5.1: Create Deck Cargo Manifest
1. Click **"+ New Record"**.
2. Fill in the modal:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Operation Title / Reference** | `MAN-2026-SKY-088: Deck Cargo Manifest (34 Lifts)` | Official stowage and lift plan. |
| **Target Asset / Vessel / Facility** | `Onne FLT Berth 4 → Bonga FPSO / Drillship` | Origin supply base to offshore installation. |
| **Key Metric / Quantity** | `34 Lifts • 412.5 MT Deck Load • IMDG Class 8 Segregated` | Total cargo weight and hazardous goods status. |

3. Click **"Save Record"**.

---

### Act 6: Offshore Crew Flight & Vessel Transfer Manifest (POB)
**Module**: CrewTransit  
**URL**: [https://www.ofshora.com/dashboard/crew-transit](https://www.ofshora.com/dashboard/crew-transit)  
**Industry Context**: To prevent offshore catastrophes, no passenger may board a helicopter or boat without certified BOSIET (Basic Offshore Safety Induction and Emergency Training), valid HUET (Helicopter Underwater Escape Training), and an offshore medical certificate. The POB (Persons On Board) count must match lifeboat capacity at all times.

#### Step 6.1: Log Mobilised Personnel Manifest
1. Click **"+ New Record"**.
2. Fill in the modal:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Operation Title / Reference** | `POB-2026-SKY-01: Shell Deepwater Support Mobilisation` | Official personnel flight/boat manifest. |
| **Target Asset / Vessel / Facility** | `MV Atlantic Pioneer (18 Marine & Technical Crew)` | Vessel receiving personnel. |
| **Key Metric / Quantity** | `18/18 Cleared • 100% BOSIET Valid • 1,620 kg Body & Bag` | Certified safety compliance and passenger payload. |

3. Click **"Save Record"**.

---

### Act 7: Client Deliverable Hand-Off with Tamper-Evident Seal
**Module**: Client Portal  
**URL**: [https://www.ofshora.com/dashboard/client-portal](https://www.ofshora.com/dashboard/client-portal)  
**Industry Context**: International Oil Companies (IOCs) like Shell require auditable proofs for every litre pumped and cargo container delivered. In Ofshora, deliverables are cryptographically hashed (SHA-256) into immutable packages so neither contractor nor client can alter measurements after the fact.

#### Step 7.1: Publish Sealed Deliverable Package for Shell
1. Click **"+ Share Deliverable"**.
2. Fill in the modal:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Client Organization** | `Shell Petroleum Development Company (SPDC)` | Authorized receiving client. |
| **Deliverable Title** | `Certified Bunker Delivery Note & Deck Manifest — MV Atlantic Pioneer` | Package name displayed to client auditors. |
| **Deliverable Type** | `e-Bunker Delivery Note` (or `bunker_bdn`) | Deliverable classification. |
| **Source Reference** | `BDN-2026-SKY-001` | Reference matching the BunkerFlow record from Act 3. |
| **Metadata (JSON)** | `{"vessel": "MV Atlantic Pioneer", "imo": "9481234", "quantity_mt": 450, "field": "Bonga OML 118", "cargo_lifts": 34}` | Structured payload for client ERP integration. |

3. Click **"Generate Deliverable Package"**.
4. The package appears with an authentic verification badge, QR code, and SHA-256 seal!

---

### Act 8: Milestone Invoicing, EPC Retention & Payment Remittance
**Module**: Billing & Commercial  
**URL**: [https://www.ofshora.com/dashboard/billing](https://www.ofshora.com/dashboard/billing)  
**Industry Context**: Major energy contracts operate in dual currencies (USD and NGN). Contractors issue milestone invoices with statutory VAT (7.5%) and Withholding Tax (5.0%). In addition, engineering and charter contracts typically withhold 5% of gross billings as an Interim Payment Certificate (IPC) retention until final field demobilisation.

#### Step 8.1: Onboard Shell as a Commercial Account
1. Click **"+ New Customer"**.
2. Fill in the customer account modal:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Company / Operator Name** | `Shell Petroleum Development Company (SPDC)` | Legal corporate entity name. |
| **Tax ID / TIN** | `TIN-10048291-0001` | Federal Inland Revenue Service (FIRS) tax ID. |
| **Currency** | `USD` (or `NGN`) | Billing denomination. |
| **Email** | `commercial-finance@spdc.shell.local` | Client billing department. |
| **Phone** | `+234 803 900 1200` | Account contact phone. |
| **Credit Limit** | `1000000` | $1,000,000 credit limit. |
| **Payment Terms (Days)** | `30` | Net 30 day payment terms. |
| **Billing Address** | `Shell Industrial Area, Old Aba Road, Rumuobiokani, Port Harcourt, Rivers State, Nigeria` | Corporate invoicing address. |

3. Click **"Create Customer"**.

#### Step 8.2: Draft Milestone Commercial Invoice
1. Click **"+ Raise Invoice"**.
2. Fill in the commercial invoice form:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Customer / Operator** | `Shell Petroleum Development Company (SPDC)` | Selected from dropdown. |
| **Currency** | `USD` | Contract currency. |
| **Due Date** | *(Select 30 days from today)* | Payment due date. |
| **VAT %** | `7.50` | Statutory Nigerian VAT rate. |
| **WHT %** | `5.00` | Withholding tax deducted at source. |
| **Item Description** | `14-Day PSV Charter & 450 MT LSMGO Bunkering Mobilisation (MV Atlantic Pioneer)` | Work performed summary. |
| **Quantity** | `1` | Lump sum milestone. |
| **Unit Rate ($)** | `385000.00` | Gross contract value ($385,000). |
| **Notes & Wire Instructions** | `Beneficiary: Skycave Energies Limited. Bank: Zenith Bank PLC, Victoria Island Branch. USD Account: 5070001234. Swift: ZEBLNGLA.` | Contractor wire details. |

3. Click **"Generate Invoice Draft"**.
4. In the invoice list, click **"Issue"** to advance the invoice to the customer.

#### Step 8.3: Draft Interim Payment Certificate (IPC) with 5% Retention
1. Click **"+ Draft IPC"**.
2. Fill in the EPC valuation form:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Client** | `Shell Petroleum Development Company (SPDC)` | Project owner. |
| **Contract Reference** | `EPC-SPDC-BONGA-2026-09` | Governing master service agreement. |
| **Project Name** | `Bonga Deepwater Marine Support & Supply Campaign` | Offshore campaign title. |
| **Valuation Period Start** | *(14 days ago)* | Milestone start date. |
| **Valuation Period End** | *(Today)* | Milestone cut-off date. |
| **Gross Certified ($)** | `385000.00` | Certified gross value completed. |
| **Retention %** | `5.00` | 5% held ($19,250) until demobilisation. |
| **Advance Recovery ($)** | `0.00` | Prior mobilization advance to deduct. |
| **Valuation Notes** | `Milestone 1 certified: 14/14 charter days completed with zero off-hire and 450 MT LSMGO delivered with dual-signed e-BDN.` | Quantity Surveyor justification. |

3. Click **"Draft IPC"**.
4. Click **"QS Sign-off"** and certify the certificate.

#### Step 8.4: Record Client Wire Transfer
1. Click **"+ Record Payment"**.
2. Fill in the payment form:

| Form Field | Value to Copy / Paste | Operational Explanation |
| :--- | :--- | :--- |
| **Customer** | `Shell Petroleum Development Company (SPDC)` | Paying customer. |
| **Allocate to Invoice** | *(Select the $385,000 invoice created above)* | Clears the receivable balance. |
| **Payment Method** | `Direct Bank Transfer / NIP` | Wire transfer. |
| **Amount ($)** | `365750.00` | Net payment after 5% withholding tax. |
| **Transaction Reference** | `CBN-NIP-20261112-SPDC-00918` | Central Bank of Nigeria settlement reference. |
| **Notes** | `Direct RTGS wire received into Zenith Bank USD domiciliary account. Remittance advice verified.` | Confirmation note. |

3. Click **"Post Payment"**. The invoice will automatically update to paid status!

---

### Act 9: Executive Reconciliation & Board Brief Export
**Module**: Owner Dashboard (Overview)  
**URL**: [https://www.ofshora.com/dashboard](https://www.ofshora.com/dashboard)  
**Industry Context**: The executive dashboard provides the Managing Director (Chukwuka Ibeji) with a single-pane-of-glass overview of corporate financial health, operational risk, certificate validity, and real-time exceptions across all active field nodes.

#### Step 9.1: Review Reconciled Metrics & Exceptions
1. Navigate back to the main Overview page ([/dashboard](https://www.ofshora.com/dashboard)).
2. Observe the aggregated operational cards:
   * **Product Delivered**: Bunkering volume reflected.
   * **Ledgers & Receivables**: USD and NGN balances with live foreign exchange snapshots.
   * **Compliance Calendar**: Active 90, 60, and 30-day statutory renewal alerts.
   * **Field Devices**: Synced offline tablets from Onne Terminal Node.
3. Review the **Exception Feed** at the bottom left:
   * If there is an open operational flag (e.g. *DG Segregation Conflict* or *Low Days of Supply*), click **"Acknowledge"** to log your MD audit sign-off.

#### Step 9.2: Export Official Executive Board Brief (PDF)
1. At the top right of the dashboard, locate the action buttons.
2. Click **"Board brief"**.
3. Ofshora compiles an encrypted, executive-grade PDF summary of Skycave Energies Limited's operating performance, vessel utilisation, and revenue ledger ready for board meetings or banking partners.

---

## 4. Summary Table of Test Data

For quick reference while filling in forms, keep this cheat-sheet open:

| Key Entity | Value |
| :--- | :--- |
| **Organization Name** | `Skycave Energies Limited` |
| **Owner Name & Email** | `Chukwuka Ibeji` • `support@skycave.space` |
| **Primary Vessel** | `MV Atlantic Pioneer` (IMO: `9481234`) |
| **Primary Base** | `Federal Lighter Terminal (FLT), Onne Port, Nigeria` |
| **Client** | `Shell Petroleum Development Company (SPDC)` |
| **Field Location** | `Bonga Deepwater Offshore Field (OML 118)` |
| **Fuel Stem** | `450.000 MT LSMGO @ Onne Berth 4` |
| **BDN Reference** | `BDN-2026-SKY-001` |
| **Lube Oil SKU** | `LUB-5001` (Mobilgard 412 Trunk Piston Oil) |
| **Refrigerant Cylinder** | `CYL-R404A-8810` (R404A • 14.50 kg tare • 24.50 kg gross) |
| **Contract Invoice** | `$385,000.00 USD` (Net 30 days) |
| **IPC Retention** | `5.00%` ($19,250.00 USD held) |

---
*Document produced for Skycave Energies Limited operational testing on Ofshora.*
