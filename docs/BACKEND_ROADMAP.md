# PetroLedger Backend Roadmap

Status: planning baseline based on the repository UI as inspected on 2026-10-13.

This document translates the current prototype screens into a backend delivery plan. The screens are the product roadmap and vocabulary source, but they are not yet proof of implemented behaviour or finalized business rules.

## 1. Repository findings

The current application is a Next.js 16 frontend prototype. It contains:

- a public landing page;
- login and organization-registration screens;
- a dashboard overview;
- ten operational module screens;
- a client document portal;
- tenant settings for roles, devices, alerts, integrations, and audit events; and
- shared search, notifications, offline-status, currency, and ASTM calculator UI.

All operational records, dashboard totals, users, devices, documents, audit entries, alerts, and integration statuses are hard-coded. Login and registration do not submit data. Most module actions open the same generic three-field modal and create browser-memory records that disappear on refresh.

The prototype therefore establishes navigation, terminology, priorities, and desired workflows. It does not establish backend entities, validation rules, lifecycle transitions, formulas, or integration availability.

## 2. Architectural direction

### 2.1 Repository layout

Before backend implementation, move the existing Next.js application into `frontend/` and create an independently deployable `backend/` Django project. Keep shared engineering documents at the repository root.

```text
energy-logix-ledger/
├── AGENTS.md
├── SECURITY.md
├── GLOSSARY.md
├── docs/
├── frontend/
└── backend/
```

This move should be its own mechanical commit. It must preserve the Next.js-generated instructions and update local, CI, and deployment paths together.

### 2.2 Backend stack

Initial stack:

- Python and Django;
- Django REST Framework;
- PostgreSQL;
- OpenAPI generated from the actual API;
- object storage for documents; and
- a background-job system only when the first real asynchronous workflow requires it.

Redis and Celery should not be installed merely because they appear in a template. They become justified when exports, malware scanning, scheduled expiry notices, synchronization processing, or integrations require durable asynchronous execution.

### 2.3 Domain boundaries

Start with these core Django apps:

| App | Responsibility |
|---|---|
| `organizations` | Tenants, tenant settings, plans, memberships, invitations, sites, and tenant lifecycle |
| `identity` | User profile, authentication integration, MFA state, role assignments, and session/device security |
| `audit` | Append-only security and business audit events |
| `documents` | File metadata, versions, access policy, malware state, retention, and signed downloads |
| `notifications` | In-app notifications, preferences, delivery attempts, and read state |
| `devices` | Registered field devices, revocation, sync cursors, and device health |
| `reference_data` | Controlled units, currencies, locations, asset types, regulators, and configurable classifications |

Operational apps should follow actual business boundaries rather than the generic frontend record shape:

| UI module | Backend domain app or apps |
|---|---|
| BunkerFlow | `bunkering` |
| PipeIntegrity | `pipeline_integrity` |
| RefineryLink | `depot_operations` |
| HaulTrac | `haulage` |
| EPC-Link | `procurement` and later `local_content` if the boundary proves useful |
| SafePass | `hse` and `workforce` |
| MarineStores | `inventory` and `marine_supply` only when their shared rules are understood |
| TankWorks | `field_jobs` with tank-service-specific inspections |
| Compliance Shield | `compliance` |
| Billing | `commercial` |
| Client Portal | a permissioned presentation layer over documents and approved records, not a second source of truth |

Do not create all domain apps at once. Create each app when its first vertical slice starts.

### 2.4 Multi-tenant data boundary

- Every tenant-owned table has a non-null tenant foreign key.
- Tenant membership is verified from the authenticated server-side identity.
- Tenant filters are enforced in application services and PostgreSQL row-level security.
- The ordinary request database role cannot bypass row-level security.
- Tenant context is transaction-local and fails closed when absent.
- Object keys, cache keys, jobs, exports, notifications, WebSocket groups, and logs carry verified tenant scope.
- Every tenant-owned API receives two-tenant negative tests.
- The design allows a later enterprise tenant to use a dedicated database without maintaining a customer-specific code fork.

### 2.5 API conventions to decide before implementation

The first backend foundation change must document and test:

