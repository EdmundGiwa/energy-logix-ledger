from django.db import migrations


FORWARD_SQL = """
CREATE OR REPLACE FUNCTION app_user_has_organization_membership(target_organization_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organizations_membership AS membership
        WHERE membership.organization_id = target_organization_id
          AND membership.user_id = NULLIF(current_setting('app.current_user_id', true), '')::bigint
          AND membership.is_active
    );
$$;

ALTER TABLE organizations_membership ENABLE ROW LEVEL SECURITY;

CREATE POLICY membership_tenant_isolation ON organizations_membership
USING (app_user_has_organization_membership(organization_id))
WITH CHECK (
    app_user_has_organization_membership(organization_id)
    OR (
        organization_id = NULLIF(current_setting('app.bootstrap_organization_id', true), '')::bigint
        AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::bigint
    )
);
"""


REVERSE_SQL = """
DROP POLICY IF EXISTS membership_tenant_isolation ON organizations_membership;
ALTER TABLE organizations_membership DISABLE ROW LEVEL SECURITY;
DROP FUNCTION IF EXISTS app_user_has_organization_membership(bigint);
"""


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, REVERSE_SQL),
    ]
