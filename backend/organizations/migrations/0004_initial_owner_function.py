from django.db import migrations


FORWARD_SQL = """
CREATE OR REPLACE FUNCTION app_create_initial_owner_membership(
    target_organization_id bigint,
    target_user_id bigint,
    target_job_title varchar
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    created_membership_id bigint;
BEGIN
    IF target_user_id <> NULLIF(current_setting('app.current_user_id', true), '')::bigint THEN
        RAISE EXCEPTION 'Tenant actor does not match membership user';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.organizations_membership
        WHERE organization_id = target_organization_id
    ) THEN
        RAISE EXCEPTION 'Organization already has a membership';
    END IF;

    INSERT INTO public.organizations_membership (
        public_id,
        organization_id,
        user_id,
        role,
        job_title,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        target_organization_id,
        target_user_id,
        'owner',
        target_job_title,
        true,
        statement_timestamp(),
        statement_timestamp()
    )
    RETURNING id INTO created_membership_id;

    RETURN created_membership_id;
END;
$$;

REVOKE ALL ON FUNCTION app_create_initial_owner_membership(bigint, bigint, varchar) FROM PUBLIC;

DROP POLICY membership_tenant_isolation ON organizations_membership;
CREATE POLICY membership_tenant_isolation ON organizations_membership
USING (app_user_has_organization_membership(organization_id))
WITH CHECK (app_user_has_organization_membership(organization_id));
"""


REVERSE_SQL = """
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
DROP FUNCTION IF EXISTS app_create_initial_owner_membership(bigint, bigint, varchar);
"""


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0003_membership_rls_bootstrap"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, REVERSE_SQL),
    ]
