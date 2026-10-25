import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from organizations.models import Organization


class MarineCatalogueItem(models.Model):
    class Category(models.TextChoices):
        SHIP_SPARES = "ship_spares", "Ship Spares (Deck & Engine)"
        LUBRICANTS = "lubricants", "Marine Lubricants"
        PROVISIONS = "provisions", "Bonded Stores & Provisions"
        MEDICAL = "medical", "Medical Supplies & Pharmaceuticals"
        GASES = "gases", "Refrigerant & Technical Gases"
        SAFETY_PPE = "safety_ppe", "Life-Saving Equipment & PPE"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="marine_catalogue_items")
    item_code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=Category.choices)
    unit_of_measure = models.CharField(max_length=30, default="piece")
    brand = models.CharField(max_length=80, blank=True)
    impa_code = models.CharField(max_length=20, blank=True)
    minimum_stock_level = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "item_code"), name="unique_marine_item_code"),
        ]
        indexes = [
            models.Index(fields=("organization", "category", "is_active"), name="marine_item_cat_idx"),
            models.Index(fields=("organization", "item_code"), name="marine_item_code_idx"),
        ]

    def __str__(self):
        return f"{self.item_code} - {self.name} ({self.get_category_display()})"


class StoreInventoryItem(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="marine_inventory_stocks")
    item = models.ForeignKey(MarineCatalogueItem, on_delete=models.PROTECT, related_name="stock_levels")
    location = models.CharField(max_length=120)
    batch_or_lot_number = models.CharField(max_length=80, blank=True)
    serial_number = models.CharField(max_length=80, blank=True)
    quantity_on_hand = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    unit_cost_minor = models.BigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="NGN")
    expires_on = models.DateField(null=True, blank=True)
    storage_condition = models.CharField(max_length=40, default="ambient")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("item", "location")
        constraints = [
            models.CheckConstraint(condition=Q(quantity_on_hand__gte=0), name="marine_inventory_qty_nonnegative"),
            models.CheckConstraint(condition=Q(unit_cost_minor__gte=0), name="marine_inventory_cost_nonnegative"),
        ]
        indexes = [
            models.Index(fields=("organization", "location"), name="marine_inv_loc_idx"),
            models.Index(fields=("organization", "expires_on"), name="marine_inv_exp_idx"),
        ]

    def clean(self):
        if self.item_id and self.organization_id != self.item.organization_id:
            raise ValidationError("The inventory item and catalogue item must belong to the same organization.")

    def __str__(self):
        return f"{self.item.name} @ {self.location}: {self.quantity_on_hand} {self.item.unit_of_measure}"


class RefrigerantCylinder(models.Model):
    class Status(models.TextChoices):
        FULL = "full", "Full (Sealed)"
        IN_SERVICE = "in_service", "In Service (Onboard)"
        EMPTY = "empty", "Empty (Awaiting Refill)"
        RECOVERED = "recovered", "Recovered (Environmental Protocol)"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="refrigerant_cylinders")
    cylinder_serial = models.CharField(max_length=60)
    gas_type = models.CharField(max_length=20)
    tare_weight_kg = models.DecimalField(max_digits=8, decimal_places=2)
    gross_weight_kg = models.DecimalField(max_digits=8, decimal_places=2)
    net_gas_weight_kg = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.FULL)
    assigned_vessel_or_facility = models.CharField(max_length=150, blank=True)
    marpol_compliant = models.BooleanField(default=True)
    recovery_logged_at = models.DateTimeField(null=True, blank=True)
    environmental_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("cylinder_serial",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "cylinder_serial"), name="unique_refrigerant_cylinder"),
            models.CheckConstraint(condition=Q(tare_weight_kg__gt=0), name="refrigerant_tare_positive"),
            models.CheckConstraint(condition=Q(gross_weight_kg__gte=models.F("tare_weight_kg")), name="refrigerant_gross_gte_tare"),
        ]
        indexes = [
            models.Index(fields=("organization", "status", "gas_type"), name="marine_refrig_idx"),
        ]

    def __str__(self):
        return f"{self.cylinder_serial} ({self.gas_type}) - {self.get_status_display()}"


class StoreOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"
        DISPATCHED = "dispatched", "Dispatched"
        DELIVERED = "delivered", "Delivered & Signed"
        CANCELLED = "cancelled", "Cancelled"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="marine_store_orders")
    order_number = models.CharField(max_length=40)
    vessel_or_installation = models.CharField(max_length=150)
    destination = models.CharField(max_length=150)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    requested_delivery_date = models.DateField()
    delivered_at = models.DateTimeField(null=True, blank=True)
    receiving_officer_name = models.CharField(max_length=150, blank=True)
    receiving_signature_ref = models.CharField(max_length=150, blank=True)
    total_minor = models.BigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="NGN")
    version = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_marine_orders")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_marine_orders")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "order_number"), name="unique_store_order_number"),
            models.CheckConstraint(condition=Q(total_minor__gte=0), name="store_order_total_nonnegative"),
        ]
        indexes = [
            models.Index(fields=("organization", "status", "-created_at"), name="marine_order_status_idx"),
        ]

    def __str__(self):
        return f"{self.order_number} - {self.vessel_or_installation} ({self.get_status_display()})"


class StoreOrderItem(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="marine_order_items")
    order = models.ForeignKey(StoreOrder, on_delete=models.PROTECT, related_name="line_items")
    catalogue_item = models.ForeignKey(MarineCatalogueItem, on_delete=models.PROTECT, related_name="order_items")
    quantity_requested = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_delivered = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    unit_price_minor = models.BigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="NGN")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("catalogue_item__name",)
        constraints = [
            models.CheckConstraint(condition=Q(quantity_requested__gt=0), name="marine_order_item_req_positive"),
            models.CheckConstraint(condition=Q(quantity_delivered__gte=0), name="marine_order_item_deliv_nonnegative"),
            models.CheckConstraint(condition=Q(unit_price_minor__gte=0), name="marine_order_item_price_nonnegative"),
        ]

    def clean(self):
        if self.order_id and self.organization_id != self.order.organization_id:
            raise ValidationError("The line item and order must belong to the same organization.")
        if self.catalogue_item_id and self.organization_id != self.catalogue_item.organization_id:
            raise ValidationError("The line item and catalogue item must belong to the same organization.")

    def __str__(self):
        return f"{self.catalogue_item.name} x {self.quantity_requested} ({self.order.order_number})"


class InventoryMovement(models.Model):
    class MovementType(models.TextChoices):
        RECEIPT = "receipt", "Goods Received"
        ISSUANCE = "issuance", "Issued to Order / Vessel"
        ADJUSTMENT = "adjustment", "Stock Count Adjustment"
        RECOVERY = "recovery", "Refrigerant / Bottle Return"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="marine_inventory_movements")
    catalogue_item = models.ForeignKey(MarineCatalogueItem, on_delete=models.PROTECT, related_name="movements")
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity_delta = models.DecimalField(max_digits=12, decimal_places=2)
    resulting_quantity = models.DecimalField(max_digits=12, decimal_places=2)
    location = models.CharField(max_length=120)
    reference_order = models.ForeignKey(StoreOrder, on_delete=models.PROTECT, null=True, blank=True, related_name="movements")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="marine_inventory_movements")
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("organization", "-created_at"), name="marine_movement_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Inventory movement audit records are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Inventory movement audit records are immutable.")
