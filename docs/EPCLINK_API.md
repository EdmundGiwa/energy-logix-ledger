# EPC-Link API Contract (Module 8)

## Overview

EPC-Link provides unified engineering, procurement, and construction material management for energy infrastructure projects. It tracks material requisitions, pipe-yard tubular/structural inventory, mill metallurgy, heat numbers, Material Test Certificates (EN 10204 3.1 & 3.2), QR-code rack/bay positioning, approved vendor lists (AVL), material issue slips, and automated Nigerian Content (NCDMB / NOGIC-JQS) compliance packs.

Base URL: `/api/v1/epclink/`

## Authentication & Tenancy

- All endpoints require authentication (`SessionAuthentication` or bearer token).
- Organization tenancy is derived exclusively from the authenticated user's active membership.
- PostgreSQL Row-Level Security (RLS) is active on all tables (`epc_link_approvedvendor`, `epc_link_materialrequisition`, `epc_link_pipeyarditem`, `epc_link_materialissueslip`, `epc_link_materialissueslipitem`, `epc_link_epclinkauditevent`).
- Audit events are strictly append-only and database-immutable.

---

## Endpoints

### 1. Dashboard Summary
- **Endpoint**: `GET /api/v1/epclink/summary/`
- **Response**:
```json
{
  "total_yard_items": 142,
  "available_yard_items": 98,
  "reserved_yard_items": 24,
  "total_requisitions": 18,
  "pending_requisitions": 3,
  "approved_requisitions": 12,
  "total_vendors": 15,
  "active_vendors": 14,
  "total_issue_slips": 29,
  "overall_nigerian_content_percent": "86.40"
}
```

---

### 2. Approved Vendor List (AVL)
- **List Vendors**: `GET /api/v1/epclink/vendors/` (filter by `category`, `status`, `search`)
- **Register Vendor**: `POST /api/v1/epclink/vendors/`
```json
{
  "vendor_name": "Tenaris Global Services Nigeria",
  "category": "tubulars",
  "audit_rating": "A",
  "nogic_jqs_id": "NOGIC-VND-9921",
  "nuprc_permit_ref": "NUPRC/PTS/2026/881",
  "iso_certification": "ISO 9001:2015 & API Spec Q1 Certified",
  "contact_email": "procurement@tenaris.com.ng",
  "contact_phone": "+234 803 123 4567"
}
```
- **Vendor Detail**: `GET /api/v1/epclink/vendors/{public_id}/`
- **Update Vendor**: `PATCH /api/v1/epclink/vendors/{public_id}/`

---

### 3. Material Requisitions
- **List Requisitions**: `GET /api/v1/epclink/requisitions/` (filter by `status`, `priority`, `search`)
- **Create Requisition**: `POST /api/v1/epclink/requisitions/`
```json
{
  "project_name": "Bonga North Subsea Flowline Tie-back",
  "client_name": "Shell SNEPCo",
  "wbs_code": "WBS-BN-SUBSEA-04",
  "priority": "urgent",
  "required_date": "2026-11-15",
  "delivery_location": "Onne Free Zone Pipe Yard Bay 3",
  "estimated_cost_minor": 8500000000,
  "currency": "NGN",
  "notes": "Seamless flowline pipes required for deepwater sour service"
}
```
- **Requisition Detail**: `GET /api/v1/epclink/requisitions/{public_id}/`
- **Transition Requisition**: `POST /api/v1/epclink/requisitions/{public_id}/actions/{action}/`
  - Allowed actions: `submit`, `approve`, `reject`, `resubmit`, `fulfill`, `cancel`.
  - Body:
```json
{
  "version": 1,
  "reason": "Technical specification verified by lead piping engineer"
}
```

---

### 4. Pipe-Yard & Structural Inventory
- **List Yard Items**: `GET /api/v1/epclink/yard-items/` (filter by `material_type`, `status`, `heat_number`, `search`)
- **Intake Yard Item**: `POST /api/v1/epclink/yard-items/`
```json
{
  "material_type": "line_pipe",
  "grade_specification": "API 5L X65 PSL2 DNV-ST-F101",
  "outer_diameter_inches": "12.750",
  "wall_thickness_mm": "19.05",
  "schedule": "SCH 80",
  "length_meters": "12.20",
  "quantity": "50.00",
  "unit_of_measure": "joints",
  "heat_number": "HT-772819-B",
  "mill_manufacturer": "Tenaris Confab Steel Mill",
  "mtc_number": "MTC-EN10204-3.1-9942",
  "mtc_type": "en_10204_3_1",
  "yield_strength_mpa": "525.00",
  "tensile_strength_mpa": "620.00",
  "impact_test_joules": "185.00",
  "yard_location": "Onne Pipe Yard",
  "bay_rack_position": "Bay 4 - Rack 2 - Tier 1",
  "vendor_id": "8c59f0f9-2c7e-4ea7-9a89-e16e680a6b7e",
  "unit_cost_minor": 120000000,
  "currency": "NGN",
  "nigerian_content_percent": "85.00",
  "notes": "External 3LPE anti-corrosion coating applied"
}
```
- **Yard Item Detail**: `GET /api/v1/epclink/yard-items/{public_id}/`

---

### 5. Material Issuance
- **List Issue Slips**: `GET /api/v1/epclink/issue-slips/` (filter by `requisition_id`)
- **Issue Materials**: `POST /api/v1/epclink/issue-slips/`
```json
{
  "requisition_id": "4b68e982-5884-473d-9d7a-7bf386a63412",
  "issued_to": "Engr. Patrick Bassey (OIM)",
  "contractor_name": "Subsea 7 West Africa Ltd",
  "issued_date": "2026-10-25",
  "receiver_signature_ref": "SIG-SS7-PBASSEY-9901",
  "notes": "Loaded onto North Sea Giant pipelay barge",
  "mark_fulfilled": false,
  "items": [
    {
      "yard_item_id": "119e7a4b-2d93-4560-93cb-33989e224e77",
      "quantity_issued": "15.00",
      "notes": "Joints 01 to 15"
    }
  ]
}
```

---

### 6. Nigerian Content Report (NCDMB / NOGIC-JQS Audit Pack)
- **Endpoint**: `GET /api/v1/epclink/nigerian-content-report/`
- **Response**:
```json
{
  "organization_name": "Alpha EPC Solutions Ltd",
  "generated_at": "2026-10-25T16:30:00Z",
  "inventory_summary": {
    "total_unique_tags": 142,
    "total_quantity_stock": "1840.00",
    "total_inventory_value_minor": 124500000000,
    "overall_nigerian_content_percent": "86.40"
  },
  "mtc_compliance": {
    "mtc_3_1_or_3_2_coverage_percent": "100.00",
    "breakdown": [
      { "mtc_type": "en_10204_3_1", "count": 110 },
      { "mtc_type": "en_10204_3_2", "count": 32 }
    ]
  },
  "material_type_distribution": [
    { "material_type": "line_pipe", "count": 82, "total_qty": "950.00" },
    { "material_type": "structural", "count": 35, "total_qty": "520.00" },
    { "material_type": "flanges_fittings", "count": 25, "total_qty": "370.00" }
  ],
  "vendor_governance": {
    "total_approved_vendors": 15,
    "active_qualified_vendors": 14,
    "nogic_jqs_registered_vendors": 15
  }
}
```
