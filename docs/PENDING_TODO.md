# Pending work

This file records deliberately deferred work. An item remains pending until its
behaviour, security controls, implementation, and tests are complete.

## Identity and account security

### Email verification and one-time passwords

**Status:** Pending before a production or real-customer pilot.

- Verify ownership of an email address after registration and after an email
  address change.
- Decide whether the verification experience uses a single-use link, a numeric
  email OTP, or both. Select and configure an email provider before implementation.
- Store only hashed verification credentials; make them single-use and
  short-lived; enforce resend cooldowns, attempt limits, endpoint throttling,
  and generic responses that do not reveal whether an account exists.
- Record verification, resend, success, failure, expiry, and email-change events
  in the authentication audit trail without logging credentials.
- Define what an unverified account may access. Until that policy is approved,
  verification must not be presented as an active security boundary.
- Treat MFA as a separate control from email ownership verification. Define
  enrolment, challenge, recovery, factor replacement, and mandatory roles before
  enabling OTP-based MFA for owners, administrators, or support users.
- Add focused expiry, reuse, brute-force, resend, enumeration, concurrency, and
  tenant-isolation tests.

## HaulTrac integrations

### External weighbridge providers

**Status:** Pending confirmed provider contracts and API access.

- External weighbridge integrations will remain clearly marked as unavailable
  until provider contracts and API access have been confirmed.
- HaulTrac must identify manually entered readings as manual and must not imply
  that they came directly from a weighbridge.
- Each future provider integration requires a documented payload contract,
  credential and signature validation, timeouts, bounded retries, idempotency,
  observable failures, and tenant-isolation tests before it can be enabled.

## SafePass production decisions

### Safety procedures and approval authority

**Status:** Domain-owner approval required before a real operational pilot.

- Confirm atmospheric limits, gas-test recency requirements, retest frequency,
  permit durations, and escalation rules for every site and permit type.
- Confirm the real Performing Authority, Area Authority, Site Authority, and OIM
  approval chain. The MVP restricts consequential approval actions to tenant
  owners and administrators but does not claim this is an operator-approved chain.
- Confirm accepted BOSIET/HUET/STCW providers, OSP verification method, medical
  fitness evidence, credential equivalents, and jurisdiction-specific validity.
- Confirm whether the 30-day mobilization buffer applies to every operation or
  must vary by customer, site, role, and credential.

### Secure certificate files

**Status:** Metadata foundation implemented; binary upload remains unavailable.

- SafePass stores an internal document-vault reference only. Do not present this
  as an uploaded or verified certificate until tenant-scoped object storage,
  content validation, malware scanning, retention, and authorized download are
  implemented and tested.
