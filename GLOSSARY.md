# PetroLedger Industry Glossary

This glossary gives software engineers and product contributors a working introduction to terms used in PetroLedger. It is explanatory, not an engineering calculation standard, operating procedure, legal opinion, or compliance certification.

Definitions marked **Verify before implementation** depend on the product, jurisdiction, contract, facility, or current version of a standard. Confirm those definitions and any resulting validation rules with a qualified domain expert and the authoritative source before encoding them in software.

## How to maintain this glossary

- Add a term when it first appears in a feature, API, model, event, or user-facing workflow and a general software engineer may not understand it.
- Define the term in plain language, then explain why it matters to PetroLedger where useful.
- Expand an acronym on first use. Add common aliases when field users may search for them.
- Do not copy restricted standards or invent formulas from memory. Reference the governing publication and version instead.
- Keep regulatory and integration status separate from definitions. A defined external system is not proof that PetroLedger has access to it.
- Mark disputed, customer-specific, or jurisdiction-dependent usage explicitly.

## General energy operations

### Audit trail

A chronological record of who performed an action, when it happened, what changed, and the outcome. For high-integrity records, corrections should create a new linked event rather than erase the original history.

### Custody transfer

The point at which ownership or responsibility for a petroleum product passes between parties and its quantity or quality is formally measured. Custody-transfer calculations and instruments can have contractual and financial consequences. **Verify before implementation:** the applicable contract, measurement standard, instrument tolerances, and approval process.

### Downstream

The part of the petroleum industry concerned broadly with refining, distribution, storage, marketing, and sale of petroleum products.

### EPC

Engineering, Procurement, and Construction. A contracting model in which a contractor delivers engineering design, procures materials and equipment, and constructs or commissions the facility.

### IOC

International Oil Company. In this project, the term generally refers to large international petroleum companies that may act as clients, operators, or standard-setters through their contractual requirements.

### NOC

National Oil Company. A petroleum company owned or controlled by a national government.

### OEM

Original Equipment Manufacturer. The company that manufactures equipment or publishes the authoritative operating and maintenance requirements for it.

### Upstream

The part of the petroleum industry concerned broadly with exploration and production of crude oil and natural gas.

## Marine fuel and bunkering

### Barge

A generally flat-bottomed vessel used to transport cargo, including fuel. Some barges are self-propelled; others are pushed or towed.

### BDN — Bunker Delivery Note

The official receipt recording marine fuel delivered to a receiving ship, including required product and delivery information. MARPOL Annex VI specifies information and retention requirements for relevant deliveries.

### Bunkering

Supplying fuel to a ship. A bunkering operation can include nomination, scheduling, quantity measurement, sampling, transfer, safety checks, documentation, and sign-off.

### Bunker stem

A planned or completed quantity of marine fuel ordered and delivered to a vessel. Teams may also use “stem” to refer to the complete supply transaction.

### Chief Engineer

The senior engineering officer responsible for a ship's machinery and engineering operations. This person may verify measurements or sign bunker documentation on behalf of the receiving vessel.

### eBDN — Electronic Bunker Delivery Note

A digital form of the Bunker Delivery Note. Electronic validity, signatures, format, exchange, and acceptance depend on the applicable authority and counterparties. **Verify before implementation.**

### Electronic acknowledgement

A recorded action showing that an identified person accepted or confirmed a record at a particular time. It is not automatically a cryptographic digital signature and does not, by itself, establish legal signature validity.

### Flashpoint

The lowest temperature, under a specified test method, at which a liquid gives off enough vapour to ignite momentarily. The result is method-dependent and safety-critical.

### MARPOL

The International Convention for the Prevention of Pollution from Ships. MARPOL Annex VI addresses air pollution from ships and includes fuel-oil quality and Bunker Delivery Note requirements.

### Mooring

Securing a vessel to a berth, buoy, anchor arrangement, or another vessel. Mooring condition and checks are important during transfer operations.

### Nomination

A customer's formal request or instruction for a fuel delivery, normally identifying the vessel, product, quantity, location, and expected delivery window.

### Port husbandry

Support services arranged for a vessel while in port, such as provisions, spares, water, crew support, transport, documentation, and other supplies.

### Sample seal

A uniquely identified tamper-evident seal applied to a representative fuel sample. Seal identity and custody help link the sample to the delivery if quality is disputed.

### Sounding

A measurement used to determine the depth of liquid in a tank, usually taken from a defined reference point. A calibration table is then used to derive volume.

### STS — Ship-to-Ship transfer

