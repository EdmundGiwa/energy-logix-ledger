from django.db import connection


def set_tenant_actor(*, user_id, bootstrap_organization_id=None):
    with connection.cursor() as cursor:
        cursor.execute("SELECT set_config('app.current_user_id', %s, true)", (str(user_id),))
        if bootstrap_organization_id is not None:
            cursor.execute(
                "SELECT set_config('app.bootstrap_organization_id', %s, true)",
                (str(bootstrap_organization_id),),
            )
