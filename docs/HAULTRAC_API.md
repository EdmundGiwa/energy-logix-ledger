# HaulTrac API contract

Base path: `/api/v1/haultrac/`

All endpoints require the existing authenticated session and an active
organization membership. If a user belongs to multiple organizations, the
verified `X-Organization-ID` membership selector is required. Client-provided
organization identifiers are never accepted as ownership proof.

## Master data

- `GET|POST customers/`
- `GET|POST locations/`
- `GET|POST trucks/`
- `GET|POST trailers/`
- `GET|POST drivers/`

Members, administrators, and owners may register master data. Viewers are
read-only. Driver phone and licence information is personal data and is never
included in dispatch list responses.

The customer, location, truck, trailer, and driver endpoints are supporting
master-data contracts. The product UI creates and reuses them through a single
fleet-draft workflow rather than presenting them as five independent setup
directories.

## Fleet drafts

- `GET|POST fleets/`
- `GET fleets/{id}/`
- `POST fleets/{id}/stage/`

Creating a fleet immediately persists an empty tenant-owned draft. The stage
endpoint accepts the current `version`, the next required `stage`, and that
stage's `data`. Stages are strictly ordered: customer, route, truck, trailer,
and driver. The route stage requires both a distinct loading origin and delivery
destination in one request. Each successful stage increments the version and
records an immutable audit event. The draft becomes `ready` after the driver
stage and is then immutable.

## Dispatches

- `GET|POST dispatches/`
- `GET|PATCH dispatches/{id}/`
- `POST dispatches/{id}/weighbridge/`
- `POST dispatches/{id}/waybill/`
- `GET dispatches/{id}/waybill/qr/`
- `GET dispatches/{id}/waybill/verify/{verification_code}/`
- `POST dispatches/{id}/actions/{action}/`
- `POST dispatches/{id}/proof-of-delivery/`
- `GET dispatches/{id}/export/`

List endpoints accept `search` and `status`; responses use page-number
pagination. Mutating workflow requests include the current integer `version`.
A stale version returns HTTP 409 rather than overwriting concurrent work.

## Workflow

1. Complete or resume a fleet draft containing one customer, one route with
   both endpoints, one truck, one trailer, and one driver.
2. Create a draft dispatch from a ready fleet and add the product, planned
   quantity, departure time, and trip notes.
3. Record one immutable manual tare and one immutable manual gross reading.
   Gross must be greater than tare.
4. Generate one immutable e-Waybill. Its QR points to an authenticated,
   tenant-scoped verification endpoint.
5. Transition through `dispatch`, `start_trip`, `arrive`, and
   `start_discharge`. Each transition requires an audit reason.
6. Record proof of delivery while discharging. Delivered quantity, ullage,
   temperature, water-paste result, and receiver acknowledgement are required.
7. An owner or administrator closes the delivered trip. Closed trips and their
   critical records are immutable and may be exported as a styled PDF.

Draft dispatches can be cancelled. Later stages cannot be cancelled or moved
backwards in this MVP. Corrections to critical records require a future explicit
superseding-record design; direct mutation is deliberately rejected.

## Weighbridge integration boundary

Only `manual` capture is accepted. The UI, API response, audit event, and PDF
identify manual readings as manual. External provider capture remains disabled
until a provider contract, payload contract, credentials, and API access have
been confirmed and implemented with idempotency and failure handling.

## Security and audit

Every table has a non-null organization relationship and PostgreSQL row-level
security. Database triggers reject cross-tenant foreign-key references. Tests
cover cross-tenant reads, writes, searches, exports, transitions, and indirect
reference attempts. Weighbridge readings, e-Waybills, proof-of-delivery records,
audit events, and closed dispatches are protected against database updates and
deletes.