- `/api/v1/` versioning strategy;
- browser authentication mechanism and CSRF behaviour;
- success, validation-error, permission-error, and conflict response envelopes;
- cursor or page-number pagination;
- filtering, ordering, and search syntax;
- stable public identifiers;
- optimistic concurrency or version checks for editable records;
- idempotency keys for retried writes;
- timezone storage and display rules;
- quantities and units representation;
- document upload protocol; and
- audit/request correlation identifiers.

The UI currently displays West Africa Time, but backend timestamps should be timezone-aware UTC values with localization at presentation boundaries.

## 3. Record lifecycle and deletion policy

The UI needs actions, but not every entity should have a Delete button.

Use these default lifecycle rules unless a domain owner approves a different rule:

| Record condition | Allowed action |
|---|---|
| Unsubmitted draft with no dependent records | Edit and hard-delete with permission and audit event |
| Submitted or pending approval | Withdraw or return for correction; no hard delete |
| Approved, issued, signed, posted, or externally transmitted | Immutable; amend, supersede, reverse, cancel, or void through a controlled service |
| Reference/master data no longer used | Deactivate or archive |
| Record under retention or legal hold | No deletion until policy permits it |
| Personal data deletion request | Apply the approved privacy workflow without destroying records that must legally be retained |

Every state-changing action must expose the allowed transition, required reason, actor, timestamp, version, and audit event. Buttons must be permission-aware, but the backend remains authoritative.

## 4. Screen-by-screen backend mapping

### 4.1 Public landing page (`/`)

Current intent:

- communicate modules, pricing, security claims, integrations, and roadmap;
- collect contact or pilot interest.

Backend work:

- no operational backend is needed for static marketing content;
- a contact/pilot request endpoint may be added after defining consent, spam controls, retention, notification recipient, and CRM handoff;
- pricing should remain managed content until subscription billing is actually selected.

UI changes required later:

- submission success and failure states for the contact form;
- privacy notice and consent text tied to the real processing purpose;
- remove or qualify claims that are not backed by implemented controls or confirmed integrations.

### 4.2 Login (`/login`)

Current intent:

- email/password login;
- remember-me option;
- forgot-password entry point.

Backend work:

- secure authentication, session creation, logout, throttling, lockout monitoring, and audit events;
- tenant membership selection when a user belongs to multiple organizations;
- MFA enrolment and challenge for privileged users;
- password-reset request and completion flows;
- session and device revocation.

Missing UI required for backend completion:

- validation and server-error states;
- forgot-password request and reset screens;
- MFA enrolment, challenge, recovery, and factor-change screens;
- multi-tenant organization chooser;
- suspended account/tenant and expired invitation states.

### 4.3 Registration (`/register`)

Current intent:

- create a user and organization;
- select a role and commercial tier;
- begin a pilot.

Backend work:

- organization and owner membership creation in one transaction;
- verified email and invitation acceptance;
- plan or pilot request capture without trusting frontend prices;
- terms/privacy version acceptance;
- duplicate organization and email handling;
- explicit tenant provisioning state.

Missing UI required for backend completion:

- email verification and invitation acceptance;
- provisioning progress/failure state;
- server validation;
- terms and privacy pages;
- a clear distinction between requesting a paid pilot and instantly activating a subscription.

Do not accept the selected role as an unrestricted privilege assignment. Self-registration may create only the approved initial tenant-owner role.

### 4.4 Dashboard overview (`/dashboard`)

Current intent:

- tenant-wide key performance indicators;
- multi-currency ledger summary;
- cost/margin trend;
- asset and fleet status;
- recent cross-module records;
- exceptions, renewals, devices, and quick navigation.

Backend work:

- read-optimized dashboard endpoints composed from authorized domain services;
- date range, currency, module, site, and status filters;
- canonical currency snapshots rather than live recalculation of historical values;
- exception feed and renewal feed;
- device and sync health summary;
- export jobs with authorized, expiring downloads.

Missing UI required for backend completion:

- real record links and detail destinations;
- working asset creation or removal of the inactive action;
- export progress, completion, and failure states;
- empty, partial-permission, stale-data, and API-error states;
- date range and site filters once the backend supports them.

The overview must not query every domain table directly. Domain services own their summaries; a dashboard query layer composes them.

### 4.5 Shared module screens

The following screens currently use the same `ModulePage` component:

