# Customer provisioning and module entitlements

Offshora accounts are invite-only. Prospects book a demo; after the call, Offshora staff create the customer's workspace with the modules they agreed to buy.

## Flow

1. **Demo booked.** The prospect completes `/book-demo`. A `DemoRequest` appears in Django admin.
2. **Create customer account.** A platform superuser opens the booking in admin and clicks **Create customer account →**. The form is pre-filled from the booking (company, contact, chosen modules) and can be adjusted.
3. **Provisioning** (`organizations.services.provision_customer`, one transaction):
   - creates the `Organization` and the owner `User` with **no usable password**;
   - creates the owner `Membership` through the existing `app_create_initial_owner_membership` database function, so row-level security rules are unchanged;
   - switches on the selected modules and records each change in `ModuleEntitlementEvent`;
   - links the booking to the new organization (`DemoRequest.converted_organization`).
4. **Invite.** After commit, the owner receives a branded email with a one-time **set your password** link. The link is a `PasswordResetToken` with `purpose=invite`, expires after 7 days, and points to `/reset-password?token=…&invite=1`. Accepting it sets the password, marks the email verified and records `invite_accepted`. Admin action **Resend the owner's set-password invite** revokes the old link and issues a new one.
5. **Sign in.** The owner signs in at `/login`. Their dashboard shows their modules; other modules appear under **More modules** with a lock.

## Modules

The registry lives in `backend/organizations/modules.py`.

- **Core (every customer):** Compliance Shield, Billing & Commercial, Owner Dashboard.
- **Optional:** every other module, switched on per organization (`OrganizationModule`).
- **Changing modules:** admin → Organization → **Manage modules**. Only active superusers can change them (enforced in the service and by row-level security), and every change is audited with actor and reason.
- **Customer requests:** owners and admins click **Request access** on a locked module. This creates a `ModuleAccessRequest` and emails `SALES_NOTIFY_EMAILS`. Staff approve or decline it in admin; approving switches the module on.

## Enforcement

Module access is enforced **server-side** in `organizations.context.resolve_membership`, which every module API already calls. A request to a module app the organization lacks returns:

```
HTTP 403
{"detail": "<Module> is not part of your Offshora plan. An owner or administrator can request it from the dashboard."}
```

(error code `module_not_enabled`). Every Django app serving `/api/v1/` must be listed in `MODULE_APPS` or `PLATFORM_APPS`. `organizations.tests.test_entitlements` fails if an app is unclassified and checks that every optional-module endpoint refuses unentitled organizations.

Hiding modules in the dashboard is presentation only, not access control.

## API changes

| Change | Detail |
| --- | --- |
| `GET /api/v1/auth/me/` | `memberships[].organization.enabled_modules`: sorted module keys (core plus optional). |
| `GET /api/v1/organizations/current/module-requests/` | The organization's module requests: `id`, `module`, `message`, `status` (`open`/`approved`/`declined`), `created_at`. Any active member can call it. |
| `POST /api/v1/organizations/current/module-requests/` | Body `{"module": "<key>", "message": "optional, ≤500 chars"}`. Owner or admin only (otherwise 403). Returns 201 for a new request, or 200 with the existing open request (idempotent). Returns 400 for an unknown module or one already enabled. Rate limit: 20/hour. |
| `POST /api/v1/auth/register/` | **Removed** (404). Self-service sign-up is closed. |
| Module APIs | Return 403 `module_not_enabled` for modules the organization lacks. |

## Database and deploy notes

- **Migrations:**
  - `organizations` 0005–0007;
  - `identity` 0004 (token `purpose` and new auth event types);
  - `demo_requests` 0002.
- **Row-level security:** `0006` enables it on the three entitlement tables. Members see their own organization's rows, and active superusers can manage all rows through `app_actor_is_platform_admin()`.
- **Existing data:** `0007` preserves pre-release behaviour by switching **every optional module on for organizations that already exist**, recorded with reason "Preserved pre-entitlement access at release". Trim each customer to what they bought after deploying. Rolling back `0007` removes exactly those rows.
- **Rollback:** verified locally by rolling `organizations` back to 0004 and re-applying.
- **Configuration:** `DEMO_REQUEST_NOTIFY_EMAILS` sets the sales inbox for booking alerts and module requests (default `support@ofshora.com`). `FRONTEND_BASE_URL` must be correct in each environment, because invite links use it.
