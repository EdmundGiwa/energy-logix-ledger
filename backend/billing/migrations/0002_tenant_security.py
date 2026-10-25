from django.db import migrations


TABLES = (
    "billing_customeraccount",
    "billing_commercialinvoice",
    "billing_invoicelineitem",
    "billing_interimpaymentcertificate",
    "billing_paymentreceipt",
    "billing_billingauditevent",
)

FORWARD_SQL = "\n".join(
    f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY; "
    f"CREATE POLICY {table}_tenant_isolation ON {table} "
    f"USING (app_user_has_organization_membership(organization_id)) "
    f"WITH CHECK (app_user_has_organization_membership(organization_id));"
    for table in TABLES
) + """
CREATE OR REPLACE FUNCTION reject_billing_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Billing audit records are immutable';
END;
$$;
CREATE TRIGGER billing_audit_immutable BEFORE UPDATE OR DELETE ON billing_billingauditevent FOR EACH ROW EXECUTE FUNCTION reject_billing_audit_mutation();

CREATE OR REPLACE FUNCTION enforce_billing_tenant_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_org bigint;
BEGIN
    IF TG_TABLE_NAME = 'billing_commercialinvoice' THEN
        SELECT organization_id INTO linked_org FROM billing_customeraccount WHERE id = NEW.customer_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant customer reference in commercial invoice';
        END IF;
    ELSIF TG_TABLE_NAME = 'billing_invoicelineitem' THEN
        SELECT organization_id INTO linked_org FROM billing_commercialinvoice WHERE id = NEW.invoice_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant invoice reference in line item';
        END IF;
    ELSIF TG_TABLE_NAME = 'billing_interimpaymentcertificate' THEN
        SELECT organization_id INTO linked_org FROM billing_customeraccount WHERE id = NEW.customer_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant customer reference in IPC';
        END IF;
    ELSIF TG_TABLE_NAME = 'billing_paymentreceipt' THEN
        SELECT organization_id INTO linked_org FROM billing_customeraccount WHERE id = NEW.customer_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant customer reference in payment receipt';
        END IF;
        IF NEW.invoice_id IS NOT NULL THEN
            SELECT organization_id INTO linked_org FROM billing_commercialinvoice WHERE id = NEW.invoice_id;
            IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
                RAISE EXCEPTION 'Cross-tenant invoice reference in payment receipt';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER billing_invoice_tenant_links BEFORE INSERT OR UPDATE ON billing_commercialinvoice FOR EACH ROW EXECUTE FUNCTION enforce_billing_tenant_links();
CREATE TRIGGER billing_line_tenant_links BEFORE INSERT OR UPDATE ON billing_invoicelineitem FOR EACH ROW EXECUTE FUNCTION enforce_billing_tenant_links();
CREATE TRIGGER billing_ipc_tenant_links BEFORE INSERT OR UPDATE ON billing_interimpaymentcertificate FOR EACH ROW EXECUTE FUNCTION enforce_billing_tenant_links();
CREATE TRIGGER billing_receipt_tenant_links BEFORE INSERT OR UPDATE ON billing_paymentreceipt FOR EACH ROW EXECUTE FUNCTION enforce_billing_tenant_links();
"""

REVERSE_SQL = "\n".join(
    f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}; "
    f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;"
    for table in TABLES
) + """
DROP TRIGGER IF EXISTS billing_audit_immutable ON billing_billingauditevent;
DROP FUNCTION IF EXISTS reject_billing_audit_mutation();
DROP TRIGGER IF EXISTS billing_invoice_tenant_links ON billing_commercialinvoice;
DROP TRIGGER IF EXISTS billing_line_tenant_links ON billing_invoicelineitem;
DROP TRIGGER IF EXISTS billing_ipc_tenant_links ON billing_interimpaymentcertificate;
DROP TRIGGER IF EXISTS billing_receipt_tenant_links ON billing_paymentreceipt;
DROP FUNCTION IF EXISTS enforce_billing_tenant_links();
"""


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL),
    ]
