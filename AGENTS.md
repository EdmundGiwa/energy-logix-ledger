# AGENTS.md

Canonical, vendor-neutral instructions for every AI coding agent working in this repository. Read this file first for every task. Vendor-specific files such as `CLAUDE.md` are thin adapters and must not duplicate or contradict these rules.

## Product and current state

Offshora Energy OS is a multi-tenant operating platform for energy-service contractors. The product specification is `Offshora_Product_Specification_v3.md`.

The repository currently contains a Next.js 16 prototype with mock data. Authentication, APIs, persistence, background jobs, offline synchronization, tenant isolation, and third-party integrations are not implemented yet. Do not describe prototype screens as working backend features.

The intended backend stack is Python, Django, Django REST Framework, and PostgreSQL. Redis, Celery, object storage, and other infrastructure must be introduced only when a concrete requirement needs them. Do not create domain models or external integrations from the product specification alone; establish the feature contract and business rules first.

## Required reading order

Read only what the task requires, in this order:

1. `AGENTS.md`
2. `SECURITY.md` for authentication, authorization, tenancy, personal data, uploads, offline data, integrations, infrastructure, or deployment
3. `GLOSSARY.md` when a task uses an unfamiliar industry term, acronym, measurement, regulator, standard, or workflow
4. `frontend/AGENTS.md` and the relevant guide under `frontend/node_modules/next/dist/docs/` before changing Next.js code
5. The relevant product-specification section when product behaviour is in question
6. Feature documentation, source, migrations, and tests; these are the implementation truth once they exist

Do not load documentation speculatively. If a required document or local Next.js guide is missing, say so rather than relying on remembered framework behaviour.

When introducing a domain term that a general software engineer may not know, add a concise definition to `GLOSSARY.md` in the same change. Do not invent or infer a regulatory, engineering, safety, or measurement definition. Mark uncertain or jurisdiction-dependent meanings for domain-expert verification.

## Engineering rules

- Understand the execution path before changing it. Distinguish repository facts from assumptions.
- Prefer the smallest production-quality solution that fits existing patterns.
- Preserve architectural boundaries and unrelated work. Do not reformat, rename, or refactor outside the requested scope.
- Keep business rules in backend services or domain functions, not in views, serializers, admin classes, tasks, or React components.
- Use one authoritative code path for each critical operation. Web requests, admin actions, imports, scheduled jobs, and integrations must call the same service.
- Validate untrusted input at the boundary and return explicit, structured errors. Never silently repair invalid operational data.
- Preserve API and event contracts unless a contract change is intentional and documented.
- Use database transactions, constraints, indexes, locking, and idempotency deliberately where concurrency or retries matter.
- Do not hide failures with broad exception handling or insecure fallbacks.
- Never expose credentials, tokens, personal data, or customer records in source, fixtures, logs, errors, screenshots, or agent output.

## Multi-tenancy and authorization

- Every tenant-owned record must have an explicit, non-null tenant relationship unless stronger physical isolation is used.
- Derive tenant context from the authenticated user's verified membership. A client-provided tenant ID is never proof of access.
- Enforce authorization server-side for every operation and resource. UI visibility is not an authorization control.
- Scope database queries, unique constraints, caches, object-storage paths, search indexes, background jobs, notifications, exports, logs, and rate limits by tenant where applicable.
- Use PostgreSQL row-level security as defence in depth for shared tenant tables when the backend is introduced. Normal request connections must not use a superuser or `BYPASSRLS` role.
- Fail closed when tenant context is absent or invalid.
- Tests for tenant-owned resources must create at least two tenants and prove cross-tenant read, write, update, delete, search, export, and indirect-reference attempts fail.
- Platform-support access to customer data must be explicit, time-limited, least-privileged, and audited.

See `SECURITY.md` for the complete security baseline.

## Data and state

- Store money as integer minor units plus an ISO 4217 currency code. Never use floating-point values for money.
- Important state changes must record actor, tenant, timestamp, reason where applicable, and the relevant before/after state.
- Signed records, permits, financial postings, inventory movements, and audit events must not be silently overwritten. Corrections use explicit reversal, amendment, or superseding records.
- Schema changes require migrations, existing-data consideration, constraints, rollback implications, and fresh-database verification.
- Offline synchronization must be idempotent and conflict-aware. Do not apply last-write-wins to signed, financial, safety, inventory, or audit records.

