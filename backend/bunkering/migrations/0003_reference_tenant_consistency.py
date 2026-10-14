from django.db import migrations


FORWARD_SQL = """
CREATE OR REPLACE FUNCTION enforce_bunker_reference_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    parent_organization_id bigint;
BEGIN
    SELECT organization_id INTO parent_organization_id
    FROM bunkering_nomination
    WHERE id = NEW.nomination_id;

    IF parent_organization_id IS NULL OR parent_organization_id <> NEW.organization_id THEN
        RAISE EXCEPTION 'Cross-tenant bunker reference is not permitted';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER bunker_sounding_tenant_reference
BEFORE INSERT OR UPDATE ON bunkering_sounding
FOR EACH ROW EXECUTE FUNCTION enforce_bunker_reference_tenant();

CREATE TRIGGER bunker_bdn_tenant_reference
BEFORE INSERT OR UPDATE ON bunkering_bunkerdeliverynote
FOR EACH ROW EXECUTE FUNCTION enforce_bunker_reference_tenant();

CREATE TRIGGER bunker_audit_tenant_reference
BEFORE INSERT OR UPDATE ON bunkering_bunkerauditevent
FOR EACH ROW EXECUTE FUNCTION enforce_bunker_reference_tenant();
"""

REVERSE_SQL = """
DROP TRIGGER IF EXISTS bunker_audit_tenant_reference ON bunkering_bunkerauditevent;
DROP TRIGGER IF EXISTS bunker_bdn_tenant_reference ON bunkering_bunkerdeliverynote;
DROP TRIGGER IF EXISTS bunker_sounding_tenant_reference ON bunkering_sounding;
DROP FUNCTION IF EXISTS enforce_bunker_reference_tenant();
"""


class Migration(migrations.Migration):
    dependencies = [("bunkering", "0002_tenant_rls_and_immutability")]
    operations = [migrations.RunSQL(FORWARD_SQL, REVERSE_SQL)]