Transfer of cargo or fuel between vessels positioned alongside each other. STS work requires operation-specific safety, mooring, communication, and transfer controls.

### Sulphur content

The proportion of sulphur in a fuel. Limits and evidence requirements depend on the applicable fuel rules, location, vessel, and current MARPOL requirements.

### Ullage

The empty vertical space between the liquid surface and a tank's defined reference point. A tank calibration table can convert ullage into volume.

### Viscosity

A measure of a fluid's resistance to flow. Petroleum-product viscosity depends on temperature and the specified test method.

## Petroleum measurement and reconciliation

### AGO — Automotive Gas Oil

A petroleum middle-distillate product commonly referred to as diesel in Nigerian commercial operations. Product specifications and permitted use depend on the applicable contract and regulation.

### API MPMS

American Petroleum Institute Manual of Petroleum Measurement Standards. A collection of standards covering petroleum measurement. Always identify the applicable chapter, edition, units, and calculation procedure.

### ASTM D1250

ASTM guidance used with petroleum measurement tables and API MPMS Chapter 11.1 for standardizing petroleum quantities at reference conditions. Do not implement calculations from the glossary; use the licensed, applicable standard and verified test vectors.

### Density

Mass per unit volume at stated conditions. Petroleum density varies with temperature, so both the value and its reference or observed temperature matter.

### GOV — Gross Observed Volume

The measured petroleum volume at the observed temperature before standard temperature correction and relevant deductions. **Verify before implementation:** terminology and calculation sequence under the applicable API MPMS procedure.

### GSV — Gross Standard Volume

Gross petroleum volume corrected from observed conditions to the specified reference temperature before applicable sediment-and-water deductions. **Verify before implementation:** the governing standard, inputs, units, and calculation sequence.

### Gross and tare weight

Gross weight is the loaded vehicle or container weight. Tare weight is its empty weight. Their difference is the net payload, subject to the measurement and operational rules in use.

### NSV — Net Standard Volume

The petroleum volume adjusted to standard reference conditions and after applicable deductions such as sediment and water. **Verify before implementation:** the exact inputs and procedure required by the governing standard and contract.

### Reconciliation

Comparing quantities recorded at different points—such as tank, meter, truck, vessel, or customer receipt—to identify expected differences, losses, timing differences, or errors.

### Reference temperature

The standard temperature to which an observed petroleum volume is corrected so quantities measured under different conditions can be compared. Common references include 15°C and 20°C; the contract and governing standard decide which applies.

### Shrinkage

The reduction between expected and recorded product quantity. It may result from temperature, handling, measurement uncertainty, evaporation, leakage, theft, or data error; it must not automatically be classified as fraud or physical loss.

### Table 54 / Table 54B

Historical petroleum measurement table designations associated with correcting observed volume to a reference temperature. **Verify before implementation:** product group, units, reference temperature, current API MPMS/ASTM implementation procedure, precision, and rounding.

### Table 56

A historical petroleum measurement table designation commonly associated with weight or mass conversion. **Verify before implementation:** the applicable product, units, density basis, air/vacuum convention, edition, precision, and calculation sequence.

### VCF — Volume Correction Factor

A factor used to convert a petroleum volume observed at one temperature to its equivalent at a specified reference temperature under an applicable measurement standard.

### VLSFO — Very Low Sulphur Fuel Oil

A marine residual or blended fuel marketed to meet an applicable sulphur limit, commonly associated with the global 0.50% mass-by-mass MARPOL limit. The delivered product still requires specification and compliance evidence.

### Water cut

The proportion or detected presence of water in a petroleum stream, cargo, or tank measurement. The term and method can vary by operation; software must record the test or measurement basis.

## Pipeline integrity and field services

### Anode

A component used in cathodic-protection systems to supply protective current and reduce corrosion of a buried or submerged metal structure.

### ASME B31.4

An ASME code associated with pipeline transportation systems for liquids and slurries. Applicability depends on the facility, fluid, jurisdiction, contract, and adopted edition. **Verify before implementation.**

### ASME B31.8

An ASME code associated with gas transmission and distribution piping systems. Applicability depends on the facility, fluid, jurisdiction, contract, and adopted edition. **Verify before implementation.**

### Cathodic protection — CP

A corrosion-control technique that makes the protected metal structure act as the cathode of an electrochemical cell. Systems require design, monitoring, and interpretation by qualified personnel.

### CIPS — Close-Interval Potential Survey

A field survey that records pipe-to-soil potential measurements at close intervals to assess cathodic-protection performance along a buried pipeline.

### CSE — Copper/Copper Sulphate Electrode

