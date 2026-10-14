from django.db import migrations


TABLES = (
    "bunkering_nomination",
    "bunkering_sounding",
    "bunkering_bunkerdeliverynote",
    "bunkering_bunkerauditevent",
)

FORWARD_SQL = "\n".join(
    f"""
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY {table}_tenant_isolation ON {table}
USING (app_user_has_organization_membership(organization_id))
WITH CHECK (app_user_has_organization_membership(organization_id));
"""
    for table in TABLES
) + """

CREATE OR REPLACE FUNCTION reject_bunker_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Bunker audit events are immutable';
END;
$$;

CREATE TRIGGER bunker_audit_immutable
BEFORE UPDATE OR DELETE ON bunkering_bunkerauditevent
FOR EACH ROW EXECUTE FUNCTION reject_bunker_audit_mutation();

CREATE OR REPLACE FUNCTION protect_final_bunker_record()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status IN ('issued', 'reviewed') THEN
        RAISE EXCEPTION 'Final bunker records are immutable';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER bunker_issued_bdn_immutable
BEFORE UPDATE OR DELETE ON bunkering_bunkerdeliverynote
FOR EACH ROW EXECUTE FUNCTION protect_final_bunker_record();

CREATE TRIGGER bunker_reviewed_sounding_immutable
BEFORE UPDATE OR DELETE ON bunkering_sounding
FOR EACH ROW EXECUTE FUNCTION protect_final_bunker_record();
"""

REVERSE_SQL = """
DROP TRIGGER IF EXISTS bunker_reviewed_sounding_immutable ON bunkering_sounding;
DROP TRIGGER IF EXISTS bunker_issued_bdn_immutable ON bunkering_bunkerdeliverynote;
DROP TRIGGER IF EXISTS bunker_audit_immutable ON bunkering_bunkerauditevent;
DROP FUNCTION IF EXISTS protect_final_bunker_record();
DROP FUNCTION IF EXISTS reject_bunker_audit_mutation();
""" + "\n".join(
    f"""
DROP POLICY IF EXISTS {table}_tenant_isolation ON {table};
ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;
"""
    for table in reversed(TABLES)
)


class Migration(migrations.Migration):
    dependencies = [
        ("bunkering", "0001_initial"),
        ("organizations", "0004_initial_owner_function"),
    ]

    operations = [migrations.RunSQL(FORWARD_SQL, REVERSE_SQL)]
