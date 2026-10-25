from django.db import migrations


TABLES = (
    "compliance_shield_regulatorycertificate",
    "compliance_shield_isomanagementsystemaudit",
    "compliance_shield_auditnonconformance",
    "compliance_shield_complianceevidencepack",
    "compliance_shield_complianceauditevent",
)

FORWARD_SQL = "\n".join(
    f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY; "
    f"CREATE POLICY {table}_tenant_isolation ON {table} "
    f"USING (app_user_has_organization_membership(organization_id)) "
    f"WITH CHECK (app_user_has_organization_membership(organization_id));"
    for table in TABLES
) + """
CREATE OR REPLACE FUNCTION reject_compliance_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Compliance audit records are immutable';
END;
$$;
CREATE TRIGGER compliance_audit_immutable BEFORE UPDATE OR DELETE ON compliance_shield_complianceauditevent FOR EACH ROW EXECUTE FUNCTION reject_compliance_audit_mutation();

CREATE OR REPLACE FUNCTION enforce_compliance_shield_tenant_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_org bigint;
BEGIN
    IF TG_TABLE_NAME = 'compliance_shield_auditnonconformance' THEN
        SELECT organization_id INTO linked_org FROM compliance_shield_isomanagementsystemaudit WHERE id = NEW.audit_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant ISO audit reference in NCR';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER compliance_ncr_tenant_links BEFORE INSERT OR UPDATE ON compliance_shield_auditnonconformance FOR EACH ROW EXECUTE FUNCTION enforce_compliance_shield_tenant_links();
"""

REVERSE_SQL = "\n".join(
    f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}; "
    f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;"
    for table in TABLES
) + """
DROP TRIGGER IF EXISTS compliance_audit_immutable ON compliance_shield_complianceauditevent;
DROP FUNCTION IF EXISTS reject_compliance_audit_mutation();
DROP TRIGGER IF EXISTS compliance_ncr_tenant_links ON compliance_shield_auditnonconformance;
DROP FUNCTION IF EXISTS enforce_compliance_shield_tenant_links();
"""


class Migration(migrations.Migration):

    dependencies = [
        ("compliance_shield", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL),
    ]
