# Billing and Commercial API Specification (Module 10)

## Overview
Billing and Commercial delivers multi-currency commercial invoicing, operational job costing across modules (BunkerFlow, HaulTrac, TankWorks, PipeIntegrity, EPC-Link, MarineStores), Interim Payment Certificates (IPC) for EPC contracts, payment receipt reconciliation, customer statements, and accounts receivable ageing analysis.

All monetary amounts are strictly modeled as integer minor units (Kobo for NGN, Cents for USD) alongside ISO 4217 currency codes in full compliance with the product specification.

---

## Authentication & Multi-Tenancy
- **Session / Token Auth**: Authenticated via standard session or Bearer token.
- **Tenant Context**: Derived server-side from active membership; client-provided tenant headers are never authoritative.
- **PostgreSQL RLS**: Enforced on all tables with tenant isolation triggers.
- **Audit Immutability**: All commercial state changes produce append-only immutable audit records.

---

## Endpoints

### 1. Commercial Summary
`GET /api/v1/billing/summary/`
Returns key financial and accounts receivable metrics.

**Response `200 OK`**:
```json
{
  "total_billed_minor": 12500000000,
  "total_collected_minor": 8500000000,
  "total_outstanding_minor": 4000000000,
  "total_invoices_count": 24,
  "paid_invoices_count": 18,
  "overdue_invoices_count": 3,
  "total_customers_count": 12,
  "total_ipcs_count": 5,
  "approved_ipcs_count": 4
}
```

---

### 2. Customer Accounts
`GET /api/v1/billing/customers/?search=<query>`
Paginated list of customer accounts.

`POST /api/v1/billing/customers/`
Register a new customer account.
```json
{
  "name": "Shell Petroleum Development Company (SPDC)",
  "tax_id": "TIN-SPDC-9921",
  "contact_email": "commercial@shell.local",
  "contact_phone": "+234 803 000 0000",
  "billing_address": "Shell Industrial Area, Port Harcourt, Rivers State",
  "credit_limit_minor": 10000000000,
  "currency": "NGN",
  "payment_terms_days": 30
}
```

`GET /api/v1/billing/customers/<uuid:public_id>/statement/`
Generates real-time customer statement of account with running balance and ageing buckets (0–30d current, 31–60d overdue, 61–90d overdue, 90d+ overdue):
```json
{
  "customer_code": "CUST-202610-0001",
  "customer_name": "Shell Petroleum Development Company (SPDC)",
  "currency": "NGN",
  "total_outstanding_minor": 575000000,
  "ageing": {
    "current_0_30_minor": 575000000,
    "overdue_31_60_minor": 0,
    "overdue_61_90_minor": 0,
    "overdue_90_plus_minor": 0
  },
  "ledger": [
    {
      "date": "2026-10-10",
      "type": "invoice",
      "reference": "INV-202610-0001",
      "description": "Invoice INV-202610-0001 (partially_paid)",
      "debit_minor": 1075000000,
      "credit_minor": 0,
      "running_balance_minor": 1075000000
    },
    {
      "date": "2026-10-25",
      "type": "payment",
      "reference": "RCT-202610-0001",
      "description": "Payment RCT-202610-0001 (bank_transfer) - Ref: NIP-CBN-99881",
      "debit_minor": 0,
      "credit_minor": 500000000,
      "running_balance_minor": 575000000
    }
  ]
}
```

---

### 3. Commercial Invoices
`GET /api/v1/billing/invoices/?status=<draft|issued|partially_paid|paid|overdue|cancelled>&customer_id=<uuid>&currency=<NGN|USD>&search=<query>`
List invoices with line items and balance due.

`POST /api/v1/billing/invoices/`
Create invoice with line items:
```json
{
  "customer_id": "<uuid:customer_public_id>",
  "currency": "NGN",
  "vat_percent": "7.50",
  "wht_percent": "5.00",
  "line_items": [
    {
      "source_module": "bunkering",
      "source_record_id": "BDN-2026-001",
      "description": "Bunkering VLSFO Delivery 50 MT to MT Bonga Pioneer",
      "quantity": "50.000",
      "unit_of_measure": "MT",
      "unit_rate_minor": 20000000
    }
  ],
  "notes": "Offshore bunkering billing"
}
```

`POST /api/v1/billing/invoices/<uuid:public_id>/actions/<action>/`
Supported actions:
- `issue`: Transitions draft invoice to issued status (`{"version": 1, "reason": "..."}`).
- `cancel`: Cancels invoice and voids balance due (`{"version": 1, "reason": "..."}`).

---

### 4. Payment Receipts & Allocations
`GET /api/v1/billing/payments/?customer_id=<uuid>&invoice_id=<uuid>`
List payments.

`POST /api/v1/billing/payments/`
Post payment and automatically decrement invoice balance:
```json
{
  "customer_id": "<uuid:customer_public_id>",
  "invoice_id": "<uuid:invoice_public_id>",
  "payment_method": "bank_transfer",
  "transaction_reference": "NIP-CBN-20261025-99881",
  "amount_minor": 500000000,
  "currency": "NGN",
  "notes": "Direct bank transfer payment"
}
```

---

### 5. Interim Payment Certificates (IPC)
`GET /api/v1/billing/ipcs/?status=<draft|submitted|qs_certified|approved|invoiced>`
List EPC interim payment certificates.

`POST /api/v1/billing/ipcs/`
Create IPC:
```json
{
  "customer_id": "<uuid:customer_public_id>",
  "contract_reference": "EPC-BONGA-NORTH-SUBSEA",
  "project_name": "Bonga North Subsea Flowline Installation",
  "valuation_period_start": "2026-09-01",
  "valuation_period_end": "2026-09-30",
  "currency": "NGN",
  "gross_certified_minor": 5000000000,
  "retention_percent": "5.00",
  "advance_recovery_minor": 500000000,
  "notes": "Valuation No. 4"
}
```

`POST /api/v1/billing/ipcs/<uuid:public_id>/actions/<action>/`
Supported actions:
- `certify`: QS signs off valuation (`{"version": 1, "qs_sign_off_by": "Engr. M. Ibrahim"}`).
- `approve`: Project Director approves for client billing (`{"version": 2}`).