- BunkerFlow;
- PipeIntegrity;
- RefineryLink;
- HaulTrac;
- EPC-Link;
- SafePass;
- MarineStores;
- TankWorks;
- Compliance Shield; and
- Billing.

The shared list shell, search placement, filtering pattern, status badges, and visual hierarchy can remain. The generic creation modal and generic record model cannot.

Every module needs:

- a paginated domain-specific list endpoint;
- server-side filtering, ordering, and search;
- a stable detail route such as `/dashboard/<module>/<public-id>`;
- domain-specific create/edit forms and validation;
- an allowed-actions response based on role and current state;
- attachments and evidence;
- activity/audit history;
- state-transition actions with confirmation and reasons;
- optimistic concurrency handling;
- empty, loading, offline, validation, conflict, permission, and failure states; and
- explicit archive/amend/cancel behaviour rather than an assumed universal Delete action.

#### BunkerFlow (`/dashboard/bunkerflow`)

Backend aggregates:

- customer/vessel and port reference data;
- nomination and stem;
- tank sounding and measurement inputs/results;
- transfer operation and checklist;
- fuel sample and seal custody;
- Bunker Delivery Note, signatories, and amendments;
- husbandry order and delivery evidence.

Required detail/workflow screens:

- nomination/stem detail with timeline;
- sounding entry and reviewed calculation result;
- transfer checklist and live/recorded events;
- BDN preview, approval, signature, issue, and amendment history;
- sample custody detail;
- husbandry order and receipt.

Critical constraints:

- do not encode ASTM/API calculations until the licensed procedure, edition, units, rounding, and verified test vectors are approved;
- issued BDNs and signatures are immutable;
- electronic acknowledgement and cryptographic signature must not be conflated.

#### PipeIntegrity (`/dashboard/pipe-integrity`)

Backend aggregates:

- pipeline, segment, station, asset, weld, and inspection point;
- pigging run and tracking events;
- hydrotest plan, instrument readings, witnesses, and result;
- nondestructive-testing inspection and indications;
- cathodic-protection survey and readings;
- right-of-way observation, anomaly, maintenance action, and report.

Required detail/workflow screens:

- asset and segment register;
- pig run detail with ordered tracking events;
- hydrotest plan and time-series readings;
- inspection/anomaly detail and disposition;
- survey map/profile;
- generated report status and version history.

Critical constraints:

- governing code and acceptance criteria are explicit versioned inputs;
- raw readings remain preserved when derived results change;
- remaining-life calculations require a domain-approved method and test data.

#### RefineryLink (`/dashboard/refinery-link`)

Backend aggregates:

- terminal, depot, tank, gantry, loading bay, meter, and calibration;
- truck appointment and holding-park queue entry;
- external call-up reference and synchronization status;
- tank gauge reading;
- product batch and quality certificate;
- meter ticket and reconciliation run;
- variance investigation.

Required detail/workflow screens:

- appointment and queue board;
- tank and gauge history;
- meter ticket detail;
- batch quality record;
- reconciliation run with inputs, differences, exceptions, and approval.

Critical constraints:

- external e-call-up and refinery APIs remain disabled until access and contracts are confirmed;
- imported hardware readings preserve source, device, calibration, time, and operator overrides;
- reconciliations are repeatable and versioned.

#### HaulTrac (`/dashboard/haul-trac`)

Backend aggregates:

- vehicle, tanker compartments, driver, licence, and compliance documents;
- dispatch, route, trip, waybill, and cargo;
- weighbridge readings;
- telematics event and alert;
- discharge measurement and Proof of Delivery;
- fee, levy, and demurrage entry.

Required detail/workflow screens:

- fleet and driver profiles;
- dispatch/trip detail with timeline and route;
- waybill verification page suitable for QR access;
- weighbridge evidence detail;
- alert investigation and resolution;
- discharge/POD sign-off;
- compliance document renewal history.

Critical constraints:

- location data access and retention require explicit policy;
- telematics and weight readings preserve source and confidence;
- POD and issued waybills are amended or cancelled, not overwritten.

#### EPC-Link (`/dashboard/epc-link`)

Backend aggregates:

- vendor, requisition, purchase order, material receipt, and inventory movement;
- pipe, joint, heat number, yard bay, tag, and Material Test Certificate;
- equipment and certification;
- local-content spend classification and evidence;
- readiness assessment, tender, and dossier export.

