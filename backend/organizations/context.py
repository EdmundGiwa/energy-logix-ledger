from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Membership
from .modules import CORE_MODULES, MODULE_APPS, MODULES


class ModuleNotEnabled(PermissionDenied):
    default_code = "module_not_enabled"


def module_for_request(request):
    """The module key served by the view handling this request, or None for platform views."""
    match = getattr(request, "resolver_match", None)
    if match is None:
        return None
    view = getattr(match.func, "view_class", None) or getattr(match.func, "cls", None) or match.func
    return MODULE_APPS.get(view.__module__.split(".")[0])


def ensure_module_enabled(request, organization):
    """Refuse module APIs the organization has not been given. Fails closed for module apps."""
    module = module_for_request(request)
    if module is None or module in CORE_MODULES:
        return
    if not organization.module_entitlements.filter(module=module).exists():
        raise ModuleNotEnabled(
            f"{MODULES[module]} is not part of your Offshora plan. An owner or administrator can request it from the dashboard."
        )


def resolve_membership(request):
    memberships = Membership.objects.select_related("organization", "user").filter(
        user=request.user,
        is_active=True,
        organization__status="active",
    )
    organization_id = request.headers.get("X-Organization-ID")
    if organization_id:
        try:
            membership = memberships.get(organization__public_id=organization_id)
        except (Membership.DoesNotExist, ValueError):
            raise PermissionDenied("You do not have access to that organization.")
    else:
        count = memberships.count()
        if count == 0:
            raise NotFound("No active organization membership was found.")
        if count > 1:
            raise ValidationError({"organization": ["Select an organization using X-Organization-ID."]})
        membership = memberships.get()
    ensure_module_enabled(request, membership.organization)
    return membership