A reference electrode commonly used when measuring pipe-to-soil potentials for buried steel pipeline cathodic-protection surveys.

### Corrosion

Degradation of a material through chemical or electrochemical interaction with its environment. Corrosion assessment depends on material, environment, geometry, measurements, and an applicable engineering method.

### DCVG — Direct Current Voltage Gradient

A survey method used to locate and assess indications of coating defects on buried pipelines by measuring voltage gradients in the soil.

### DFT — Dry Film Thickness

The thickness of a cured coating, usually measured after application. Acceptance limits depend on the coating system and specification.

### Hydrotest — Hydrostatic test

A pressure test, commonly using water, performed to evaluate the integrity or leak tightness of a pipeline, tank, or pressure system. Test pressure, duration, temperature compensation, acceptance, and safety requirements must come from the governing procedure and code.

### ILI — In-line inspection

Inspection performed by an instrument travelling inside a pipeline to collect condition data. Tools may detect metal loss, geometry changes, cracks, or other features depending on their technology.

### KP — Kilometre Point

A distance reference along a pipeline or route, normally measured from an agreed origin. Project conventions determine the precise origin and formatting.

### MFL — Magnetic Flux Leakage

An in-line inspection or nondestructive-testing technique that detects magnetic-field leakage associated with metal-loss indications in ferromagnetic material.

### MTC — Material Test Certificate

A document supplied for a material or component that records identity, specification, chemical composition, mechanical properties, heat or batch traceability, and test results as applicable.

### NDT — Nondestructive Testing

Inspection methods used to examine material or components without making them unusable. Examples include ultrasonic, radiographic, magnetic-particle, dye-penetrant, and visual testing.

### Pig

A device sent through a pipeline for cleaning, separating products, gauging, dewatering, or inspection. The purpose and design determine the pig type.

### Pig launcher and receiver

Pressure-containing facilities used to insert a pig into a pipeline and remove it after a run.

### Pigging run

The controlled passage of a pig through a pipeline, including launch, tracking, operating conditions, arrival, recovery, and result recording.

### Rectifier

Equipment that converts alternating current to direct current for an impressed-current cathodic-protection system.

### Remaining life

An engineering estimate of how long equipment may remain fit for a defined service based on measured condition, degradation rate, loads, and acceptance criteria. It is not a simple date calculation. **Verify before implementation.**

### Right-of-way — ROW

The defined corridor in which a pipeline is installed and for which access, inspection, vegetation, encroachment, and third-party activity may be managed.

### UT — Ultrasonic Testing

A nondestructive-testing technique that uses ultrasonic waves to inspect material or measure thickness.

## Depot, gantry, and road haulage

### ATG — Automatic Tank Gauging

Instrumentation that automatically measures tank conditions such as product level, temperature, and sometimes water level or density.

### Compartment

A separately contained section of a road tanker. Loads, seals, valves, and delivered quantities may be tracked per compartment.

### e-Call-Up

An electronic appointment or traffic-management process used to schedule or control truck access to a facility or corridor. PetroLedger must not assume access to an external e-call-up API without a confirmed agreement.

### e-Waybill

An electronic transport document describing goods dispatched, parties, vehicle, route, quantities, and receipt evidence. Legal and regulatory requirements vary. **Verify before implementation.**

### Gantry

A loading structure at a terminal or depot where petroleum products are transferred into road tankers or other transport units.

### Geofence

A virtual geographic boundary used to detect entry, exit, or presence based on device or vehicle location. GPS data is evidence with known accuracy limits, not proof by itself.

### Holding park

A designated staging area where trucks wait, check in, or receive a loading or corridor-access slot before proceeding to a terminal.

### Meter ticket

A record produced from a metered transfer that identifies the transaction and measured quantity, often with meter, batch, product, time, and correction details.

### POD — Proof of Delivery

Evidence that a delivery reached the receiving party. It may include quantity, time, location, recipient identity, condition checks, documents, photographs, or signature.

### RFID — Radio-Frequency Identification

Technology that identifies tagged objects using radio communication. A read confirms that a tag was detected; system design determines whether that reliably establishes vehicle, driver, or cargo identity.

### Route deviation

A vehicle movement outside an authorized or expected route or corridor. Alert thresholds should allow for GPS accuracy, diversions, emergencies, and approved operational changes.

### Weighbridge

A large scale used to weigh a vehicle. A loaded and empty measurement can be used to calculate net payload, subject to calibration and operating controls.

### FRSC

