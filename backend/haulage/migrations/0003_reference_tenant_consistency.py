from django.db import migrations


FORWARD_SQL = """
CREATE OR REPLACE FUNCTION enforce_haul_dispatch_references()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_organization_id bigint;
BEGIN
    SELECT organization_id INTO linked_organization_id FROM haulage_customer WHERE id = NEW.customer_id;
    IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant customer reference'; END IF;
    SELECT organization_id INTO linked_organization_id FROM haulage_deliverylocation WHERE id = NEW.origin_id;
    IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant origin reference'; END IF;
    SELECT organization_id INTO linked_organization_id FROM haulage_deliverylocation WHERE id = NEW.destination_id;
    IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant destination reference'; END IF;
    SELECT organization_id INTO linked_organization_id FROM haulage_truck WHERE id = NEW.truck_id;
    IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant truck reference'; END IF;
    SELECT organization_id INTO linked_organization_id FROM haulage_trailer WHERE id = NEW.trailer_id;
    IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant trailer reference'; END IF;
    SELECT organization_id INTO linked_organization_id FROM haulage_driver WHERE id = NEW.driver_id;
    IF linked_organization_id IS NULL OR linked_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant driver reference'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER haul_dispatch_tenant_references BEFORE INSERT OR UPDATE ON haulage_dispatch FOR EACH ROW EXECUTE FUNCTION enforce_haul_dispatch_references();

CREATE OR REPLACE FUNCTION enforce_haul_child_reference()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_organization_id bigint;
BEGIN
    SELECT organization_id INTO parent_organization_id FROM haulage_dispatch WHERE id = NEW.dispatch_id;
    IF parent_organization_id IS NULL OR parent_organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant HaulTrac child reference'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER haul_reading_tenant_reference BEFORE INSERT OR UPDATE ON haulage_weighbridgereading FOR EACH ROW EXECUTE FUNCTION enforce_haul_child_reference();
CREATE TRIGGER haul_waybill_tenant_reference BEFORE INSERT OR UPDATE ON haulage_electronicwaybill FOR EACH ROW EXECUTE FUNCTION enforce_haul_child_reference();
CREATE TRIGGER haul_pod_tenant_reference BEFORE INSERT OR UPDATE ON haulage_proofofdelivery FOR EACH ROW EXECUTE FUNCTION enforce_haul_child_reference();
CREATE TRIGGER haul_audit_tenant_reference BEFORE INSERT OR UPDATE ON haulage_haulageauditevent FOR EACH ROW EXECUTE FUNCTION enforce_haul_child_reference();
"""

REVERSE_SQL = """
DROP TRIGGER IF EXISTS haul_audit_tenant_reference ON haulage_haulageauditevent;
DROP TRIGGER IF EXISTS haul_pod_tenant_reference ON haulage_proofofdelivery;
DROP TRIGGER IF EXISTS haul_waybill_tenant_reference ON haulage_electronicwaybill;
DROP TRIGGER IF EXISTS haul_reading_tenant_reference ON haulage_weighbridgereading;
DROP FUNCTION IF EXISTS enforce_haul_child_reference();
DROP TRIGGER IF EXISTS haul_dispatch_tenant_references ON haulage_dispatch;
DROP FUNCTION IF EXISTS enforce_haul_dispatch_references();
"""


class Migration(migrations.Migration):
    dependencies = [("haulage", "0002_tenant_security")]
    operations = [migrations.RunSQL(FORWARD_SQL, REVERSE_SQL)]
