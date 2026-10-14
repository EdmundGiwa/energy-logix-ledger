from django.db import migrations


FORWARD_SQL = """
CREATE OR REPLACE FUNCTION enforce_haul_dispatch_fleet_reference()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_organization_id bigint;
BEGIN
    IF NEW.fleet_id IS NOT NULL THEN
        SELECT organization_id INTO linked_organization_id FROM haulage_fleet WHERE id = NEW.fleet_id;
        IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant dispatch fleet reference'; END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER haul_dispatch_fleet_reference
BEFORE INSERT OR UPDATE ON haulage_dispatch
FOR EACH ROW EXECUTE FUNCTION enforce_haul_dispatch_fleet_reference();

CREATE OR REPLACE FUNCTION enforce_haul_fleet_audit_reference()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_organization_id bigint;
BEGIN
    SELECT organization_id INTO linked_organization_id FROM haulage_fleet WHERE id = NEW.fleet_id;
    IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant fleet audit reference'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER haul_fleet_audit_reference
BEFORE INSERT OR UPDATE ON haulage_fleetauditevent
FOR EACH ROW EXECUTE FUNCTION enforce_haul_fleet_audit_reference();
"""

REVERSE_SQL = """
DROP TRIGGER IF EXISTS haul_fleet_audit_reference ON haulage_fleetauditevent;
DROP FUNCTION IF EXISTS enforce_haul_fleet_audit_reference();
DROP TRIGGER IF EXISTS haul_dispatch_fleet_reference ON haulage_dispatch;
DROP FUNCTION IF EXISTS enforce_haul_dispatch_fleet_reference();
"""


class Migration(migrations.Migration):
    dependencies = [("haulage", "0006_fleet_tenant_security")]
    operations = [migrations.RunSQL(FORWARD_SQL, REVERSE_SQL)]
