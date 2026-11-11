"""Test helpers for organizations. Not used by production code."""

from .models import OrganizationModule


def enable_modules(*organizations, modules):
    """Switch optional modules on for test organizations (core modules need nothing)."""
    for organization in organizations:
        for module in modules:
            OrganizationModule.objects.get_or_create(organization=organization, module=module)