Federal Road Safety Corps, the Nigerian federal body with road-safety and motor-vehicle administration responsibilities under its mandate.

## HSE, permits, and workforce

### BOSIET

Basic Offshore Safety Induction and Emergency Training. A common offshore safety-training course. Required provider, validity, and equivalence depend on the operator and jurisdiction.

### CAPA — Corrective and Preventive Action

A managed process for correcting the cause of a detected problem and preventing occurrence or recurrence. A CAPA record normally includes ownership, due dates, evidence, verification, and closure.

### Confined space

A space with limited entry or exit that is not designed for continuous occupancy and may contain serious atmospheric or physical hazards. Legal definitions and entry controls vary. **Verify before implementation.**

### Gas test

Measurement of an atmosphere for hazards such as oxygen deficiency or enrichment, flammable gas, and toxic gases before or during work.

### HSE

Health, Safety, and Environment. The organizational discipline concerned with worker health, operational safety, and environmental protection.

### H2S — Hydrogen sulphide

A highly toxic, flammable gas that can occur in petroleum operations. Measurements, alarms, exposure limits, and response actions are safety-critical and jurisdiction-dependent.

### HUET

Helicopter Underwater Escape Training. Training for escape from a helicopter following a water impact, often included within offshore training programmes.

### JSA — Job Safety Analysis

A structured breakdown of a job into steps, associated hazards, and controls before work begins. It may also be called a Job Hazard Analysis.

### LEL — Lower Explosive Limit

The lowest concentration of a flammable gas or vapour in air that can propagate flame under specified conditions. Instruments often report a percentage of LEL; interpretation and action thresholds require an approved procedure.

### Near miss

An unplanned event that did not cause injury, damage, or loss but had the potential to do so.

### O2

Oxygen. Atmospheric testing commonly checks oxygen percentage because deficient or enriched atmospheres can be dangerous. Acceptable ranges must come from the applicable procedure and law.

### OSP

Offshore Safety Permit in the Nigerian offshore context. **Verify before implementation:** issuing authority, current categories, validity, and verification mechanism.

### OIM — Offshore Installation Manager

The person with overall authority and responsibility for an offshore installation during operations. Exact authority and approval duties depend on the installation and governing procedures.

### POB — Personnel on Board

The count and identity roster of people currently present on a vessel, offshore installation, or controlled site, used for operational and emergency accountability.

### PTW — Permit to Work

A formal authorization controlling specified work for a limited time and place after hazards, precautions, isolations, tests, and approvals are confirmed. A PTW is not merely a printable form; its state transitions and authority are safety controls.

### Risk matrix

A method that combines likelihood and consequence categories to assign a risk level. Matrix definitions and escalation rules must be configured from an approved organizational standard.

### STCW

The International Convention on Standards of Training, Certification and Watchkeeping for Seafarers. It establishes international requirements for seafarer training and certification.

### Toolbox talk

A short, task-focused safety discussion held before work or when conditions change, covering hazards, controls, responsibilities, and questions.

## Nigerian regulation and local content

### NCDMB

Nigerian Content Development and Monitoring Board. The body responsible for implementing and monitoring Nigerian content requirements in the Nigerian oil and gas industry.

### NCDF

Nigerian Content Development Fund. A statutory fund associated with development of Nigerian content in the oil and gas industry. Contribution and compliance rules must be verified against current NCDMB requirements.

### NCEC — Nigerian Content Equipment Certificate

An NCDMB certificate associated with equipment used by service companies in the Nigerian oil and gas industry. NCDMB directs applications through NOGIC JQS. **Verify before implementation:** current categories, prerequisites, workflow, and validity.

### NCFCC — Nigerian Content Development Fund Compliance Certificate

A certificate relating to compliance with applicable NCDF obligations. **Verify before implementation:** official current name, prerequisites, issuing workflow, validity, and relationship to other approvals.

### NIMASA

Nigerian Maritime Administration and Safety Agency. A federal agency with responsibilities covering maritime safety, administration, security, labour, and pollution-related functions.

### NMDPRA

Nigerian Midstream and Downstream Petroleum Regulatory Authority. The regulator for midstream and downstream petroleum operations under the Petroleum Industry Act.

### NOGIC JQS

Nigerian Oil and Gas Industry Content Joint Qualification System. An NCDMB-operated industry database and portal used for registration, qualification, and processes including NCEC applications.

### NPA

Nigerian Ports Authority. The federal authority responsible for Nigerian port administration and operations within its statutory mandate.

### NUPRC

Nigerian Upstream Petroleum Regulatory Commission. The regulator for upstream petroleum operations under the Petroleum Industry Act.

