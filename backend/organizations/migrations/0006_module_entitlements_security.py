from django.db import migrations

# Entitlement tables are tenant-scoped: customers see only their own rows. Offshora platform
# administrators (active superusers, who change modules through audited admin views) may
# also read and write them, because they are not members of customer organizations.
TABLES = (
    "organizations_organizationmodule",
    "organizations_moduleentitlementevent",
    "organizations_moduleaccessrequest",
)

FORWARD_SQL = """
CREATE OR REPLACE FUNCTION app_actor_is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.identity_user AS actor
        WHERE actor.id = NULLIF(current_setting('app.current_user_id', true), '')::bigint
          AND actor.is_superuser
          AND actor.is_active
    );
$$;
-- Left executable by the runtime role (as app_user_has_organization_membership is):
-- RLS policies call it, and it only reports whether the current actor is a platform admin.
""" + "\n".join(
    f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY; "
    f"CREATE POLICY {table}_tenant_isolation ON {table} "
    f"USING (app_user_has_organization_membership(organization_id) OR app_actor_is_platform_admin()) "
    f"WITH CHECK (app_user_has_organization_membership(organization_id) OR app_actor_is_platform_admin());"
    for table in TABLES
)

REVERSE_SQL = "\n".join(
    f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}; ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;"
    for table in TABLES
) + "\nDROP FUNCTION IF EXISTS app_actor_is_platform_admin();"


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0005_module_entitlements"),
        ("identity", "0004_account_invites"),
    ]

    operations = [migrations.RunSQL(FORWARD_SQL, REVERSE_SQL)]
