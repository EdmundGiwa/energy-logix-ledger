from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from marine_stores.models import (
    InventoryMovement,
    MarineCatalogueItem,
    RefrigerantCylinder,
    StoreInventoryItem,
    StoreOrder,
    StoreOrderItem,
)


ALLOWED_ORDER_TRANSITIONS = {
    StoreOrder.Status.DRAFT: {
        "approve": StoreOrder.Status.APPROVED,
        "cancel": StoreOrder.Status.CANCELLED,
    },
    StoreOrder.Status.APPROVED: {
        "dispatch": StoreOrder.Status.DISPATCHED,
        "cancel": StoreOrder.Status.CANCELLED,
    },
    StoreOrder.Status.DISPATCHED: {
        "deliver": StoreOrder.Status.DELIVERED,
        "cancel": StoreOrder.Status.CANCELLED,
    },
}


class ConflictError(Exception):
    pass


class MarineStoresService:
    @staticmethod
    @transaction.atomic
    def record_stock_receipt(*, organization, user, item, location, quantity, unit_cost_minor=0, currency="NGN", lot_number="", serial_number="", expires_on=None, reason="Goods receipt"):
        if item.organization_id != organization.id:
            raise ValidationError("Item does not belong to organization.")

        qty_delta = Decimal(str(quantity))
        if qty_delta <= 0:
            raise ValidationError("Quantity received must be positive.")

        stock, _ = StoreInventoryItem.objects.get_or_create(
            organization=organization,
            item=item,
            location=location,
            batch_or_lot_number=lot_number,
            defaults={
                "quantity_on_hand": Decimal("0.00"),
                "unit_cost_minor": unit_cost_minor,
                "currency": currency,
                "expires_on": expires_on,
            },
        )

        stock.quantity_on_hand += qty_delta
        if unit_cost_minor > 0:
            stock.unit_cost_minor = unit_cost_minor
            stock.currency = currency
        if expires_on:
            stock.expires_on = expires_on
        stock.save()

        # Audit movement
        InventoryMovement.objects.create(
            organization=organization,
            catalogue_item=item,
            movement_type=InventoryMovement.MovementType.RECEIPT,
            quantity_delta=qty_delta,
            resulting_quantity=stock.quantity_on_hand,
            location=location,
            actor=user,
            reason=reason or f"Receipt of {qty_delta} {item.unit_of_measure} at {location}",
        )
        return stock

    @staticmethod
    @transaction.atomic
    def create_order(*, organization, user, data, line_items_data):
        count = StoreOrder.objects.filter(organization=organization).count() + 1
        order_number = data.get("order_number") or f"MSO-{timezone.now().strftime('%Y%m')}-{count:04d}"

        total_minor = 0
        currency = data.get("currency", "NGN")

        order = StoreOrder.objects.create(
            organization=organization,
            order_number=order_number,
            vessel_or_installation=data["vessel_or_installation"],
            destination=data["destination"],
            requested_delivery_date=data["requested_delivery_date"],
            notes=data.get("notes", ""),
            currency=currency,
            created_by=user,
            updated_by=user,
        )

        for line in line_items_data:
            item_id = line["catalogue_item_id"]
            item = MarineCatalogueItem.objects.get(public_id=item_id, organization=organization)
            qty = Decimal(str(line["quantity_requested"]))
            price = int(line.get("unit_price_minor", 0))

            StoreOrderItem.objects.create(
                organization=organization,
                order=order,
                catalogue_item=item,
                quantity_requested=qty,
                unit_price_minor=price,
                currency=currency,
                notes=line.get("notes", ""),
            )
            total_minor += int(qty * price)

        order.total_minor = total_minor
        order.save(update_fields=["total_minor"])
        return order

    @staticmethod
    @transaction.atomic
    def transition_order(*, organization, user, order, action, version, reason="", delivery_data=None):
        if order.organization_id != organization.id:
            raise ValidationError("Order does not belong to organization.")

        if order.version != version:
            raise ConflictError(f"Stale order version. Expected {order.version}, got {version}.")

        allowed = ALLOWED_ORDER_TRANSITIONS.get(order.status, {})
        next_status = allowed.get(action)
        if not next_status:
            raise ValidationError(f"Cannot perform action '{action}' on order in '{order.status}' state.")

        from_status = order.status
        order.status = next_status
        order.version += 1
        order.updated_by = user

        if next_status == StoreOrder.Status.DISPATCHED:
            # Deduct inventory for all lines from designated location or warehouse
            for line in order.line_items.all():
                stocks = StoreInventoryItem.objects.filter(organization=organization, item=line.catalogue_item)
                stock = stocks.first()
                if stock and stock.quantity_on_hand >= line.quantity_requested:
                    stock.quantity_on_hand -= line.quantity_requested
                    stock.save(update_fields=["quantity_on_hand"])
                    resulting = stock.quantity_on_hand
                    loc = stock.location
                else:
                    resulting = Decimal("0.00")
                    loc = "Warehouse"

                line.quantity_delivered = line.quantity_requested
                line.save(update_fields=["quantity_delivered"])

                InventoryMovement.objects.create(
                    organization=organization,
                    catalogue_item=line.catalogue_item,
                    movement_type=InventoryMovement.MovementType.ISSUANCE,
                    quantity_delta=-line.quantity_requested,
                    resulting_quantity=resulting,
                    location=loc,
                    reference_order=order,
                    actor=user,
                    reason=f"Dispatched order {order.order_number} to {order.vessel_or_installation}",
                )

        elif next_status == StoreOrder.Status.DELIVERED:
            order.delivered_at = timezone.now()
            if delivery_data:
                order.receiving_officer_name = delivery_data.get("receiving_officer_name", "")
                order.receiving_signature_ref = delivery_data.get("receiving_signature_ref", "")

        order.save()
        return order
