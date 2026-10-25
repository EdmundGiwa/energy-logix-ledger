from django.db import migrations


TABLES = (
    "marine_stores_marinecatalogueitem",
    "marine_stores_refrigerantcylinder",
    "marine_stores_storeinventoryitem",
    "marine_stores_storeorder",
    "marine_stores_storeorderitem",
    "marine_stores_inventorymovement",
)

FORWARD_SQL = "\n".join(
    f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY; "
    f"CREATE POLICY {table}_tenant_isolation ON {table} "
    f"USING (app_user_has_organization_membership(organization_id)) "
    f"WITH CHECK (app_user_has_organization_membership(organization_id));"
    for table in TABLES
) + """
CREATE OR REPLACE FUNCTION reject_marine_inventory_movement_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Inventory movement audit records are immutable';
END;
$$;
CREATE TRIGGER marine_movement_immutable BEFORE UPDATE OR DELETE ON marine_stores_inventorymovement FOR EACH ROW EXECUTE FUNCTION reject_marine_inventory_movement_mutation();

CREATE OR REPLACE FUNCTION enforce_marine_stores_tenant_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_org bigint;
BEGIN
    IF TG_TABLE_NAME = 'marine_stores_storeinventoryitem' THEN
        SELECT organization_id INTO linked_org FROM marine_stores_marinecatalogueitem WHERE id = NEW.item_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant catalogue item reference in inventory item';
        END IF;
    ELSIF TG_TABLE_NAME = 'marine_stores_storeorderitem' THEN
        SELECT organization_id INTO linked_org FROM marine_stores_storeorder WHERE id = NEW.order_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant store order reference in order item';
        END IF;
        SELECT organization_id INTO linked_org FROM marine_stores_marinecatalogueitem WHERE id = NEW.catalogue_item_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant catalogue item reference in order item';
        END IF;
    ELSIF TG_TABLE_NAME = 'marine_stores_inventorymovement' THEN
        SELECT organization_id INTO linked_org FROM marine_stores_marinecatalogueitem WHERE id = NEW.catalogue_item_id;
        IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
            RAISE EXCEPTION 'Cross-tenant catalogue item reference in inventory movement';
        END IF;
        IF NEW.reference_order_id IS NOT NULL THEN
            SELECT organization_id INTO linked_org FROM marine_stores_storeorder WHERE id = NEW.reference_order_id;
            IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
                RAISE EXCEPTION 'Cross-tenant store order reference in inventory movement';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER marine_inventory_tenant_links BEFORE INSERT OR UPDATE ON marine_stores_storeinventoryitem FOR EACH ROW EXECUTE FUNCTION enforce_marine_stores_tenant_links();
CREATE TRIGGER marine_order_item_tenant_links BEFORE INSERT OR UPDATE ON marine_stores_storeorderitem FOR EACH ROW EXECUTE FUNCTION enforce_marine_stores_tenant_links();
CREATE TRIGGER marine_movement_tenant_links BEFORE INSERT OR UPDATE ON marine_stores_inventorymovement FOR EACH ROW EXECUTE FUNCTION enforce_marine_stores_tenant_links();
"""

REVERSE_SQL = "\n".join(
    f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}; "
    f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;"
    for table in TABLES
) + """
DROP TRIGGER IF EXISTS marine_movement_immutable ON marine_stores_inventorymovement;
DROP FUNCTION IF EXISTS reject_marine_inventory_movement_mutation();
DROP TRIGGER IF EXISTS marine_inventory_tenant_links ON marine_stores_storeinventoryitem;
DROP TRIGGER IF EXISTS marine_order_item_tenant_links ON marine_stores_storeorderitem;
DROP TRIGGER IF EXISTS marine_movement_tenant_links ON marine_stores_inventorymovement;
DROP FUNCTION IF EXISTS enforce_marine_stores_tenant_links();
"""


class Migration(migrations.Migration):

    dependencies = [
        ("marine_stores", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL),
    ]
