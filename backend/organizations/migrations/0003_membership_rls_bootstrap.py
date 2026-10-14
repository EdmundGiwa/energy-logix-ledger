from django.db import migrations


FORWARD_SQL = """
CREATE OR REPLACE FUNCTION app_organization_has_memberships(target_organization_id bigint)
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
    );
$$;

DROP POLICY membership_tenant_isolation ON organizations_membership;

CREATE POLICY membership_tenant_isolation ON organizations_membership
USING (app_user_has_organization_membership(organization_id))
WITH CHECK (
    app_user_has_organization_membership(organization_id)
    OR (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::bigint
        AND NOT app_organization_has_memberships(organization_id)
    )
);
"""


REVERSE_SQL = """
DROP POLICY membership_tenant_isolation ON organizations_membership;
DROP FUNCTION IF EXISTS app_organization_has_memberships(bigint);

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


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0002_membership_row_level_security"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, REVERSE_SQL),
    ]
