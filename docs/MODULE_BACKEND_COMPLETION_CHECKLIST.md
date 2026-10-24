# 12-Module Backend Completion Checklist

This is the delivery checklist for making the launch scope fully backend-wired.

## Completion rule

A module is not complete because its screen exists or because a happy-path demo
works. Mark a module **Complete** only when all of its required backend,
security, admin, UI, and verification checks pass.

Every module must have:

- [ ] Domain contract documented: records, actors, states, transitions, units,
      approvals, corrections, retention, and export rules.
- [ ] Tenant-owned models with non-null organization ownership, constraints,
      indexes, migrations, and existing-data considerations.
- [ ] Service-layer business rules used by API, admin actions, jobs, imports,
      and integrations.
- [ ] Versioned API endpoints with validation, pagination, filtering, search,
      stable public identifiers, structured errors, and idempotent writes where
      retries are possible.
- [ ] Server-side tenant isolation and role-based authorization for every
      operation.
- [ ] Append-only audit history for consequential actions, including actor,
      tenant, timestamp, reason where applicable, and before/after state.
- [ ] Useful and safe Django admin registration with lists, filters, search,
      ordering, read-only system fields, optimized querysets, and tenant-aware
      permissions.
- [ ] Frontend connected to the API rather than mock or browser-memory data.
- [ ] Loading, empty, validation, conflict, permission, offline/stale-data,
      and server-error states.
- [ ] Detail route, allowed next action, lifecycle controls, and safe correction
      or reversal behavior where applicable.
- [ ] Required documents, evidence, signatures, acknowledgements, and exports.
- [ ] Two-tenant security tests covering direct and indirect references,
      reads, writes, updates, deletes, search, and exports where applicable.
- [ ] Focused backend tests, fresh-database migration verification, frontend
      typecheck/lint/build, and Docker smoke testing.

## Delivery order and status

Status values are **Not started**, **In progress**, **Blocked**, **Pilot-ready**,
and **Complete**. A status change must be supported by a commit or test/report
evidence.

### Shared platform foundations

- [ ] **Shared platform hardening** — In progress
  - [ ] Email ownership verification and account-change verification
  - [ ] MFA policy and privileged-user challenge flow
  - [ ] Tenant context, PostgreSQL RLS, and fail-closed authorization
  - [ ] Immutable audit foundation
  - [ ] Document metadata and secure-vault boundary
  - [ ] Notifications and expiry alerts
  - [ ] Device identity and offline synchronization contracts
  - [ ] API error, pagination, filtering, idempotency, and concurrency standards

### Operational modules

- [ ] **1. BunkerFlow** — Pilot-ready
  - [ ] Nomination → sounding → review → BDN → approval → issue workflow
  - [ ] Styled BDN export and audit history
  - [ ] Tenant isolation, admin controls, and regression coverage

- [ ] **2. HaulTrac** — Pilot-ready
  - [ ] Fleet draft and reusable fleet records
  - [ ] Dispatch → weighbridge readings → e-Waybill → trip tracking
  - [ ] Discharge, proof of delivery, receiver acknowledgement, and closure
  - [ ] Styled delivery export and audit history
  - [ ] External weighbridge integrations remain clearly unavailable until
        provider contracts and API access are confirmed.

- [ ] **3. SafePass** — Pilot-ready
  - [x] Workforce and credential records
  - [x] Mobilization readiness and expiry rules
  - [x] Permit-to-Work lifecycle and approval authority
  - [x] Gas-test interlocks, JSA, toolbox acknowledgement, and audit history
  - [ ] Domain-owner confirmation of safety thresholds and approval chain
        (documented in PENDING_TODO.md)
  - [ ] Secure certificate-file upload remains unavailable until vault,
        scanning, retention, and authorized download are implemented
        (enforced at boundary; documented in PENDING_TODO.md)

