# BunkerFlow pilot contract

The pilot implements the controlled path from fuel nomination to an issued
Bunker Delivery Note (BDN). All endpoints use the existing session and CSRF
authentication contract in `AUTH_API.md` and are rooted at
`/api/v1/bunkerflow/`.

## Workflow

```text
draft -> confirmed -> sounding_recorded -> bdn_draft
      -> under_review -> approved -> issued
```

- Owners, administrators, and members may prepare operational records.
- Only owners and administrators may approve and issue a BDN.
- Viewers are read-only.
- Draft nominations and BDNs are editable. Issued BDNs, reviewed soundings,
  and audit events are protected from update and deletion in PostgreSQL.
- Every mutation that depends on current state carries a `version`. A stale
  version returns HTTP 409 and requires the client to refresh.
- Transition requests require a non-empty `reason`.
- Supplier and receiver acknowledgements are recorded as ordinary electronic
  acknowledgements, not represented as cryptographic signatures.
- A nomination may contain multiple tank soundings. Tank references are unique
  within the nomination, and every saved sounding must be reviewed before BDN
  preparation can begin.
- Supplier and receiver acknowledgements must both be complete before a BDN can
  leave draft and enter review.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `summary/` | Tenant-scoped BunkerFlow totals |
| `GET`, `POST` | `nominations/` | Paginated search/filter list and draft creation |
| `GET`, `PATCH` | `nominations/{id}/` | Detail and draft-only edit |
| `POST` | `nominations/{id}/actions/{action}/` | Confirm, submit review, approve, issue, or cancel |
| `POST` | `nominations/{id}/soundings/` | Record entered sounding inputs and reviewed-result candidate |
| `POST` | `nominations/{id}/soundings/review/` | Record an independent review |
| `POST`, `PATCH` | `nominations/{id}/bdn/` | Create or edit a draft BDN |
| `GET` | `nominations/{id}/bdn/export/` | Download the issued BDN as PDF |

The list supports `search`, `status`, `ordering`, `page`, and `page_size`.
Detail responses include `allowed_actions`; clients must use this for UX but
the backend independently enforces every permission and transition.

## Measurement boundary

The pilot stores source sounding values, manually supplied reviewed volume and
mass, and a required method or worksheet note. It does not calculate ASTM
54B/56 corrections. Operational calculation remains blocked until the licensed
procedure, edition, units, rounding rules, and verified test vectors are
approved.

## Tenancy and audit

Every BunkerFlow table has a non-null organization relationship and PostgreSQL
row-level security. Reference-consistency triggers reject a sounding, BDN, or
audit event that points to a nomination from another tenant. The API also
scopes list, search, detail, mutation, export, and indirect identifiers to the
authenticated active membership.

Audit history records creation, edits, measurements, reviews, transitions, and
exports with actor, tenant, target, time, reason where applicable, and status
movement. Every response carries an `X-Request-ID`; successful audit entries
store the same identifier and their outcome so an operation can be traced
through request and audit records. It does not store secrets or duplicate the
full operational record.
