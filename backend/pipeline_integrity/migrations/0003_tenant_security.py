from django.db import migrations


TABLES = (
    "pipeline_integrity_pipelineasset",
    "pipeline_integrity_pigrun",
    "pipeline_integrity_hydrotest",
    "pipeline_integrity_inspectionrecord",
    "pipeline_integrity_cpsurveypoint",
    "pipeline_integrity_rowobservation",
    "pipeline_integrity_pipelineauditevent",
)

FORWARD_SQL = "\n".join(
    f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY; "
    f"CREATE POLICY {table}_tenant_isolation ON {table} "
    f"USING (app_user_has_organization_membership(organization_id)) "
    f"WITH CHECK (app_user_has_organization_membership(organization_id));"
    for table in TABLES
) + """
CREATE OR REPLACE FUNCTION reject_pipeline_immutable_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Pipeline audit records are immutable';
END;
$$;
CREATE TRIGGER pipeline_audit_immutable BEFORE UPDATE OR DELETE ON pipeline_integrity_pipelineauditevent FOR EACH ROW EXECUTE FUNCTION reject_pipeline_immutable_mutation();

CREATE OR REPLACE FUNCTION enforce_pipeline_tenant_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_org bigint;
BEGIN
    IF NEW.asset_id IS NOT NULL THEN
        SELECT organization_id INTO linked_org FROM pipeline_integrity_pipelineasset WHERE id = NEW.asset_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant pipeline asset reference';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER pipeline_pig_tenant_links BEFORE INSERT OR UPDATE ON pipeline_integrity_pigrun FOR EACH ROW EXECUTE FUNCTION enforce_pipeline_tenant_links();
CREATE TRIGGER pipeline_hydrotest_tenant_links BEFORE INSERT OR UPDATE ON pipeline_integrity_hydrotest FOR EACH ROW EXECUTE FUNCTION enforce_pipeline_tenant_links();
CREATE TRIGGER pipeline_inspection_tenant_links BEFORE INSERT OR UPDATE ON pipeline_integrity_inspectionrecord FOR EACH ROW EXECUTE FUNCTION enforce_pipeline_tenant_links();
CREATE TRIGGER pipeline_cp_tenant_links BEFORE INSERT OR UPDATE ON pipeline_integrity_cpsurveypoint FOR EACH ROW EXECUTE FUNCTION enforce_pipeline_tenant_links();
CREATE TRIGGER pipeline_row_tenant_links BEFORE INSERT OR UPDATE ON pipeline_integrity_rowobservation FOR EACH ROW EXECUTE FUNCTION enforce_pipeline_tenant_links();
"""

REVERSE_SQL = """
DROP TRIGGER IF EXISTS pipeline_row_tenant_links ON pipeline_integrity_rowobservation;
DROP TRIGGER IF EXISTS pipeline_cp_tenant_links ON pipeline_integrity_cpsurveypoint;
DROP TRIGGER IF EXISTS pipeline_inspection_tenant_links ON pipeline_integrity_inspectionrecord;
DROP TRIGGER IF EXISTS pipeline_hydrotest_tenant_links ON pipeline_integrity_hydrotest;
DROP TRIGGER IF EXISTS pipeline_pig_tenant_links ON pipeline_integrity_pigrun;
DROP FUNCTION IF EXISTS enforce_pipeline_tenant_links();
DROP TRIGGER IF EXISTS pipeline_audit_immutable ON pipeline_integrity_pipelineauditevent;
DROP FUNCTION IF EXISTS reject_pipeline_immutable_mutation();
""" + "\n".join(
    f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}; ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;"
    for table in reversed(TABLES)
)


class Migration(migrations.Migration):
    dependencies = [("pipeline_integrity", "0002_cpsurveypoint_inspectionrecord_rowobservation")]
    operations = [migrations.RunSQL(FORWARD_SQL, REVERSE_SQL)]