### NESREA

National Environmental Standards and Regulations Enforcement Agency. A Nigerian federal agency responsible for enforcing environmental standards and regulations within its statutory mandate. Confirm the responsible authority for each waste stream and operation.

## Commercial and project controls

### BOQ — Bill of Quantities

A structured list of work items, descriptions, quantities, and often rates used for tendering, valuation, and progress payments in construction and EPC contracts.

### Day rate

A contractual amount charged or paid per day for a person, vessel, equipment item, or service. Rules for active, standby, mobilization, weather, and partial days come from the contract.

### Demurrage

A contractual charge resulting from a vessel, truck, or other transport asset being detained beyond the allowed time. Trigger, exclusions, calculation, and evidence are contract-specific.

### FX rate snapshot

The exchange rate and source recorded for a transaction at a defined time so later reporting can reproduce how currency conversion was calculated.

### IPC — Interim Payment Certificate

A periodic certification of the value of work completed and amount payable under a construction or EPC contract, subject to its measurement, retention, deduction, and approval terms.

### Job costing

Assigning labour, materials, equipment, subcontract, and overhead costs to a specific job to understand cost, margin, and variance.

### Mobilization and demobilization

Moving personnel, equipment, and resources to a worksite and later removing them. Contracts may price and approve these activities separately.

### Naira and USD dual ledger

Recording transaction values in Nigerian naira and United States dollars where required, while preserving the original currency, monetary amount, exchange-rate source, and effective time. It does not mean mixing currencies in one balance.

### Retention

A contractually withheld portion of payment held until specified completion or defect obligations are satisfied. Do not confuse contractual payment retention with data-retention policy.

### Variation

An approved change to contracted scope, quantity, specification, schedule, or price. Requirements for instruction, valuation, approval, and evidence depend on the contract.

## Procurement and marine-supply terms

### AOG — Aircraft on Ground

An urgent logistics designation indicating that an aircraft cannot operate until a required part or service is supplied. When used for non-aviation deliveries, confirm whether it is literal or informal shorthand for urgency.

### IMPA catalogue

A widely used marine stores coding and reference catalogue published by the International Marine Purchasing Association. Product codes aid identification but do not replace specification and compatibility checks.

### OCTG — Oil Country Tubular Goods

Steel tubular products used in oil and gas wells, such as casing, tubing, and drill pipe. Do not apply the term automatically to all line pipe or yard stock.

### WAT — West Africa Time

The UTC+1 civil time zone used in Nigeria. Backend timestamps should remain timezone-aware; WAT is a presentation format, not a reason to store naive local timestamps.

## Software and security terms used in this project

### Fleet draft

A resumable HaulTrac setup record that groups one customer, a loading origin
and delivery destination, one truck, one trailer, and one driver. It is not an
active trip. After all five stages are complete, the ready fleet can be used to
create a dispatch.

### Idempotency

The property that safely repeating the same operation produces no additional unintended effect. It is essential for retried payments, sync operations, webhooks, imports, and background jobs.

### RLS — Row-Level Security

A PostgreSQL feature that applies database policies to decide which rows a database role can read or modify. PetroLedger intends to use it as defence in depth, not as a replacement for application authorization.

### Tenant

A customer organization whose users, configuration, and records share the platform while remaining isolated from other customer organizations.

### Tenant context

The server-verified identity of the tenant for the current operation. It must be derived from authenticated membership or an explicitly authorized service operation, not trusted directly from client input.

### Multi-tenant

An architecture in which one application serves multiple customer organizations while enforcing isolation of their data and operations.

### Zero trust

A security approach that does not grant implicit trust merely because a user, device, or service is inside a network. Access decisions are based on verified identity, resource, context, and policy.

## Authoritative starting points

- Product scope and project cautions: `PetroLedger_Product_Specification_v3.md`
- ASTM D1250 overview: <https://www.astm.org/d1250>
- API petroleum measurement standards: <https://www.api.org/products-and-services/standards/important-standards-announcements/petroleum-measurement>
- IMO MARPOL overview: <https://www.imo.org/en/about/conventions/pages/international-convention-for-the-prevention-of-pollution-from-ships-(marpol).aspx>
- NCDMB services and procedures: <https://ncdmb.gov.ng/services-and-procedures/>
- NMDPRA: <https://www.nmdpra.gov.ng/>
- NUPRC: <https://www.nuprc.gov.ng/>

Before implementing a formula, threshold, retention period, certificate rule, or regulatory workflow, confirm the current authoritative publication and adopted edition.
