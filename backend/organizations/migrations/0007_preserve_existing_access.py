"""Keep existing organizations working when module enforcement switches on.

Before this release every member could reach every module. Organizations that already
exist get every optional module enabled (recorded in the module history) so nobody loses
access on deploy; staff can then trim each customer to what they bought. Organizations
created after this migration start with the core set only.
"""

from django.db import migrations

# Frozen copy of the optional module keys at the time of this release.
OPTIONAL_MODULES = (
    "bunkerflow", "haultrac", "refinerylink", "tankworks", "pipeintegrity", "epclink", "safepass",
    "marinestores", "client_portal", "offshorelink", "rigsupply", "crewtransit", "vesselops",
    "equiptrack", "marineguard", "enviroledger",
)
REASON = "Preserved pre-entitlement access at release"


def forwards(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    OrganizationModule = apps.get_model("organizations", "OrganizationModule")
    Event = apps.get_model("organizations", "ModuleEntitlementEvent")
    for organization in Organization.objects.all():
        for module in OPTIONAL_MODULES:
            _, created = OrganizationModule.objects.get_or_create(organization=organization, module=module)
            if created:
                Event.objects.create(organization=organization, module=module, action="enabled", reason=REASON)


def backwards(apps, schema_editor):
    Event = apps.get_model("organizations", "ModuleEntitlementEvent")
    OrganizationModule = apps.get_model("organizations", "OrganizationModule")
    preserved = Event.objects.filter(reason=REASON)
    for event in preserved:
        OrganizationModule.objects.filter(organization_id=event.organization_id, module=event.module).delete()
    preserved.delete()


class Migration(migrations.Migration):
    dependencies = [("organizations", "0006_module_entitlements_security")]

    operations = [migrations.RunPython(forwards, backwards)]
