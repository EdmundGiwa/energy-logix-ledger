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
