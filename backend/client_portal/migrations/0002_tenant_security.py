from django.db import migrations


TABLES = (
    "client_portal_clientportalprofile",
    "client_portal_shareddeliverablepackage",
    "client_portal_clientportalaccesslog",
)

FORWARD_SQL = "\n".join(
    f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY; "
    f"CREATE POLICY {table}_tenant_isolation ON {table} "
    f"USING (app_user_has_organization_membership(organization_id)) "
    f"WITH CHECK (app_user_has_organization_membership(organization_id));"
    for table in TABLES
) + """
CREATE OR REPLACE FUNCTION reject_client_portal_access_log_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Client portal access logs are immutable';
END;
$$;
CREATE TRIGGER client_portal_access_log_immutable BEFORE UPDATE OR DELETE ON client_portal_clientportalaccesslog FOR EACH ROW EXECUTE FUNCTION reject_client_portal_access_log_mutation();
"""

REVERSE_SQL = "\n".join(
    f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}; "
    f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;"
    for table in TABLES
) + """
DROP TRIGGER IF EXISTS client_portal_access_log_immutable ON client_portal_clientportalaccesslog;
DROP FUNCTION IF EXISTS reject_client_portal_access_log_mutation();
"""


class Migration(migrations.Migration):

    dependencies = [
        ("client_portal", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL),
    ]
