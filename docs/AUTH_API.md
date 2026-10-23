# Authentication and Tenant API Contract

This document defines the initial browser authentication and tenant-context contract under `/api/v1/`.

## Session and CSRF model

- Authentication uses Django database-backed sessions.
- The reusable session identifier is stored in the `offshora_session` `HttpOnly` cookie and is never exposed to frontend JavaScript.
- Browser clients call `GET /api/v1/auth/csrf/` before every state-changing authentication request and send the returned token as `X-CSRFToken`.
- Browser requests include credentials. CORS permits only configured origins and never uses a credentialed wildcard.
- Login rotates the CSRF token. Session refresh rotates the session identifier. Logout invalidates the server-side session.
- Authentication endpoints are throttled. Deployment-level rate limiting remains required for horizontally scaled environments.

## Authentication endpoints

### `GET /api/v1/auth/csrf/`

Public. Establishes the CSRF cookie and returns `{ "csrf_token": "..." }`.

### `POST /api/v1/auth/register/`

Public with CSRF protection. Accepts first and last name, email, password, organization name, descriptive job title, requested plan, and terms acceptance. It creates the user, organization, and fixed `owner` membership in one database transaction and signs the user in.

The client-supplied job title and requested plan never grant authorization. The initial authorization role is always `owner`.

Returns `201` with the current-user representation. Validation failures return `400`; duplicate-email races return `409`; throttling returns `429`.

### `POST /api/v1/auth/login/`

Public with CSRF protection. Accepts `email`, `password`, and `remember_me`. Invalid credentials return the same generic `401` response whether or not the account exists.

### `POST /api/v1/auth/logout/`

Authenticated with CSRF protection. Invalidates the session and returns `204`.

### `POST /api/v1/auth/session/refresh/`

Authenticated with CSRF protection. Rotates the session identifier and returns the current-user representation.

### `GET /api/v1/auth/me/`

Authenticated. Returns the user and active organization memberships. It does not return password data, session identifiers, or internal numeric primary keys.

## Tenant context

`GET /api/v1/organizations/current/members/` lists members only within a verified active membership.

- A user with one active organization needs no tenant header.
- A user with multiple active organizations must send `X-Organization-ID` using an organization public UUID returned by `/auth/me/`.
- The header selects among already verified memberships; it is never accepted as proof of access.
- Missing or ambiguous context fails closed.
- Forged cross-tenant identifiers return `403`.

Membership rows are protected by both application query scoping and PostgreSQL row-level security. Normal application requests use a non-superuser, non-`BYPASSRLS` database role; migrations use a separate administrative role.

## Versioning and errors

The contract is URL-versioned under `/api/v1/`. Field validation errors use DRF's field-to-message-list representation. Authentication failures use `401` or `403`, authorization failures use `403`, absent tenant context uses `404`, ambiguous tenant selection uses `400`, and throttling uses `429`.
