from django.db import migrations


TABLES = (
    "epc_link_approvedvendor",
    "epc_link_materialrequisition",
    "epc_link_pipeyarditem",
    "epc_link_materialissueslip",
    "epc_link_materialissueslipitem",
    "epc_link_epclinkauditevent",
)

FORWARD_SQL = "\n".join(
    f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY; "
    f"CREATE POLICY {table}_tenant_isolation ON {table} "
    f"USING (app_user_has_organization_membership(organization_id)) "
    f"WITH CHECK (app_user_has_organization_membership(organization_id));"
    for table in TABLES
) + """
CREATE OR REPLACE FUNCTION reject_epc_link_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'EPC-Link audit records are immutable';
END;
$$;
CREATE TRIGGER epc_audit_immutable BEFORE UPDATE OR DELETE ON epc_link_epclinkauditevent FOR EACH ROW EXECUTE FUNCTION reject_epc_link_audit_mutation();

CREATE OR REPLACE FUNCTION enforce_epc_link_tenant_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_org bigint;
BEGIN
    IF TG_TABLE_NAME = 'epc_link_pipeyarditem' THEN
        IF NEW.vendor_id IS NOT NULL THEN
            SELECT organization_id INTO linked_org FROM epc_link_approvedvendor WHERE id = NEW.vendor_id;
            IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
                RAISE EXCEPTION 'Cross-tenant vendor reference in pipe-yard item';
            END IF;
        END IF;
        IF NEW.reservation_id IS NOT NULL THEN
            SELECT organization_id INTO linked_org FROM epc_link_materialrequisition WHERE id = NEW.reservation_id;
            IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
                RAISE EXCEPTION 'Cross-tenant requisition reference in pipe-yard item';
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'epc_link_materialissueslip' THEN
        SELECT organization_id INTO linked_org FROM epc_link_materialrequisition WHERE id = NEW.requisition_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant requisition reference in material issue slip';
        END IF;
    ELSIF TG_TABLE_NAME = 'epc_link_materialissueslipitem' THEN
        SELECT organization_id INTO linked_org FROM epc_link_materialissueslip WHERE id = NEW.issue_slip_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant issue slip reference in issue slip item';
        END IF;
        SELECT organization_id INTO linked_org FROM epc_link_pipeyarditem WHERE id = NEW.yard_item_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant yard item reference in issue slip item';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER epc_yard_item_tenant_links BEFORE INSERT OR UPDATE ON epc_link_pipeyarditem FOR EACH ROW EXECUTE FUNCTION enforce_epc_link_tenant_links();
CREATE TRIGGER epc_issue_slip_tenant_links BEFORE INSERT OR UPDATE ON epc_link_materialissueslip FOR EACH ROW EXECUTE FUNCTION enforce_epc_link_tenant_links();
CREATE TRIGGER epc_slip_item_tenant_links BEFORE INSERT OR UPDATE ON epc_link_materialissueslipitem FOR EACH ROW EXECUTE FUNCTION enforce_epc_link_tenant_links();
"""

REVERSE_SQL = "\n".join(
    f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}; "
    f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;"
    for table in TABLES
) + """
DROP TRIGGER IF EXISTS epc_audit_immutable ON epc_link_epclinkauditevent;
DROP FUNCTION IF EXISTS reject_epc_link_audit_mutation();
DROP TRIGGER IF EXISTS epc_yard_item_tenant_links ON epc_link_pipeyarditem;
DROP TRIGGER IF EXISTS epc_issue_slip_tenant_links ON epc_link_materialissueslip;
DROP TRIGGER IF EXISTS epc_slip_item_tenant_links ON epc_link_materialissueslipitem;
DROP FUNCTION IF EXISTS enforce_epc_link_tenant_links();
"""


class Migration(migrations.Migration):

    dependencies = [
        ("epc_link", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL),
    ]
