# Security Policy and Engineering Baseline

This document defines the minimum security expectations for PetroLedger. It is an engineering baseline, not a claim of certification or regulatory compliance. Security controls must be verified in the deployed environment.

## Scope and threat model

PetroLedger is expected to process tenant-isolated operational records, employee and contractor personal data, documents, safety permits, signatures, inventory movements, and financial records. It may operate on intermittently connected field devices and integrate with customer, payment, government, and industrial systems.

Primary risks include:

- cross-tenant data disclosure or modification;
- account takeover and privilege escalation;
- unauthorized alteration of signed, safety, inventory, or financial records;
- lost or compromised offline devices;
- malicious documents and unsafe exports;
- leaked credentials or integration secrets;
- replayed sync, webhook, or payment operations;
- excessive support or administrator access;
- unavailable service or corrupted recovery data; and
- unlawful collection, retention, or transfer of personal data.

## Security ownership

- Every feature owner is responsible for its authorization, tenant isolation, validation, auditability, and failure behaviour.
- Security-sensitive architectural decisions must be documented before implementation.
- A control is not complete until it has negative-path tests and is enabled in the deployed environment.
- Exceptions require a documented owner, reason, compensating control, expiry date, and removal plan.

## Identity and session security

- Prefer a maintained identity provider or established authentication framework over custom authentication.
- Require MFA for platform administrators, tenant administrators, finance approvers, signatories, and support users with customer-data access.
- Prefer phishing-resistant passkeys/WebAuthn where practical; support TOTP where necessary. SMS must not be the only factor for privileged accounts.
- Use `Secure`, `HttpOnly`, and appropriate `SameSite` cookies for browser sessions. Do not store reusable session credentials in browser local storage.
- Rotate session identifiers after login, account recovery, and privilege changes. Invalidate sessions on logout, suspension, credential reset, or device revocation.
- Apply idle and absolute timeouts appropriate to role and data sensitivity.
- Require step-up authentication for role changes, exports, signing, payments, API-key management, MFA changes, and other high-risk actions.
- Rate-limit authentication and recovery flows without enabling trivial account-denial attacks. Log and alert on suspicious activity without logging credentials.

## Authorization and tenant isolation

- Deny access by default and enforce authorization on the server for every operation.
- Bind every tenant-scoped request to an authenticated, active membership and verified tenant context.
- Never trust a role, permission, ownership flag, or tenant identifier supplied by a client.
- Enforce resource- and operation-level permissions, not only route-level permissions.
- Protect shared tables with application scoping and PostgreSQL row-level security where applicable.
- Tenant context used by RLS must be transaction-local and re-established for every transaction. Missing context must fail closed.
- Normal request connections must not use database superuser or `BYPASSRLS` privileges.
- Tenant-scope object storage, caches, queues, scheduled jobs, WebSockets, search, exports, backups, metrics, and logs.
- Test isolation through the same database role, connection pool, API, and worker paths used in production.

## Critical records and auditability

- Treat signed records, permits, measurements, financial postings, inventory movements, and audit events as high-integrity data.
- Use transactions, database constraints, idempotency keys, and explicit state-transition validation.
- Do not mutate a signed or posted record in place. Record corrections as linked amendments, reversals, or superseding versions.
- Audit authentication events, authorization failures, privileged reads, exports, role changes, sign-offs, state transitions, integration changes, and support access.
- Audit entries must identify actor, tenant, action, target, timestamp, outcome, and request/correlation ID. Capture before/after state only when it will not expose secrets or unnecessarily duplicate personal data.
- Protect audit logs from ordinary application updates and define retention and monitored access.
- Cryptographic signatures and legal electronic acknowledgements are different controls; document which one a workflow provides.

## Offline and device security

- Minimize records downloaded to each user and device.
- Encrypt offline data using platform-backed keys. Never embed encryption keys or permanent credentials in the application bundle.
- Register devices, issue revocable credentials, and support remote session revocation. Document that a disconnected device cannot receive revocation until it reconnects.
- Use short-lived access credentials and protected refresh credentials.
- Authenticate sync messages and make operations replay-resistant and idempotent.
- Resolve conflicts explicitly for signed, safety, financial, inventory, and audit data; last-write-wins is prohibited for these classes.
- Expire local data and clear tenant state on logout or tenant switching where operational requirements permit.

## API, browser, and integration security

