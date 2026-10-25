# Owner Dashboard API Specification (Module 12)

## Overview
The Owner Dashboard provides executive operating intelligence and live cross-module Key Performance Indicators (KPIs) aggregating real-time data across all 11 modules:
- Financial & Billing (gross billed minor, collections, receivables ageing, active IPC retentions).
- Marine & Bunkering (delivered tonnage MT, turnaround hours, density conversions).
- Haulage & HaulTrac (dispatch volume, turnaround cycle times, in-transit shrinkage loss %).
- SafePass & HSE (man-hours without LTI, active PTWs, gas test clearance).
- PipeIntegrity (inspected joints, zero-drop hydrotest hold clearance %).
- RefineryLink (gantry meter tickets, loading vs discharge reconciliation %).
- MarineStores (catalogue items, low stock alerts, MARPOL refrigerant cylinders).
- TankWorks (active refurb jobs, evacuated sludge volumes, coating adhesion %).
- Compliance Shield (statutory permit expiry alerts <=7d / <=30d, ISO non-conformances).
- Client Portal (shared certified deliverables, cryptographic verification seal hits).

The module also delivers a real-time **Exception Feed** highlighting critical anomalies (e.g. gantry variance >0.5%, failed gas tests, expired certifications) and tenant-scoped **Executive Export Jobs** for board packs and regulatory audits.

---

## Authentication & Multi-Tenancy
- **Session / Bearer Token**: Standard DRF authentication with tenant membership context derived server-side.
- **PostgreSQL Row-Level Security**: Enforced across all tables (`owner_dashboard_executivekpisnapshot`, `owner_dashboard_executiveexceptionalert`, `owner_dashboard_executiveexportjob`).
- **Role-Based Permissions**: All authenticated members can view live projections; only `OWNER` and `ADMIN` can acknowledge critical exception alerts or trigger executive board exports.

---

## Endpoints

### 1. Live Executive KPIs
`GET /api/v1/owner/kpis/?currency=USD`
Returns live cross-module KPI projections.

**Query Parameters**:
- `currency`: (Optional) `USD` (default) or `NGN`.

**Response `200 OK`**:
```json
{
  "public_id": "84c8fb23-398d-4cb0-94d0-23a9b24479e0",
  "as_of_date": "2026-10-25",
  "currency": "USD",
  "gross_billed_minor": 18624000,
  "collected_minor": 12400000,
  "outstanding_receivables_minor": 6224000,
  "ipc_retention_held_minor": 4210000,
  "product_delivered_tonnage": "3420.00",
  "avg_shrinkage_percent": "0.18",
  "avg_turnaround_hours": "4.2",
  "reconciliation_rate_percent": "98.60",
  "active_field_jobs_count": 8,
  "critical_risk_items_count": 2,
  "warning_risk_items_count": 5,
  "module_breakdown": {
    "billing": {
      "invoices_billed_minor": 18624000,
      "collections_minor": 12400000,
      "outstanding_minor": 6224000
    },
    "compliance": {
      "critical_expiries": 2,
      "warning_expiries": 5
    },
    "active_operations": {
      "field_jobs_count": 8
    }
  },
  "created_at": "2026-10-25T17:00:00Z",
  "updated_at": "2026-10-25T17:00:00Z"
}
```

---

### 2. Executive Exception Feed
`GET /api/v1/owner/exceptions/?severity=<crit|warn|info>&module=<module>&is_acknowledged=<true|false>`
Paginated list of operational anomalies.

`POST /api/v1/owner/exceptions/`
Submit an operational exception (Owner/Admin).
```json
{
  "severity": "crit",
  "module": "refinery_link",
  "title": "Refinery Gantry Variance > 0.5%",
  "description": "Depot BK-07 discharge showed 0.72% loss on truck NG-LAG-4412",
  "source_record_type": "MeterTicket",
  "source_record_id": "TKT-2026-0881",
  "variance_percent": "0.720"
}
```

---

### 3. Acknowledge Exception
`POST /api/v1/owner/exceptions/<uuid:public_id>/acknowledge/`
Marks exception alert as reviewed and resolved by an executive officer.

**Response `200 OK`**:
```json
{
  "public_id": "0d61183c-6239-4444-9988-cb94a1120098",
  "is_acknowledged": true,
  "acknowledged_by_email": "ceo@offshora.energy",
  "acknowledged_at": "2026-10-25T17:05:00Z"
}
```

---

### 4. Executive Export Jobs
`GET /api/v1/owner/exports/`
List generated board briefings and audit packs.

`POST /api/v1/owner/exports/`
Request generation of an executive report.
```json
{
  "report_type": "executive_brief",
  "file_format": "pdf",
  "filters": {
    "period": "2026-Q3",
    "currency": "USD"
  }
}
```

`GET /api/v1/owner/exports/<uuid:public_id>/`
Retrieve download checksum and verification metadata.
