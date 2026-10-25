from django.db import migrations


TABLES = (
    "owner_dashboard_executivekpisnapshot",
    "owner_dashboard_executiveexceptionalert",
    "owner_dashboard_executiveexportjob",
)

FORWARD_SQL = "\n".join(
    f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY; "
    f"CREATE POLICY {table}_tenant_isolation ON {table} "
    f"USING (app_user_has_organization_membership(organization_id)) "
    f"WITH CHECK (app_user_has_organization_membership(organization_id));"
    for table in TABLES
)

REVERSE_SQL = "\n".join(
    f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}; "
    f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;"
    for table in TABLES
)


class Migration(migrations.Migration):

    dependencies = [
        ("owner_dashboard", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL),
    ]