Required detail/workflow screens:

- material requisition and approval;
- pipe/heat traceability detail;
- yard inventory and scan history;
- equipment certificate history;
- readiness-check evidence and findings;
- tender dossier composition and export status.

Critical constraints:

- NOGIC JQS output is an export until an official supported integration is confirmed;
- percentage calculations retain source transactions and classification decisions;
- certificate status must not be inferred solely from an uploaded filename.

#### SafePass (`/dashboard/safe-pass`)

Backend aggregates:

- worker, competency, certificate, medical-clearance metadata, and rotation;
- site/vessel manifest and personnel-on-board events;
- permit type, Permit to Work, hazard controls, approvals, suspension, and closure;
- gas-test reading and calibrated instrument;
- hazard/near-miss report, risk assessment, action, and CAPA.

Required detail/workflow screens:

- worker credential profile and expiry history;
- manifest builder with blocking reasons;
- permit detail with explicit approval stages;
- gas-test entry and chronological readings;
- hazard report, investigation, and CAPA detail;
- personnel-on-board roster and history.

Critical constraints:

- safety interlocks execute server-side and fail closed;
- thresholds and approval authority come from an approved tenant/site procedure;
- medical data must be minimized—store fitness outcome and validity unless detailed data is legally and operationally justified;
- issued permits and readings remain immutable, with suspension and supersession workflows.

#### MarineStores (`/dashboard/marine-stores`)

Backend aggregates:

- product catalogue, category, manufacturer, grade, and pack size;
- warehouse/location, stock lot, serial/cylinder, and inventory movement;
- requisition, purchase order, delivery, and receipt;
- expiry-controlled medical item;
- refrigerant issue, return, and recovery log.

Required detail/workflow screens:

- catalogue item and stock-lot detail;
- requisition/order lifecycle;
- serialized cylinder history;
- expiry queue;
- delivery receipt and discrepancies.

Critical constraints:

- inventory is an append-only movement ledger with derived balances;
- units of measure and conversions are controlled reference data;
- stock adjustments require reason and approval.

#### TankWorks (`/dashboard/tank-works`)

Backend aggregates:

- field job, tank, scope, stage, crew, equipment, and consumables;
- confined-space link to an approved SafePass permit;
- atmospheric readings;
- waste movement and custody manifest;
- coating inspection, thickness readings, adhesion test, and defect;
- timesheet and cost entry.

Required detail/workflow screens:

- job detail with stage timeline;
- permit and atmospheric-monitoring panel;
- waste chain-of-custody detail;
- coating inspection sheet with reading grid;
- crew/equipment utilization;
- cost summary with source entries.

Critical constraints:

- SafePass owns permits; TankWorks references them rather than duplicating them;
- disposal certification must be evidence-backed and not automatically claimed;
- derived job cost remains reproducible from immutable source entries.

#### Compliance Shield (`/dashboard/compliance-shield`)

Backend aggregates:

- regulator/authority reference;
- obligation and applicability;
- permit/licence/certificate, version, issuer, validity, and evidence;
- renewal case, tasks, reminders, fees, and submission evidence;
- audit pack template, generated pack, and access history;
- compliance exception and operational block.

Required detail/workflow screens:

- calendar and obligation list;
- permit/certificate detail and version history;
- renewal case checklist;
- reminder configuration;
- audit-pack composition, generation status, and download history;
- operational-block review and authorized override workflow, if overrides are permitted.

Critical constraints:

- “compliance score” requires an approved, transparent formula;
- uploaded evidence does not itself prove validity;
- reminders are durable jobs with deduplication and delivery tracking;
- regulator contacts and URLs need ownership and review dates.

#### Billing (`/dashboard/billing`)

Backend aggregates:

- customer account, contract, rate, and currency terms;
- job-cost entries sourced from operational modules;
- invoice, line item, tax, approval, issue, payment, credit note, and allocation;
- Interim Payment Certificate, milestone, measurement, retention, and signatures;
- exchange-rate source and immutable snapshot;
- statement and ageing report.

Required detail/workflow screens:

- customer and contract commercial profile;
- invoice draft/detail/approval/issue/payment history;
- Interim Payment Certificate detail and approval chain;
- exchange-rate source and snapshot history;
- payment-link status and reconciliation;
- statement generation and delivery history;
- job margin drill-down.