- [ ] **4. PipeIntegrity** — In progress
  - [x] First vertical slice: tenant-scoped pipeline assets and pig-run lifecycle
        (draft → launched → in transit → arrived → recovered)
  - [x] First vertical slice: hydrotest records with pressure-drop completion gate
  - [x] Version-checked transitions, audit events, admin registration, PostgreSQL RLS,
        and focused two-tenant database security tests
  - [x] Inspection, cathodic-protection survey-point, and ROW observation records
        with tenant-scoped search, validation, admin registration, and tests
  - [ ] Pigging run tracking
  - [ ] Hydrotest pressure/temperature/hold validation
  - [ ] NDT, weld, corrosion, valve, and remaining-life workflow rules
        (observation records are available; acceptance logic is pending domain
        confirmation)
  - [x] Cathodic-protection and right-of-way observation records
  - [ ] Asset-integrity reports and evidence export

- [ ] **5. RefineryLink** — Not started
  - [ ] Terminal offtake and truck appointment records
  - [ ] Holding-park queue, driver accreditation, and QR/RFID evidence
  - [ ] Tank gauging, ullage, volume conversion, and reconciliation
  - [ ] Gantry ticket and quality-certificate linkage
  - [ ] Government and refinery integrations remain conditional on confirmed
        contracts and API access

- [ ] **6. MarineStores** — Not started
  - [ ] Catalogue, stock, lot/serial, expiry, and unit controls
  - [ ] Lubricants, provisions, spares, PPE, medical supplies, and gases
  - [ ] Orders, issue/delivery receipts, and receiving acknowledgement
  - [ ] Inventory movement audit and tenant isolation

- [ ] **7. TankWorks** — Not started
  - [ ] Field-job creation, scope, estimates, and costing
  - [ ] Confined-space permit linkage to SafePass
  - [ ] Sludge/waste manifests
  - [ ] Cleaning, blasting, recoating, DFT, and adhesion inspections
  - [ ] Crew hours and equipment utilization

- [ ] **8. EPC-Link** — Not started
  - [ ] Material requisitions and pipe-yard inventory
  - [ ] Heat numbers, MTCs, wall thickness, bay locations, and QR tags
  - [ ] Vendor qualification and procurement approvals
  - [ ] Nigerian-content readiness and export packs
  - [ ] NOGIC-JQS/NCDMB integrations remain accurately represented as export
        or manual-upload workflows until API access is confirmed

- [ ] **9. Compliance Shield** — Not started
  - [ ] Regulatory and certificate register
  - [ ] 90/60/30/7-day expiry alerts
  - [ ] Evidence packs by regulator and customer
  - [ ] ISO audit evidence and immutable history

- [ ] **10. Billing & Commercial** — Not started
  - [ ] Job costing from approved operational records
  - [ ] NGN/USD minor-unit money representation and rate snapshots
  - [ ] Invoices, payment state, statements, and ageing
  - [ ] Payment provider contracts, webhook validation, idempotency, and
        reconciliation before enabling live payments

- [ ] **11. Client Portal** — Not started
  - [ ] Explicit external-user identity and tenant/customer boundary
  - [ ] Read-only approved BDNs, PODs, certificates, and inspection reports
  - [ ] Expiring document links and download audit
  - [ ] No access to drafts, internal notes, or unrelated tenant records

- [ ] **12. Owner Dashboard** — Not started
  - [ ] Read-optimized projections from authoritative module services
  - [ ] Turnaround, shrinkage, reconciliation, utilization, and expiry risk
  - [ ] Exception feed with source record links and permissions
  - [ ] Currency, site, date-range, and module filters
  - [ ] Export jobs with tenant-scoped authorization

## Release gates

- [ ] Email verification and privileged-account security policy approved
- [ ] Domain-specific safety, measurement, regulatory, and approval rules
      confirmed by the product/domain owner
- [ ] No unverified external integration presented as active
- [ ] Fresh-database migrations pass
- [ ] Backend tests pass, including two-tenant negative tests
- [ ] Frontend typecheck, lint, and production build pass
- [ ] Docker smoke tests pass for frontend, API, database, and admin
- [ ] No unresolved critical security, data-retention, audit, or authorization
      findings
- [ ] Production deployment verified by exact commit, service health, and live
      marker—not inferred from a merge or push

## Progress update rules

When work advances, update this file in the same coherent change as the
implementation or verification evidence. Do not mark a checkbox based only on
visual inspection, a mock response, or an untested local happy path.
