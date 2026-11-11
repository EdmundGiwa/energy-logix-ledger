"""Allowed values for the public Book-a-Demo form.

This is the single source of truth for qualification choices. The frontend mirrors
these keys in ``frontend/src/lib/demo.ts``; adding a key here without adding it there
(or vice versa) makes the form submit values the API rejects.
"""

# Module keys are owned by the organizations app (entitlements use the same keys).
from organizations.modules import MODULES  # noqa: F401

SEGMENTS = {
    "epc_contractor": "EPC / EPCI contractor",
    "marine_offshore": "Marine & offshore logistics",
    "bunkering_marketing": "Bunkering & petroleum marketing",
    "haulage_depot": "Haulage, depots & tank farms",
    "oilfield_services": "Integrated oilfield services",
    "pipeline_facilities": "Pipeline & facilities maintenance",
    "refining_processing": "Modular refining & processing",
    "other": "Other energy services",
}

OPERATIONS = {
    "bunkering": "Bunkering & marine fuel",
    "truck_haulage": "Truck haulage",
    "depot_tank_farm": "Depot / tank farm",
    "vessel_charter": "Vessel charter & OSVs",
    "supply_base": "Supply base & deck cargo",
    "crew_transfer": "Crew transfer & POB",
    "epc_projects": "EPC projects",
    "fabrication": "Fabrication & installation",
    "pipeline_maintenance": "Pipeline maintenance",
    "inspection_ndt": "Inspection & NDT",
    "tank_cleaning": "Tank cleaning & field services",
    "equipment_rental": "Equipment rental",
    "refining": "Refining & processing",
    "waste_environmental": "Waste & environmental",
    "manpower_supply": "Manpower supply",
}

PAIN_POINTS = {
    "product_loss": "Product loss or diversion",
    "slow_invoicing": "Slow invoicing & IPC approvals",
    "permit_expiry": "Permits & certificates expiring unnoticed",
    "paper_records": "Paper waybills, BDNs & job sheets",
    "local_content": "Local content reporting",
    "crew_certification": "Crew certification & rotation tracking",
    "client_visibility": "Clients asking for status updates",
    "inventory_leakage": "Stores & inventory leakage",
    "hse_incidents": "HSE incidents & permit-to-work",
    "multi_currency": "NGN / USD cash-flow visibility",
    "project_overruns": "Project cost & schedule overruns",
}


# ISO 3166-1 alpha-2 codes for the markets Offshora sells into, plus "other".
COUNTRIES = {
    "NG": "Nigeria",
    "UG": "Uganda",
    "GH": "Ghana",
    "KE": "Kenya",
    "TZ": "Tanzania",
    "AO": "Angola",
    "other": "Other",
}
