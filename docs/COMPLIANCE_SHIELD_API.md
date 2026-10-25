# Compliance Shield API Specification (Module 9)

## Overview
Compliance Shield provides statutory regulatory certificate tracking, expiry alerting, renewal lifecycle workflows, ISO 9001/14001/45001/API Spec audit and Non-Conformance Report (NCR) management, and compiled IOC pre-qualification evidence packs for energy service contractors.

All records are strictly multi-tenant isolated with PostgreSQL Row Level Security (RLS), immutable audit events, and optimistic concurrency version locking.

---

## Authentication & Multi-Tenancy
- **Session / Token Auth**: Authenticated via standard session or Bearer token.
- **Tenant Context**: Derived server-side from active membership; client-provided tenant headers are never authoritative.
- **PostgreSQL RLS**: Enforced on all tables with tenant isolation triggers.

---

## Endpoints

### 1. Compliance Summary & Expiry Alerts
`GET /api/v1/compliance/summary/`
Returns statutory compliance metrics, certificate status breakdowns, active alerts segmented by urgency tier (Critical <=7 days, Warning <=30 days, Notice <=60 days, Upcoming <=90 days), and open NCR counters.

**Response `200 OK`**:
```json
{
  "total_certificates": 12,
  "valid_certificates": 9,
  "expiring_soon_certificates": 2,
  "expired_certificates": 1,
  "renewal_pending_certificates": 1,
  "critical_alerts_7d": 1,
  "warning_alerts_30d": 1,
  "notice_alerts_60d": 2,
  "upcoming_alerts_90d": 3,
  "total_iso_audits": 4,
  "open_ncrs_count": 2,
  "total_evidence_packs": 3
}
```

---

### 2. Regulatory Certificates Register
`GET /api/v1/compliance/certificates/?regulator=<nuprc|nimasa|nmdpra|fmenv|ncdmb>&status=<valid|expiring_soon|expired|renewal_in_progress>&search=<query>`
Paginated list of statutory permits and certificates with days-to-expiry and urgency tiers.

`POST /api/v1/compliance/certificates/`
Registers a new statutory certificate.
```json
{
  "regulator": "nuprc",
  "certificate_type": "Offshore Pipeline Survey & Inspection Permit",
  "certificate_number": "NUPRC/PTS/2026/001",
  "issuing_authority": "Nigerian Upstream Petroleum Regulatory Commission",
  "issue_date": "2026-01-01",
  "expiry_date": "2026-12-31",
  "document_reference": "NUPRC-PTS-001.pdf",
  "notes": "Annual permit for deepwater survey operations"
}
```

`GET /api/v1/compliance/certificates/<uuid:public_id>/`
Retrieve certificate details.

`PATCH /api/v1/compliance/certificates/<uuid:public_id>/`
Optimistic locking update. Requires `"version": <int>`. Returns `409 Conflict` on version mismatch.

---

### 3. Certificate Lifecycle Actions
`POST /api/v1/compliance/certificates/<uuid:public_id>/actions/<action>/`
Supported actions:
- `submit_renewal`: Transitions status to `renewal_in_progress`.
  ```json
  {
    "renewal_tracking_number": "NUPRC-REN-2026-9918",
    "reason": "Submitted via NUPRC online regulatory portal"
  }
  ```
- `verify`: Verifies renewal, records `verified_by` and `verified_at`, and updates expiry date.
  ```json
  {
    "new_expiry_date": "2027-12-31",
    "reason": "Verified against official gazette registry"
  }
  ```

---

### 4. ISO Management Systems Audits
`GET /api/v1/compliance/iso-audits/?standard=<iso_9001|iso_14001|iso_45001|api_spec_q1>&audit_type=<surveillance|certification|internal>`
List ISO audit records with embedded non-conformance reports (NCRs).

`POST /api/v1/compliance/iso-audits/`
```json
{
  "standard": "iso_9001",
  "audit_type": "surveillance",
  "audit_scope": "Quality Management for Subsea Inspection",
  "certification_body": "Bureau Veritas Nigeria",
  "lead_auditor": "Engr. K. Adeleke",
  "audit_date": "2026-10-20",
  "next_audit_due": "2027-10-20",
  "overall_outcome": "certified",
  "certificate_number": "BV-ISO-9001-2026",
  "notes": "Surveillance audit passed with 1 minor observation"
}
```

---

### 5. Audit Non-Conformance Reports (NCRs)
`POST /api/v1/compliance/ncrs/`
Logs a new finding against an ISO audit record.
```json
{
  "audit_id": "<uuid:audit_public_id>",
  "severity": "minor",
  "finding_description": "Calibration tags missing on ultrasonic thickness gauge UTG-04",
  "root_cause_analysis": "PM interval expired without trigger",
  "corrective_action_plan": "Hook gauge into automated calibration schedule",
  "target_closure_date": "2026-11-20",
  "assigned_to": "QA Lead"
}
```

`POST /api/v1/compliance/ncrs/<uuid:public_id>/close/`
Closes an open NCR finding with sign-off notes.
```json
{
  "reason": "Calibrated with certified test gas and verified by QA Manager"
}
```

---

### 6. Evidence Packs & Prequalification Dossiers
`GET /api/v1/compliance/evidence-packs/`
List compiled compliance evidence packs.

`POST /api/v1/compliance/evidence-packs/`
Compiles a tamper-evident compliance evidence dossier snapshot:
```json
{
  "pack_name": "Shell SNEPCo Deepwater Prequalification Dossier",
  "target_stakeholder": "Shell Petroleum Development Company",
  "notes": "Consolidated evidence of valid NUPRC, NIMASA, and ISO certifications."
}
```
The endpoint automatically compiles current valid certificates and ISO management system audit statuses into an immutable JSON dossier payload.
