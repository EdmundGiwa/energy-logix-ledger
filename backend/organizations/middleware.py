from django.db import transaction

from .db_context import set_tenant_actor


class TenantDatabaseContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        with transaction.atomic():
            if request.user.is_authenticated:
                set_tenant_actor(user_id=request.user.pk)
            return self.get_response(request)