Critical constraints:

- money uses integer minor units and ISO currency codes;
- issued invoices are corrected by credit/debit notes, never overwritten or deleted;
- payment webhooks are signed, idempotent, and reconciled;
- historical conversions use the stored snapshot, not the latest rate.

### 4.6 Client Portal (`/dashboard/client-portal`)

Current intent:

- select a client;
- view approved documents;
- verify a hash;
- download a dossier;
- export a client audit pack.

Backend work:

- external-client organizations, users, invitations, and scoped grants;
- explicit document publication workflow;
- document versions, signature evidence, access log, expiry, and revocation;
- asynchronous dossier generation;
- short-lived authorized downloads;
- tenant-safe cryptographic verification metadata.

Missing UI required for backend completion:

- external portal authentication and invitation screens;
- published-document detail, version, and provenance;
- share/grant management for authorized internal users;
- access-expiry and revoked-document states;
- export progress and download history.

The client portal must never query internal records merely because a client identifier matches. Only explicitly published resources are visible.

### 4.7 Settings (`/dashboard/settings`)

Current intent:

- view roles and access;
- view field devices and sync state;
- toggle alert rules;
- view integration statuses;
- inspect audit events.

Backend work:

- users, invitations, memberships, roles, and permission policies;
- registered devices, last sync, revocation, and remote-logout state;
- notification rules and destinations;
- integration connections, credential references, health, and last attempt;
- paginated audit-event search and detail;
- tenant profile, sites, data retention, and security settings.

Missing UI required for backend completion:

- invite, suspend, reactivate, and remove-membership flows;
- role detail and permission matrix;
- device detail, revoke, and lost-device response;
- integration connect/configure/test/disable screens;
- audit-event detail and export;
- organization profile, sites, retention, API credentials, MFA policy, and session management.

“Remove user” should remove or end a tenant membership, not delete the global user identity or historical attribution.

### 4.8 Shared navigation, search, notifications, and status

Backend work:

- server-authorized module navigation and feature entitlements;
- tenant-scoped global search returning typed results and real detail links;
- notification list, unread count, mark-read, and preference endpoints;
- server-derived sync status and device cache metadata;
- supported currency snapshot endpoint;
- audit verification status based on a defined check, not a static label.

Missing UI required for backend completion:

- global search loading, pagination, no-result, and permission-safe result types;
- notification detail and action destinations;
- degraded/offline/sync-conflict states;
- tenant switcher when applicable.

The current ASTM calculator is demonstrative. It must not be used operationally until its formula, standard edition, product mapping, precision, rounding, units, and reference test vectors are approved.

## 5. Cross-cutting model conventions

Use project conventions only after they are implemented and tested. The expected baseline is:

- internal database primary key plus non-sequential public identifier;
- mandatory tenant relationship on tenant-owned rows;
- timezone-aware `created_at` and `updated_at`;
- explicit creator/updater where attribution is meaningful;
- lifecycle status represented by constrained choices and service-enforced transitions;
- version number for concurrency-sensitive mutable drafts;
- archival or inactivity fields for master data;
- no generic JSON field as a substitute for understood domain structure;
- quantities stored as value, unit, measurement context, and precision appropriate to the domain;
- source metadata for imported or device-generated readings; and
- document references through the central document service.

Every model is deliberately registered in Django admin unless there is a documented security reason not to expose it. Admin configuration follows `AGENTS.md`: useful lists, filters, search, safe read-only fields, optimized relationships, tenant-aware permissions, and tests.

## 6. Delivery sequence

### Phase 0 — Decisions and repository foundation

Completion criteria:

- confirm first pilot customer, first workflow, hosting region, and domain expert;
- approve authentication/session approach;
- approve tenant isolation model and support-access process;
- define API and error conventions;
- move Next.js into `frontend/` and create `backend/`;
- add local PostgreSQL development environment, environment template, CI, formatting, linting, and test commands;
- create architecture decision records for tenancy, authentication, audit integrity, document storage, and offline scope.

Do not build all modules before these decisions.

### Phase 1 — Secure core platform

Build:

