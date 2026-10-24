from django.db import migrations


TABLES = (
    "refinery_link_terminal",
    "refinery_link_depottank",
    "refinery_link_offtakeappointment",
    "refinery_link_tankgaugedip",
    "refinery_link_gantrymeterticket",
    "refinery_link_batchqualitycertificate",
    "refinery_link_refineryauditevent",
)

FORWARD_SQL = "\n".join(
    f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY; "
    f"CREATE POLICY {table}_tenant_isolation ON {table} "
    f"USING (app_user_has_organization_membership(organization_id)) "
    f"WITH CHECK (app_user_has_organization_membership(organization_id));"
    for table in TABLES
) + """
CREATE OR REPLACE FUNCTION reject_refinery_immutable_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Refinery audit records are immutable';
END;
$$;
CREATE TRIGGER refinery_audit_immutable BEFORE UPDATE OR DELETE ON refinery_link_refineryauditevent FOR EACH ROW EXECUTE FUNCTION reject_refinery_immutable_mutation();

CREATE OR REPLACE FUNCTION enforce_refinery_tenant_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_org bigint;
BEGIN
    IF TG_TABLE_NAME = 'refinery_link_depottank' THEN
        SELECT organization_id INTO linked_org FROM refinery_link_terminal WHERE id = NEW.terminal_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant terminal reference in depot tank';
        END IF;
    ELSIF TG_TABLE_NAME = 'refinery_link_offtakeappointment' THEN
        SELECT organization_id INTO linked_org FROM refinery_link_terminal WHERE id = NEW.terminal_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant terminal reference in appointment';
        END IF;
    ELSIF TG_TABLE_NAME = 'refinery_link_tankgaugedip' THEN
        SELECT organization_id INTO linked_org FROM refinery_link_depottank WHERE id = NEW.tank_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant depot tank reference in tank dip';
        END IF;
    ELSIF TG_TABLE_NAME = 'refinery_link_gantrymeterticket' THEN
        SELECT organization_id INTO linked_org FROM refinery_link_offtakeappointment WHERE id = NEW.appointment_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant appointment reference in meter ticket';
        END IF;
        SELECT organization_id INTO linked_org FROM refinery_link_depottank WHERE id = NEW.tank_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant depot tank reference in meter ticket';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER refinery_tank_tenant_links BEFORE INSERT OR UPDATE ON refinery_link_depottank FOR EACH ROW EXECUTE FUNCTION enforce_refinery_tenant_links();
CREATE TRIGGER refinery_appt_tenant_links BEFORE INSERT OR UPDATE ON refinery_link_offtakeappointment FOR EACH ROW EXECUTE FUNCTION enforce_refinery_tenant_links();
CREATE TRIGGER refinery_dip_tenant_links BEFORE INSERT OR UPDATE ON refinery_link_tankgaugedip FOR EACH ROW EXECUTE FUNCTION enforce_refinery_tenant_links();
CREATE TRIGGER refinery_ticket_tenant_links BEFORE INSERT OR UPDATE ON refinery_link_gantrymeterticket FOR EACH ROW EXECUTE FUNCTION enforce_refinery_tenant_links();
"""

REVERSE_SQL = """
DROP TRIGGER IF EXISTS refinery_ticket_tenant_links ON refinery_link_gantrymeterticket;
DROP TRIGGER IF EXISTS refinery_dip_tenant_links ON refinery_link_tankgaugedip;
DROP TRIGGER IF EXISTS refinery_appt_tenant_links ON refinery_link_offtakeappointment;
DROP TRIGGER IF EXISTS refinery_tank_tenant_links ON refinery_link_depottank;
DROP FUNCTION IF EXISTS enforce_refinery_tenant_links();
DROP TRIGGER IF EXISTS refinery_audit_immutable ON refinery_link_refineryauditevent;
DROP FUNCTION IF EXISTS reject_refinery_immutable_mutation();
""" + "\n".join(
    f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}; ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;"
    for table in reversed(TABLES)
)


class Migration(migrations.Migration):
    dependencies = [("refinery_link", "0001_initial")]
    operations = [migrations.RunSQL(FORWARD_SQL, REVERSE_SQL)]
