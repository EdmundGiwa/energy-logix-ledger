"""Offshora module registry: the single source of truth for module keys.

Customers get the CORE_MODULES plus whatever modules are switched on for their
organization (``OrganizationModule`` rows). Access is enforced server-side in
``organizations.context.resolve_membership``; hiding a module in the UI is not access control.
"""

MODULES = {
    "bunkerflow": "BunkerFlow",
    "haultrac": "HaulTrac",
    "refinerylink": "RefineryLink",
    "tankworks": "TankWorks",
    "pipeintegrity": "PipeIntegrity",
    "epclink": "EPC-Link",
    "safepass": "SafePass",
    "marinestores": "MarineStores",
    "compliance_shield": "Compliance Shield",
    "billing": "Billing & Commercial",
    "client_portal": "Client Portal",
    "owner_dashboard": "Owner Dashboard",
    "offshorelink": "OffshoreLink",
    "rigsupply": "RigSupply",
    "crewtransit": "CrewTransit",
    "vesselops": "VesselOps",
    "equiptrack": "EquipTrack",
    "marineguard": "MarineGuard",
    "enviroledger": "EnviroLedger",
}

# Included for every customer, whatever else they buy.
CORE_MODULES = frozenset({"compliance_shield", "billing", "owner_dashboard"})

MODULE_CHOICES = [(key, label) for key, label in MODULES.items()]
OPTIONAL_MODULE_CHOICES = [(key, label) for key, label in MODULES.items() if key not in CORE_MODULES]

# Every Django app that serves tenant APIs must appear in exactly one of these two maps.
# ``organizations.tests.test_entitlements`` fails if a URL belongs to an unclassified app,
# so a new module app cannot ship without an access rule.
MODULE_APPS = {
    "bunkering": "bunkerflow",
    "haulage": "haultrac",
    "hse": "safepass",
    "pipeline_integrity": "pipeintegrity",
    "refinery_link": "refinerylink",
    "marine_stores": "marinestores",
    "tank_works": "tankworks",
    "epc_link": "epclink",
    "compliance_shield": "compliance_shield",
    "billing": "billing",
    "client_portal": "client_portal",
    "owner_dashboard": "owner_dashboard",
}
PLATFORM_APPS = frozenset({"core", "identity", "organizations", "demo_requests"})