- organizations, users, invitations, memberships, and roles;
- login, logout, email verification, reset, MFA, and session management;
- tenant middleware/context and PostgreSQL row-level security;
- audit events and request correlation;
- document metadata, secure upload/download, and malware-processing states;
- notifications;
- admin registrations and permission tests;
- API schema and frontend API client conventions.

Completion criteria include two-tenant isolation tests through real request and database roles.

### Phase 2 — First pilot vertical slice

Choose exactly one based on a real pilot commitment:

- BunkerFlow: nomination → sounding → reviewed BDN → issue; or
- HaulTrac: dispatch → waybill → trip → discharge/POD; or
- SafePass: worker credential → manifest gate → permit → gas tests → closure.

For the selected slice, complete list, create, detail, edit-draft, transitions, documents, audit history, admin, permissions, exports, and failure-path tests before starting the next module.

### Phase 3 — Offline field capability

Do not make the entire application offline by default. Add offline support to the proven field steps from Phase 2:

- device registration and revocation;
- minimum authorized dataset download;
- encrypted local persistence;
- operation identifiers and idempotent sync;
- per-record versions and conflict workflow;
- attachment queueing and retry;
- observable sync state and recovery tests.

### Phase 4 — Complete MVP workflows

Complete the remaining MVP modules from the product roadmap:

- BunkerFlow;
- HaulTrac;
- SafePass;
- shared document vault, audit, notifications, and owner dashboard.

Only dashboard metrics backed by real implemented events should be displayed as live values.

### Phase 5 — Compliance and external portal

Build:

- Compliance Shield;
- client publication and portal access;
- durable reminders;
- versioned audit packs and authorized exports.

### Phase 6 — Pipeline and EPC

Build:

- PipeIntegrity;
- EPC-Link;
- domain-approved calculations and report formats.

This phase requires named pipeline-integrity and Nigerian-content domain reviewers.

### Phase 7 — Depot, inventory, field jobs, and commercial

Build according to validated customer demand:

- RefineryLink without unconfirmed external connectors;
- MarineStores;
- TankWorks;
- Billing and payment integrations.

External systems are added adapter by adapter after access, sandbox behaviour, contracts, and support ownership are confirmed.

## 7. Testing strategy

Every vertical slice requires:

- service tests for business decisions and lifecycle transitions;
- model constraint and migration tests;
- API success, validation, permission, conflict, and not-found tests;
- two-tenant isolation tests for list, retrieve, create, update, transition, search, export, file, job, and admin paths;
- idempotency and retry tests for consequential writes;
- concurrency tests for approvals, inventory, financial, and sync operations;
- document authorization and malicious-upload failure tests;
- admin list/search/filter, permission, read-only, and action tests;
- fresh-database migration verification;
- contract tests for the frontend API client; and
- integration tests against real provider sandboxes when an integration is implemented.

## 8. UI-change rule

The existing visual system remains the design baseline. Change UI only when a real backend workflow needs information or states that the prototype cannot represent.

Acceptable changes include:

- dedicated domain detail routes;
- domain-specific forms;
- approval and lifecycle actions;
- attachments, evidence, history, and audit panels;
- permission-aware actions;
- loading, empty, validation, conflict, offline, stale, and failure states;
- archive, cancel, amend, reverse, revoke, or delete actions appropriate to the record lifecycle; and
- removal or qualification of unsupported claims.

Do not redesign marketing or dashboard visuals merely to fit backend implementation preferences.

## 9. Decisions required before implementation

The following are product or architecture decisions, not details the backend should guess:

1. Which customer and workflow form the first pilot?
2. Is the first pilot BunkerFlow, HaulTrac, or SafePass?
3. Will the browser use same-site Django sessions or another approved session architecture?
4. Which users may belong to multiple tenant organizations?
5. What support access to tenant data is allowed, and who approves it?
6. Which hosting region and customer data-residency options are required?
7. Which identity, email, object-storage, malware-scanning, and notification providers are approved?
8. Which records require legal digital signatures versus ordinary electronic acknowledgement?
9. Which domain experts approve petroleum calculations, safety interlocks, pipeline rules, and regulatory exports?
10. What data must work offline in the first pilot, and for how long?

Until these are resolved, Phase 0 repository setup and non-speculative core foundations can proceed, but domain formulas, legal assertions, and external integrations must not.
