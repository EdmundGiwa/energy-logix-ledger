from django.db import migrations


TABLES = (
    "haulage_customer", "haulage_deliverylocation", "haulage_driver", "haulage_truck",
    "haulage_trailer", "haulage_dispatch", "haulage_weighbridgereading",
    "haulage_electronicwaybill", "haulage_proofofdelivery", "haulage_haulageauditevent",
)

FORWARD_SQL = "\n".join(
    f"""ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY {table}_tenant_isolation ON {table}
USING (app_user_has_organization_membership(organization_id))
WITH CHECK (app_user_has_organization_membership(organization_id));"""
    for table in TABLES
) + """

CREATE OR REPLACE FUNCTION reject_haulage_immutable_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Final HaulTrac records are immutable'; END;
$$;
CREATE TRIGGER haul_reading_immutable BEFORE UPDATE OR DELETE ON haulage_weighbridgereading FOR EACH ROW EXECUTE FUNCTION reject_haulage_immutable_mutation();
CREATE TRIGGER haul_waybill_immutable BEFORE UPDATE OR DELETE ON haulage_electronicwaybill FOR EACH ROW EXECUTE FUNCTION reject_haulage_immutable_mutation();
CREATE TRIGGER haul_pod_immutable BEFORE UPDATE OR DELETE ON haulage_proofofdelivery FOR EACH ROW EXECUTE FUNCTION reject_haulage_immutable_mutation();
CREATE TRIGGER haul_audit_immutable BEFORE UPDATE OR DELETE ON haulage_haulageauditevent FOR EACH ROW EXECUTE FUNCTION reject_haulage_immutable_mutation();

CREATE OR REPLACE FUNCTION protect_closed_haulage_dispatch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status = 'closed' THEN RAISE EXCEPTION 'Closed HaulTrac dispatches are immutable'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER haul_closed_dispatch_immutable BEFORE UPDATE OR DELETE ON haulage_dispatch FOR EACH ROW EXECUTE FUNCTION protect_closed_haulage_dispatch();
"""

REVERSE_SQL = """
DROP TRIGGER IF EXISTS haul_closed_dispatch_immutable ON haulage_dispatch;
DROP FUNCTION IF EXISTS protect_closed_haulage_dispatch();
DROP TRIGGER IF EXISTS haul_audit_immutable ON haulage_haulageauditevent;
DROP TRIGGER IF EXISTS haul_pod_immutable ON haulage_proofofdelivery;
DROP TRIGGER IF EXISTS haul_waybill_immutable ON haulage_electronicwaybill;
DROP TRIGGER IF EXISTS haul_reading_immutable ON haulage_weighbridgereading;
DROP FUNCTION IF EXISTS reject_haulage_immutable_mutation();
""" + "\n".join(
    f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table};\nALTER TABLE {table} DISABLE ROW LEVEL SECURITY;"
    for table in reversed(TABLES)
)


class Migration(migrations.Migration):
    dependencies = [("haulage", "0001_initial"), ("organizations", "0004_initial_owner_function")]
    operations = [migrations.RunSQL(FORWARD_SQL, REVERSE_SQL)]
