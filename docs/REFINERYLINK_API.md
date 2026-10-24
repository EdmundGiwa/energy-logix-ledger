# RefineryLink API contract

Base path: `/api/v1/refinerylink/`

All endpoints require an authenticated session and an active organization membership.
The server derives organization scope server-side; client-provided tenant IDs are never trusted.

## Resources

- `GET /summary/`
  Returns real-time depot metrics: `today_throughput_litres`, `holding_park_queue_count`,
  `called_up_queue_count`, `reconciled_tickets_count`, `flagged_tickets_count`, `active_tanks_count`.

- `GET/POST /terminals/`
  Lists and creates terminals visible to the authenticated tenant.

- `GET/POST /tanks/`
  Lists and creates depot storage tanks. Accepts `terminal_id`, `product_type`,
  `nominal_capacity_litres`, `safe_fill_level_mm`, and `current_status`.

- `GET/POST /appointments/`
  Lists and creates truck offtake appointments. Accepts `terminal_id`, `truck_plate`,
  `driver_name`, `product_type`, `nominated_volume_litres`, `holding_park_slot`,
  `rfid_tag`, `e_callup_reference`, and `scheduled_at`. Supports search by plate, driver, or ref.

- `GET /appointments/{id}/`
  Returns appointment details including full immutable audit trail.

- `POST /appointments/{id}/actions/{action}/`
  Applies version-checked transitions: `check_in`, `call_up`, `start_loading`, `complete`, `cancel`.
  Requires `version` (optimistic locking) and audited `reason`.

- `GET/POST /tank-dips/`
  Records manual ullage or Automated Tank Gauge (ATG) dip observations: `tank_id`,
  `dip_type`, `observed_level_mm`, `water_cut_mm`, `temperature_c`, `observed_density_kg_m3`,
  `gross_observed_volume_litres`, and `net_standard_volume_litres` (ASTM D1250 standard).

- `GET/POST /meter-tickets/`
  Reconciles gantry meter batch controllers (AccuLoad, Smith Meter). Accepts `appointment_id`,
  `tank_id`, `meter_id`, `batch_start_reading`, `batch_end_reading`, `gross_volume_litres`,
  `net_volume_litres`, `temperature_c`, `density_at_15c`. Automatically computes volume variance
  against appointment nomination and flags variance when deviation exceeds 0.5%.

- `GET/POST /quality-certs/`
  Stores batch laboratory analysis: `product_type`, `batch_number`, `density_at_15c`,
  `flash_point_c`, `ron`, `distillation_recovery_percent`, `sulphur_ppm`, and checks NMDPRA compliance.

## Integration Boundaries

- External Lagos State e-Call-Up connector and Dangote Refinery APIs remain optional standalone
  queue identifiers until live provider contracts and API access are confirmed.