- Validate type, format, length, range, and state on the server. Use parameterized queries and context-appropriate output encoding.
- Use HTTPS for all traffic and authenticated encryption for service-to-service communication.
- Configure CORS with explicit trusted origins. Credentialed wildcard CORS is prohibited.
- Protect cookie-authenticated state changes against CSRF.
- Deploy an appropriate Content Security Policy and other standard browser security headers.
- Rate-limit expensive and sensitive endpoints by the relevant combination of tenant, user, credential, IP address, and operation.
- Apply outbound URL allowlists and network egress controls where integrations could enable SSRF.
- Webhooks require signature verification, timestamp/replay validation, idempotency, safe retry handling, and secret rotation.
- Integrations require least-privileged credentials, explicit timeouts, bounded retries with backoff, observable failures, and circuit-breaking where justified.
- Never expose internal stack traces, secrets, or sensitive record contents in API errors.

## Documents and object storage

- Store user uploads outside executable application paths using non-user-controlled object names.
- Verify file content as well as extension and declared content type. Enforce size, count, and decompression limits.
- Scan untrusted files for malware before release or processing. Isolate scanning failures rather than silently accepting files.
- Do not execute macros or render active untrusted HTML.
- Authorize every upload and download. Use short-lived signed URLs only after server-side tenant and resource authorization.
- Encrypt objects and backups, restrict storage credentials, and audit upload, download, share, export, retention, and deletion actions.

## Secrets, infrastructure, and operations

- Keep secrets in an approved secret manager or protected environment configuration. Never commit them or expose them through client-side environment variables.
- Separate development, test, staging, and production credentials and data.
- Use least-privileged identities for applications, workers, deployment jobs, databases, and storage.
- Restrict production administrative access with MFA, short-lived credentials, and audit logging.
- Patch supported runtime, framework, container, operating-system, and database versions promptly according to risk.
- Encrypt databases, storage, replicas, and backups. Manage and rotate keys separately from encrypted data.
- Maintain tested backups and regularly prove full-system and single-tenant restoration without cross-tenant disclosure.
- Monitor authentication anomalies, authorization failures, privilege changes, cross-tenant denials, malware detections, unusual exports, queue failures, and integrity-control failures.
- Maintain actionable alerts, runbooks, escalation contacts, and time-synchronized logs.

## Privacy and data governance

- Follow the Nigeria Data Protection Act and applicable NDPC guidance; obtain legal review for controller/processor roles and customer obligations.
- Perform and maintain a Data Protection Impact Assessment before processing high-risk or large-scale personal data.
- Collect only necessary personal data and document purpose, lawful basis, access, location, retention, deletion, and approved subprocessors.
- Provide procedures for data-subject requests, tenant export, tenant offboarding, legal hold, and deletion across primary stores, replicas, caches, object versions, and backups.
- Do not use production personal data in development or test environments unless expressly approved, minimized, and protected.
- Maintain an incident-response and breach-assessment process capable of meeting applicable notification deadlines.

## Secure development lifecycle

- Use OWASP ASVS as the application-security verification baseline and OWASP MASVS where a native mobile application is introduced.
- Threat-model tenant boundaries, authentication, offline sync, uploads, payments, signatures, exports, and new integrations before implementation.
- Require code review and passing tests before merging. Protect release branches and production deployment workflows.
- Run dependency, secret, static-analysis, and container or infrastructure scans appropriate to the code being changed.
- Pin and review dependencies, generate a software bill of materials for releases, and define a vulnerability-remediation process.
- Add regression tests for every security defect.
- Obtain an independent penetration test before storing real customer operational data and after major security-boundary changes.

## Minimum production gate

Production or a real-data pilot requires, at minimum:

- an approved tenant and authorization model;
- MFA for privileged roles and secure session management;
- tested tenant isolation across API, database, workers, storage, cache, search, and exports;
- encrypted transport, persistent storage, backups, and offline data;
- protected audit history and critical-record state transitions;
- hardened upload and download flows;
- managed secrets and least-privileged production access;
- tested backup restoration and incident-response procedures;
- a DPIA, retention policy, subprocessor inventory, and customer data-processing terms; and
- an independent security assessment with critical and high findings resolved or formally accepted.

## Vulnerability reporting and response

Do not open a public issue containing an exploitable vulnerability, secret, or customer data. Until a dedicated private reporting channel is published, report suspected vulnerabilities privately to the repository owner or designated security contact.

On receipt of a report:

1. Preserve evidence without unnecessarily copying sensitive data.
2. Acknowledge and triage severity and tenant impact.
3. Contain exposure and rotate affected credentials where necessary.
4. Fix the root cause and add regression coverage.
5. Assess notification obligations and communicate through approved channels.
6. Document the timeline, decisions, affected scope, and follow-up actions.

## References

- OWASP Application Security Verification Standard: <https://owasp.org/www-project-application-security-verification-standard/>
- OWASP Multi-Tenant Security Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html>
- OWASP Cheat Sheet Series: <https://cheatsheetseries.owasp.org/>
- NIST SP 800-207, Zero Trust Architecture: <https://csrc.nist.gov/pubs/sp/800/207/final>
- Nigeria Data Protection Commission: <https://ndpc.gov.ng/>
