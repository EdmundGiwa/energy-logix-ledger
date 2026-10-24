# SafePass API contract

Base path: `/api/v1/safepass/`. All endpoints require an authenticated, active
organization membership. Tenant scope is derived server-side; tenant identifiers
in request bodies are ignored and cross-tenant identifiers return `404` or a
validation error.

## Resources

- `GET/POST workers/` registers workforce identity and job metadata.
- `GET/POST credentials/` stores certificate metadata and a private document-vault
  reference. It does not accept public document URLs or claim that a binary has
  been malware-scanned.
- `POST credentials/{id}/verify/` is restricted to owners and administrators.
- `GET/POST procedures/` defines tenant/site credential and atmospheric rules.
- `POST procedures/{id}/approve/` activates those rules for safety decisions.
- `GET/POST mobilizations/`, `POST mobilizations/{id}/crew/`, and
  `POST mobilizations/{id}/assess/` build and evaluate a manifest. Assessment
  fails closed when the procedure is unapproved or required credentials are not
  verified through the configured validity buffer.
- `GET/POST permits/` and `GET permits/{id}/` manage Permit-to-Work records.
- `POST permits/{id}/gas-tests/` records an immutable reading evaluated against
  the permit's approved procedure.
- `POST permits/{id}/acknowledgements/` records worker JSA or toolbox-talk
  acknowledgement.
- `POST permits/{id}/actions/{action}/` applies version-checked transitions:
  `submit`, `approve`, `activate`, `suspend`, `resume`, `close`, `reject`, or
  `cancel` as permitted by the current state and caller role.
- `GET permits/{id}/export/` returns the controlled PDF for approved, active,
  suspended, or closed permits.

Gas tests and audit events are append-only in application code and PostgreSQL.
All tenant tables use row-level security; database triggers reject cross-tenant
relationships. Error responses use normal DRF field errors, `403` for insufficient
role, `404` for inaccessible resources, and `409` for state/version conflicts.
