# TankWorks API Contract (Module 7)

## Overview

TankWorks manages industrial tank farm operations including tank bottom sludge evacuation, hazardous waste consignments, abrasive blasting, high-performance internal recoating, NACE/AMPP QA/QC dry film thickness (DFT) & adhesion testing, SafePass confined-space entry interlocks, and daily resource utilization tracking.

Base URL: `/api/v1/tankworks/`

## Authentication & Multi-Tenancy

- All endpoints require authentication (`SessionAuthentication` or bearer token).
- Tenant organization context is derived server-side from the authenticated user's active membership.
- PostgreSQL Row-Level Security (RLS) is enforced across all tables (`tank_works_tankfieldjob`, `tank_works_sludgewastemanifest`, `tank_works_coatinginspection`, `tank_works_crewequipmentutilization`, `tank_works_tankworksauditevent`).
- Audit trail events are strictly append-only and immutable. Cross-tenant foreign keys are rejected at the database level by trigger functions.

---

## Endpoints

### 1. Dashboard Summary
- **Endpoint**: `GET /api/v1/tankworks/summary/`
- **Response**:
```json
{
  "total_jobs": 12,
  "active_jobs": 4,
  "permit_pending_jobs": 2,
  "completed_jobs": 5,
  "total_waste_evacuated_qty": "450.50",
  "total_coating_inspections": 28,
  "passed_coating_inspections": 26,
  "total_man_hours": "1420.00",
  "total_equipment_hours": "380.00"
}
```

---

### 2. Tank Field Jobs
- **List Jobs**: `GET /api/v1/tankworks/jobs/`
  - Query parameters: `status`, `scope`, `search`, `page`, `page_size`
- **Create Job**: `POST /api/v1/tankworks/jobs/`
  - Body:
```json
{
  "client_name": "Shell Petroleum Development Company",
  "terminal_or_facility": "Bonny Crude Oil Terminal",
  "tank_identifier": "TK-101-CRUDE",
  "tank_capacity_m3": "50000.00",
  "scope_of_work": "full_refurb",
  "estimated_cost_minor": 4500000000,
  "currency": "NGN",
  "notes": "Full internal overhaul with SA 2.5 blasting and epoxy phenolic lining"
}
```
- **Job Detail**: `GET /api/v1/tankworks/jobs/{public_id}/`
- **Update Job**: `PATCH /api/v1/tankworks/jobs/{public_id}/`

---

### 3. Job Workflow Transitions & SafePass Interlock
- **Endpoint**: `POST /api/v1/tankworks/jobs/{public_id}/actions/{action}/`
- **Allowed Actions**:
  - `draft` -> `submit_permit` -> `permit_pending`
  - `permit_pending` -> `activate` -> `active` *(Requires SafePass permit ref & verified gas test clearance)*
  - `active` -> `commence_inspection` -> `inspection`
  - `inspection` -> `complete` -> `completed`
  - `inspection` -> `reopen_active` -> `active`
  - Any non-completed status -> `cancel` -> `cancelled`
- **Request Body**:
```json
{
  "version": 1,
  "reason": "SafePass CSE Permit issued and atmospheric gas readings cleared (0.0% LEL, 20.9% O2, 0ppm H2S)",
  "permit_data": {
    "safepass_permit_ref": "PTW-BONNY-CSE-092",
    "gas_test_cleared": true
  }
}
```
- **Error Codes**:
  - `400 Bad Request`: Invalid transition or missing safety clearance (`gas_test_cleared=false`).
  - `409 Conflict`: Stale job version supplied (`version` mismatch).

---

### 4. Sludge & Waste Manifests
- **List Manifests**: `GET /api/v1/tankworks/manifests/` (filter by `job_id`, `waste_classification`)
- **Record Manifest**: `POST /api/v1/tankworks/manifests/`
```json
{
  "job_id": "8c59f0f9-2c7e-4ea7-9a89-e16e680a6b7e",
  "waste_classification": "hydrocarbon_sludge",
  "quantity": "35.50",
  "unit_of_measure": "metric_tonnes",
  "transporter_name": "Dangote Environmental Haulage",
  "vehicle_registration": "RSH-492-XA",
  "driver_name": "Musa Ibrahim",
  "nesrea_permit_number": "NESREA/HAZ/2026/099",
  "disposal_facility": "Port Harcourt Thermal Desorption Plant",
  "treatment_method": "Thermal Desorption & TDU Ash Solidification",
  "is_consignment_signed": true,
  "notes": "Consignment note #4401 counter-signed by Shell HSE officer"
}
```

---

### 5. Coating Inspections (QA/QC)
- **List Inspections**: `GET /api/v1/tankworks/inspections/` (filter by `job_id`, `passed`)
- **Record Inspection**: `POST /api/v1/tankworks/inspections/`
```json
{
  "job_id": "8c59f0f9-2c7e-4ea7-9a89-e16e680a6b7e",
  "surface_location": "Internal Shell Course 1 & 2",
  "blast_standard": "SSPC-SP 10 / NACE No. 2 (Near-White Metal)",
  "surface_profile_microns": "75.00",
  "coating_system": "Jotun Tankguard Plus (2 x 150µm)",
  "specified_dft_microns": 300,
  "measured_min_dft_microns": 280,
  "measured_avg_dft_microns": 320,
  "measured_max_dft_microns": 360,
  "adhesion_test_method": "ASTM D4541 Dolly Pull-off",
  "adhesion_result_mpa": "14.50",
  "ambient_temp_c": "29.50",
  "steel_temp_c": "32.00",
  "relative_humidity_percent": "74.00",
  "dew_point_c": "24.50",
  "inspector_name": "Engr. Nnamdi Okon",
  "nace_level": "NACE / AMPP Level 3 Certified",
  "notes": "Steel temp > 3°C above dew point. DFT adheres to SSPC-PA 2 80-20 rule."
}
```

---

### 6. Crew & Equipment Utilization
- **List Utilization**: `GET /api/v1/tankworks/utilization/` (filter by `job_id`)
- **Log Utilization**: `POST /api/v1/tankworks/utilization/`
```json
{
  "job_id": "8c59f0f9-2c7e-4ea7-9a89-e16e680a6b7e",
  "entry_date": "2026-10-25",
  "personnel_role": "Blaster / Painter Crew",
  "headcount": 6,
  "man_hours": "60.00",
  "equipment_description": "Ingersoll Rand 750 CFM Compressor & Blast Pot",
  "equipment_hours": "9.50",
  "consumables_used": "50 bags Copper Slag Grit, 40L Jotun Thinner #17"
}
```
