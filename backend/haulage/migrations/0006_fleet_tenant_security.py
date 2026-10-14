from django.db import migrations


FORWARD_SQL = """
ALTER TABLE haulage_fleet ENABLE ROW LEVEL SECURITY;
CREATE POLICY haulage_fleet_tenant_isolation ON haulage_fleet
USING (app_user_has_organization_membership(organization_id))
WITH CHECK (app_user_has_organization_membership(organization_id));

ALTER TABLE haulage_fleetauditevent ENABLE ROW LEVEL SECURITY;
CREATE POLICY haulage_fleetauditevent_tenant_isolation ON haulage_fleetauditevent
USING (app_user_has_organization_membership(organization_id))
WITH CHECK (app_user_has_organization_membership(organization_id));

CREATE TRIGGER haul_fleet_audit_immutable
BEFORE UPDATE OR DELETE ON haulage_fleetauditevent
FOR EACH ROW EXECUTE FUNCTION reject_haulage_immutable_mutation();

CREATE OR REPLACE FUNCTION enforce_haulage_fleet_tenant_links()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_organization_id bigint;
BEGIN
    IF NEW.customer_id IS NOT NULL THEN
        SELECT organization_id INTO linked_organization_id FROM haulage_customer WHERE id = NEW.customer_id;
        IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant fleet customer reference'; END IF;
    END IF;
    IF NEW.origin_id IS NOT NULL THEN
        SELECT organization_id INTO linked_organization_id FROM haulage_deliverylocation WHERE id = NEW.origin_id;
        IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant fleet origin reference'; END IF;
    END IF;
    IF NEW.destination_id IS NOT NULL THEN
        SELECT organization_id INTO linked_organization_id FROM haulage_deliverylocation WHERE id = NEW.destination_id;
        IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant fleet destination reference'; END IF;
    END IF;
    IF NEW.truck_id IS NOT NULL THEN
        SELECT organization_id INTO linked_organization_id FROM haulage_truck WHERE id = NEW.truck_id;
        IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant fleet truck reference'; END IF;
    END IF;
    IF NEW.trailer_id IS NOT NULL THEN
        SELECT organization_id INTO linked_organization_id FROM haulage_trailer WHERE id = NEW.trailer_id;
        IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant fleet trailer reference'; END IF;
    END IF;
    IF NEW.driver_id IS NOT NULL THEN
        SELECT organization_id INTO linked_organization_id FROM haulage_driver WHERE id = NEW.driver_id;
        IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant fleet driver reference'; END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER haul_fleet_tenant_links
BEFORE INSERT OR UPDATE ON haulage_fleet
FOR EACH ROW EXECUTE FUNCTION enforce_haulage_fleet_tenant_links();
"""

REVERSE_SQL = """
DROP TRIGGER IF EXISTS haul_fleet_tenant_links ON haulage_fleet;
DROP FUNCTION IF EXISTS enforce_haulage_fleet_tenant_links();
DROP TRIGGER IF EXISTS haul_fleet_audit_immutable ON haulage_fleetauditevent;
DROP POLICY IF EXISTS haulage_fleetauditevent_tenant_isolation ON haulage_fleetauditevent;
ALTER TABLE haulage_fleetauditevent DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS haulage_fleet_tenant_isolation ON haulage_fleet;
ALTER TABLE haulage_fleet DISABLE ROW LEVEL SECURITY;
"""


class Migration(migrations.Migration):
    dependencies = [("haulage", "0005_fleetauditevent")]
    operations = [migrations.RunSQL(FORWARD_SQL, REVERSE_SQL)]
