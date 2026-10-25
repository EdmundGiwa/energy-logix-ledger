from django.db import migrations


TABLES = (
    "tank_works_tankfieldjob",
    "tank_works_sludgewastemanifest",
    "tank_works_coatinginspection",
    "tank_works_crewequipmentutilization",
    "tank_works_tankworksauditevent",
)

FORWARD_SQL = "\n".join(
    f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY; "
    f"CREATE POLICY {table}_tenant_isolation ON {table} "
    f"USING (app_user_has_organization_membership(organization_id)) "
    f"WITH CHECK (app_user_has_organization_membership(organization_id));"
    for table in TABLES
) + """
CREATE OR REPLACE FUNCTION reject_tank_works_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'TankWorks audit records are immutable';
END;
$$;
CREATE TRIGGER tank_works_audit_immutable BEFORE UPDATE OR DELETE ON tank_works_tankworksauditevent FOR EACH ROW EXECUTE FUNCTION reject_tank_works_audit_mutation();

CREATE OR REPLACE FUNCTION enforce_tank_works_tenant_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_org bigint;
BEGIN
    IF TG_TABLE_NAME IN ('tank_works_sludgewastemanifest', 'tank_works_coatinginspection', 'tank_works_crewequipmentutilization', 'tank_works_tankworksauditevent') THEN
        SELECT organization_id INTO linked_org FROM tank_works_tankfieldjob WHERE id = NEW.job_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant job reference in %', TG_TABLE_NAME;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tank_waste_manifest_tenant_links BEFORE INSERT OR UPDATE ON tank_works_sludgewastemanifest FOR EACH ROW EXECUTE FUNCTION enforce_tank_works_tenant_links();
CREATE TRIGGER tank_coating_insp_tenant_links BEFORE INSERT OR UPDATE ON tank_works_coatinginspection FOR EACH ROW EXECUTE FUNCTION enforce_tank_works_tenant_links();
CREATE TRIGGER tank_utilization_tenant_links BEFORE INSERT OR UPDATE ON tank_works_crewequipmentutilization FOR EACH ROW EXECUTE FUNCTION enforce_tank_works_tenant_links();
CREATE TRIGGER tank_audit_tenant_links BEFORE INSERT OR UPDATE ON tank_works_tankworksauditevent FOR EACH ROW EXECUTE FUNCTION enforce_tank_works_tenant_links();
"""

REVERSE_SQL = "\n".join(
    f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}; "
    f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;"
    for table in TABLES
) + """
DROP TRIGGER IF EXISTS tank_works_audit_immutable ON tank_works_tankworksauditevent;
DROP FUNCTION IF EXISTS reject_tank_works_audit_mutation();
DROP TRIGGER IF EXISTS tank_waste_manifest_tenant_links ON tank_works_sludgewastemanifest;
DROP TRIGGER IF EXISTS tank_coating_insp_tenant_links ON tank_works_coatinginspection;
DROP TRIGGER IF EXISTS tank_utilization_tenant_links ON tank_works_crewequipmentutilization;
DROP TRIGGER IF EXISTS tank_audit_tenant_links ON tank_works_tankworksauditevent;
DROP FUNCTION IF EXISTS enforce_tank_works_tenant_links();
"""


class Migration(migrations.Migration):

    dependencies = [
        ("tank_works", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL),
    ]
