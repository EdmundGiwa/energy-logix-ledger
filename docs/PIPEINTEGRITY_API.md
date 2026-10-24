# PipeIntegrity API — first vertical slice

Base path: `/api/v1/pipeintegrity/`

All endpoints require an authenticated session and an active organization
membership. If the user belongs to multiple organizations, send the verified
organization public ID in `X-Organization-ID`. The server never trusts a
client-provided organization as proof of access.

## Pipeline assets

`GET /assets/?search=<term>` lists assets visible to the active tenant.

`POST /assets/` creates an asset:

```json
{
  "reference": "ESCR-18",
  "name": "Escravos Trunkline 18-inch",
  "fluid_type": "liquid",
  "governing_code": "ASME B31.4"
}
```

The first slice records the governing code selected by the organization. It
does not calculate code acceptance criteria from memory or imply that a code
has been independently verified.

## Pig runs

`GET /pig-runs/?search=<term>&status=<status>` lists tenant-scoped pig runs.

`POST /pig-runs/` creates a draft run using `asset_id`, `pig_type`,
`launcher_kp`, and `receiver_kp`.

Transitions use:

```text
POST /pig-runs/<id>/actions/launch/
POST /pig-runs/<id>/actions/start_transit/
POST /pig-runs/<id>/actions/arrive/
POST /pig-runs/<id>/actions/recover/
```

Each transition requires the current `version` and an audited `reason`.

## Hydrotests

`GET /hydrotests/?search=<term>` lists tenant-scoped hydrotests.

`POST /hydrotests/` creates a draft using `asset_id`, `test_pressure_bar`, and
`hold_duration_minutes`. Pressure-drop and temperature observations may be
recorded with the draft record.

Transitions use:

```text
POST /hydrotests/<id>/actions/start/
POST /hydrotests/<id>/actions/pass/
POST /hydrotests/<id>/actions/fail/
```

Passing or failing requires a recorded pressure-drop observation. The service
does not decide the allowable drop, temperature normalization, test procedure,
or governing acceptance threshold; those must be confirmed by the domain owner
and applicable code/procedure before encoding them.

## Inspection, CP, and ROW evidence

`GET` and `POST` are available for the following tenant-scoped evidence records:

```text
/inspections/
/cp-survey-points/
/row-observations/
```

Inspection records accept UT, RT, MPI, PT, or visual observations and may
include wall-thickness, corrosion-rate, and remaining-life values supplied by
an inspector. CP points store the measured potential and electrode. ROW
observations store a location, category, severity, status, description, and
evidence reference. Search and the result/status filters are tenant-scoped.

These endpoints record qualified observations only. They do not calculate
remaining life, classify corrosion, or decide CP/ROW/NDT acceptance thresholds;
those rules must be confirmed by the domain owner and applicable procedure
before being encoded.

## Security and lifecycle behavior

- Detail lookups, search, list results, and indirect asset references are
  tenant-scoped server-side.
- Transitions are version-checked and return conflict responses for stale data.
- Audit events are append-only and cannot be edited or deleted through admin or
  the API.
- Django admin is read-only for these records and tenant-filtered for non-
  superusers.
- Inspection, CP, and ROW records are append-oriented evidence records. They
  have immutable public identifiers and tenant-scoped admin visibility.
