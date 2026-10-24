from django.db import migrations


TABLES = ("hse_worker", "hse_credential", "hse_safetyprocedure", "hse_mobilization", "hse_permit", "hse_gastest", "hse_safetyacknowledgement", "hse_hseauditevent")
FORWARD_SQL = "\n".join(
    f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY; CREATE POLICY {table}_tenant_isolation ON {table} USING (app_user_has_organization_membership(organization_id)) WITH CHECK (app_user_has_organization_membership(organization_id));"
    for table in TABLES
) + """
CREATE OR REPLACE FUNCTION reject_hse_immutable_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SafePass safety records are immutable'; END; $$;
CREATE TRIGGER hse_gastest_immutable BEFORE UPDATE OR DELETE ON hse_gastest FOR EACH ROW EXECUTE FUNCTION reject_hse_immutable_mutation();
CREATE TRIGGER hse_audit_immutable BEFORE UPDATE OR DELETE ON hse_hseauditevent FOR EACH ROW EXECUTE FUNCTION reject_hse_immutable_mutation();

CREATE OR REPLACE FUNCTION enforce_hse_tenant_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_org bigint;
BEGIN
 IF TG_TABLE_NAME = 'hse_credential' THEN SELECT organization_id INTO linked_org FROM hse_worker WHERE id=NEW.worker_id;
 ELSIF TG_TABLE_NAME = 'hse_mobilization' THEN SELECT organization_id INTO linked_org FROM hse_safetyprocedure WHERE id=NEW.procedure_id;
 ELSIF TG_TABLE_NAME = 'hse_permit' THEN
  SELECT organization_id INTO linked_org FROM hse_safetyprocedure WHERE id=NEW.procedure_id;
  IF linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant SafePass procedure reference'; END IF;
  SELECT organization_id INTO linked_org FROM hse_worker WHERE id=NEW.performing_authority_id;
 ELSIF TG_TABLE_NAME = 'hse_gastest' THEN SELECT organization_id INTO linked_org FROM hse_permit WHERE id=NEW.permit_id;
 ELSIF TG_TABLE_NAME = 'hse_safetyacknowledgement' THEN
  SELECT organization_id INTO linked_org FROM hse_permit WHERE id=NEW.permit_id;
  IF linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant SafePass permit reference'; END IF;
  SELECT organization_id INTO linked_org FROM hse_worker WHERE id=NEW.worker_id;
 END IF;
 IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'Cross-tenant SafePass reference'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER hse_credential_tenant_links BEFORE INSERT OR UPDATE ON hse_credential FOR EACH ROW EXECUTE FUNCTION enforce_hse_tenant_links();
CREATE TRIGGER hse_mobilization_tenant_links BEFORE INSERT OR UPDATE ON hse_mobilization FOR EACH ROW EXECUTE FUNCTION enforce_hse_tenant_links();
CREATE TRIGGER hse_permit_tenant_links BEFORE INSERT OR UPDATE ON hse_permit FOR EACH ROW EXECUTE FUNCTION enforce_hse_tenant_links();
CREATE TRIGGER hse_gastest_tenant_links BEFORE INSERT OR UPDATE ON hse_gastest FOR EACH ROW EXECUTE FUNCTION enforce_hse_tenant_links();
CREATE TRIGGER hse_ack_tenant_links BEFORE INSERT OR UPDATE ON hse_safetyacknowledgement FOR EACH ROW EXECUTE FUNCTION enforce_hse_tenant_links();

CREATE OR REPLACE FUNCTION enforce_hse_crew_tenant_link() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mobilization_org bigint; worker_org bigint;
BEGIN
 SELECT organization_id INTO mobilization_org FROM hse_mobilization WHERE id=NEW.mobilization_id;
 SELECT organization_id INTO worker_org FROM hse_worker WHERE id=NEW.worker_id;
 IF mobilization_org IS NULL OR worker_org IS NULL OR mobilization_org <> worker_org THEN RAISE EXCEPTION 'Cross-tenant SafePass crew reference'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER hse_crew_tenant_links BEFORE INSERT OR UPDATE ON hse_mobilizationworker FOR EACH ROW EXECUTE FUNCTION enforce_hse_crew_tenant_link();
"""

REVERSE_SQL = """
DROP TRIGGER IF EXISTS hse_crew_tenant_links ON hse_mobilizationworker; DROP FUNCTION IF EXISTS enforce_hse_crew_tenant_link();
DROP TRIGGER IF EXISTS hse_ack_tenant_links ON hse_safetyacknowledgement; DROP TRIGGER IF EXISTS hse_gastest_tenant_links ON hse_gastest; DROP TRIGGER IF EXISTS hse_permit_tenant_links ON hse_permit; DROP TRIGGER IF EXISTS hse_mobilization_tenant_links ON hse_mobilization; DROP TRIGGER IF EXISTS hse_credential_tenant_links ON hse_credential; DROP FUNCTION IF EXISTS enforce_hse_tenant_links();
DROP TRIGGER IF EXISTS hse_audit_immutable ON hse_hseauditevent; DROP TRIGGER IF EXISTS hse_gastest_immutable ON hse_gastest; DROP FUNCTION IF EXISTS reject_hse_immutable_mutation();
""" + "\n".join(f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}; ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;" for table in reversed(TABLES))


class Migration(migrations.Migration):
    dependencies = [("hse", "0001_initial")]
    operations = [migrations.RunSQL(FORWARD_SQL, REVERSE_SQL)]