## Django models and admin

Every production model must be deliberately considered for Django admin registration. Register it unless exposing it in admin would create an unjustified security or operational risk; document any deliberate omission.

Admin registrations must be useful and safe, not bare `admin.site.register(Model)` registrations:

- Provide meaningful `list_display` columns, including tenant/organization, status, and relevant timestamps where applicable.
- Add appropriate `list_filter`, `search_fields`, `ordering`, and `date_hierarchy` for the model's real operational lookup needs.
- Use `autocomplete_fields`, `raw_id_fields`, or optimized querysets for large relationships; do not render unbounded foreign-key dropdowns.
- Use `list_select_related`, `prefetch_related`, or `get_queryset()` where needed to prevent N+1 queries.
- Make immutable identifiers, audit fields, signed values, and system-managed fields read-only.
- Restrict admin querysets and object permissions by tenant and role. Registration does not grant universal access.
- Admin actions that change business state must call the same service layer as the API, validate transitions, be transactional and idempotent where needed, and produce audit records.
- Do not expose secrets, password material, raw tokens, sensitive personal data, or unrestricted document links in list pages, search, filters, or forms.
- Add focused admin tests for permissions, tenant isolation, search/filter behaviour, read-only fields, and consequential actions.

## API and integration contracts

- Define and document authentication, authorization, request validation, response shape, pagination, error codes, idempotency, and versioning before exposing an endpoint.
- External integrations require explicit timeouts, bounded retries with backoff, idempotency, signature or credential validation, rate-limit handling, and observable failure states.
- Do not claim an integration exists until access and behaviour have been verified against the provider.
- Never mock away important production integration behaviour in the implementation.

## UI component work (Living UI)

For any task that designs, builds, or refines a UI component, layout, or micro-interaction in
`frontend/`, read and follow `.agents/skills/living-ui/SKILL.md` before writing component code.
It is a four-step workflow, not a suggestion:

1. Check `.agents/skills/living-ui/references/catalog.md` for an existing, already-adapted
   component before building one from scratch or reaching for a generic implementation.
2. If nothing fits, query 21st.dev for a real component (`bash
   .agents/skills/living-ui/scripts/fetch_21st.sh search "<query>"`, or the `21st` CLI directly).
   This requires `API_KEY_21ST` to be supplied through the current process environment. Never
   read credentials from another project, print the key's value, or commit it.
3. De-slop the fetched component against `.agents/skills/living-ui/references/design-tokens.md`
   and this project's own conventions (its actual palette, spacing, and existing patterns in
   `frontend/src/components/dashboard/`) before using it — never ship a raw third-party
   component with its original placeholder copy or a competing design system's tokens.
4. Ingest the de-slopped component with `python3
   .agents/skills/living-ui/scripts/ingest_component.py` so neither this agent nor any other
   has to re-fetch or re-adapt it. This keeps the catalog specific to Offshora; do not copy
   another project's catalog entries or `resources/components/` into this one.

## Task execution

Before substantial work:

1. State the feature or application in scope.
2. Identify expected files, contracts, migrations, security boundaries, and dependencies.
3. Trace the current implementation and state material assumptions or risks.

During work:

- Make the smallest coherent patch.
- Stop and report if the required change belongs to a different area or materially exceeds the agreed scope.
- Ask before changing an unclear business rule, public contract, migration history, or production data behaviour.

After work:

1. Run focused behavioural tests.
2. For backend migrations, run the established suite against a fresh database.
3. Run relevant type checks, linting, and builds.
4. Review the final diff for unintended changes and secret or personal-data exposure.
5. Report exact checks run, failures or skipped checks, and remaining risks. Never imply unperformed browser, integration, migration, or deployment testing passed.

Do not pipe test output through a command that can hide the test runner's exit status.

## Git discipline

- Inspect branch and worktree state before editing, pulling, switching branches, committing, or pushing.
- Preserve unrelated dirty and untracked work.
- Stage only the requested change and keep commits coherent.
- Do not resolve migration, security-policy, or business-rule conflicts by taking one side wholesale.
- Do not add AI attribution, `Co-Authored-By`, or generated-by messages to commits.

## Core principle

Explicit intent beats convenience. Security boundaries, business rules, and data contracts must be visible, testable, and fail closed.
