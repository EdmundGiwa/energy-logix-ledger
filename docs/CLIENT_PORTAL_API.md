# Client Portal API Specification (Module 11)

## Overview
The Client Portal enables oil & gas supermajors and industrial off-takers (e.g., Shell, Chevron, TotalEnergies, NLNG, Dangote) to securely access verified operational deliverables, certified inspection dossiers, zero-drop hydrotest sign-offs, marine bunker delivery notes (BDN), statutory compliance evidence, and commercial statements.

Client access is strictly isolated: external client representatives only ever view approved, published records (`SharedDeliverablePackage`) associated with their explicit client organization. Every deliverable is sealed with a cryptographic SHA-256 verification hash, and every view/verification attempt is recorded in an immutable audit access log.

---

## Authentication & Multi-Tenancy
- **Session / Token Auth**: Authenticated via standard Django session or Bearer token.
- **Tenant Context**: Derived server-side from active organization membership; client-provided tenant headers are never authoritative.
- **Client Identity Boundary**: If the authenticated user has a linked `ClientPortalProfile`, all queries are strictly filtered to `client_name == profile.client_name`. Internal staff (owners, admins, operations) can inspect across clients.
- **PostgreSQL Row-Level Security**: Enabled across `client_portal_clientportalprofile`, `client_portal_shareddeliverablepackage`, and `client_portal_clientportalaccesslog`.
- **Audit Immutability**: All access events logged in `ClientPortalAccessLog` are protected by a PostgreSQL trigger prohibiting updates and deletions.

---

## Endpoints

### 1. Portal Summary
`GET /api/v1/portal/summary/`
Returns key statistics for the client feed.

**Response `200 OK`**:
```json
{
  "is_client_user": true,
  "client_name": "Shell Petroleum",
  "total_deliverables": 14,
  "total_access_events": 42,
  "active_client_profiles": 4,
  "deliverables_by_type": {
    "bunker_bdn": 6,
    "hydrotest_dossier": 3,
    "inspection_report": 2,
    "commercial_invoice": 3
  }
}
```

---

### 2. Deliverables Feed
`GET /api/v1/portal/feed/?deliverable_type=<type>&search=<query>&client_name=<client>`
Paginated list of shared deliverable packages. External client profiles automatically filter by their client name.

**Query Parameters**:
- `deliverable_type`: (Optional) `bunker_bdn`, `haulage_pod`, `hydrotest_dossier`, `inspection_report`, `compliance_evidence`, `commercial_invoice`.
- `search`: (Optional) matches against `title` or `source_reference`.
- `client_name`: (Optional, internal staff only) filter by client.

**Response `200 OK`**:
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "public_id": "b78b0f85-3b95-4672-91f8-0624a0dbeeb0",
      "client_name": "Shell Petroleum",
      "title": "Offshore Bunker BDN - MT Valiant",
      "deliverable_type": "bunker_bdn",
      "source_reference": "BDN-2026-VAL-001",
      "summary_metadata": {
        "fuel_grade": "VLSFO",
        "quantity_mt": 1250,
        "vessel": "MT Valiant"
      },
      "verification_seal": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "expires_at": null,
      "created_at": "2026-10-25T15:00:00Z",
      "updated_at": "2026-10-25T15:00:00Z"
    }
  ]
}
```

---

### 3. Deliverable Package Detail
`GET /api/v1/portal/packages/<uuid:public_id>/`
Retrieves single deliverable package and automatically records an immutable access event.

**Response `200 OK`**:
Returns deliverable package object. If the client user does not match the package client, `403 Forbidden` is returned.

---

### 4. Cryptographic Verification
`GET /api/v1/portal/packages/<uuid:public_id>/verify/`
Validates cryptographic integrity against the SHA-256 seal.

**Response `200 OK`**:
```json
{
  "public_id": "b78b0f85-3b95-4672-91f8-0624a0dbeeb0",
  "source_reference": "BDN-2026-VAL-001",
  "verification_seal": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "is_valid": true,
  "verified_at": "2026-10-25T15:00:00Z"
}
```

---

### 5. Publish Deliverable Package
`POST /api/v1/portal/packages/`
Allows internal operations/admin staff to publish a verified deliverable to a client.

**Request Payload**:
```json
{
  "client_name": "Shell Petroleum",
  "title": "Pipeline Hydrotest Zero-Drop Dossier - Section B",
  "deliverable_type": "hydrotest_dossier",
  "source_reference": "HYD-2026-SHL-04",
  "summary_metadata": {
    "test_pressure_bar": 155,
    "hold_duration_hours": 24,
    "temperature_celsius": 28.5
  }
}
```

---

### 6. Client Portal Profiles
`GET /api/v1/portal/profiles/`
List client portal user profiles for the organization.

`POST /api/v1/portal/profiles/`
Assign a user account to an external client profile (Admin/Owner only).
```json
{
  "target_user_id": 42,
  "client_name": "TotalEnergies EP",
  "client_customer_code": "TTEP-02",
  "allowed_modules": ["haulage", "pipe_integrity", "compliance", "billing"]
}
```

---

### 7. Audit Access Logs
`GET /api/v1/portal/audit-logs/`
Paginated immutable log of deliverable package access and verification events.
