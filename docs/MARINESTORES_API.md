# MarineStores API contract

Base path: `/api/v1/marinestores/`

All endpoints require an authenticated session and an active organization membership.
The server derives organization scope server-side; client-provided tenant IDs are never trusted.

## Resources

- `GET /summary/`
  Returns real-time maritime inventory metrics:
  `total_catalogue_items`, `total_active_catalogue_items`, `low_stock_alerts_count`,
  `total_refrigerant_cylinders`, `in_service_cylinders`, `marpol_compliant_cylinders`,
  `total_orders`, `pending_orders`, `dispatched_orders`, `delivered_orders`, `recent_movements`.

- `GET/POST /catalogue/`
  Lists and creates standard marine catalogue items: `item_code`, `name`, `category`
  (ship_spares, lubricants, provisions, medical, gases, safety_ppe), `unit_of_measure`,
  `brand`, `impa_code`, `minimum_stock_level`, `is_active`. Supports search query parameter.

- `GET/PATCH /catalogue/{id}/`
  Retrieves item detail (including live total stock on hand) or updates catalogue specifications.

- `GET/POST /inventory/`
  Lists store inventory lots and records goods receipt intake: `item_id`, `location`,
  `quantity`, `unit_cost_minor` (integer minor units), `currency` (ISO 4217),
  `batch_or_lot_number`, `serial_number`, `expires_on`, `reason`.
  Automatically posts an immutable entry to `InventoryMovement`.

- `GET/POST /cylinders/`
  Registers and tracks MARPOL Annex VI compliant refrigerant cylinders: `cylinder_serial`,
  `gas_type` (R404A, R134a, R407C, etc.), `tare_weight_kg`, `gross_weight_kg`, `net_gas_weight_kg`,
  `status` (full, in_service, empty, recovered), `assigned_vessel_or_facility`, `marpol_compliant`.

- `GET/PATCH /cylinders/{id}/`
  Updates cylinder status, records environmental notes, or logs recovery timestamp.

- `GET/POST /orders/`
  Lists store requisition orders and creates new orders with line items:
  `vessel_or_installation`, `destination`, `requested_delivery_date`, `notes`,
  `line_items` (array of `catalogue_item_id`, `quantity_requested`, `unit_price_minor`).
  Orders start in `draft` status with `version = 1`.

- `GET /orders/{id}/`
  Retrieves order detail with line items and allowed transitions (`allowed_actions`).

- `POST /orders/{id}/actions/{action}/`
  Executes version-locked lifecycle transitions (`approve`, `dispatch`, `deliver`, `cancel`).
  - `dispatch`: atomically checks and deducts stock from inventory lots, logs issuance audit movements.
  - `deliver`: records `delivered_at`, `receiving_officer_name`, `receiving_signature_ref`.
  - Stale versions return `409 Conflict`.

- `GET /movements/`
  Lists the immutable inventory movement audit log with pagination.
