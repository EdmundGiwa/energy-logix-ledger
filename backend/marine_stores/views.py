import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.context import resolve_membership
from marine_stores.models import (
    InventoryMovement,
    MarineCatalogueItem,
    RefrigerantCylinder,
    StoreInventoryItem,
    StoreOrder,
    StoreOrderItem,
)
from marine_stores.permissions import can_approve, can_write
from marine_stores.serializers import (
    InventoryMovementSerializer,
    MarineCatalogueItemSerializer,
    RefrigerantCylinderSerializer,
    StoreInventoryItemSerializer,
    StoreOrderSerializer,
)
from marine_stores.services import ConflictError, MarineStoresService


class StandardPagination(PageNumberPagination):
    page_size = 25
    max_page_size = 100
    page_size_query_param = "page_size"


class MarineCatalogueItemListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = MarineCatalogueItem.objects.filter(organization=membership.organization).prefetch_related("stock_levels")

        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(Q(item_code__icontains=search) | Q(name__icontains=search) | Q(impa_code__icontains=search))

        is_active = request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        serializer = MarineCatalogueItemSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can add catalogue items.")

        serializer = MarineCatalogueItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(organization=membership.organization)
        return Response(MarineCatalogueItemSerializer(item).data, status=status.HTTP_201_CREATED)


class MarineCatalogueItemDetailView(APIView):
    def get_object(self, organization, public_id):
        try:
            return MarineCatalogueItem.objects.get(organization=organization, public_id=public_id)
        except MarineCatalogueItem.DoesNotExist:
            raise NotFound("Catalogue item not found.")

    def get(self, request, public_id):
        membership = resolve_membership(request)
        item = self.get_object(membership.organization, public_id)
        return Response(MarineCatalogueItemSerializer(item).data)

    def patch(self, request, public_id):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can edit catalogue items.")
        item = self.get_object(membership.organization, public_id)
        serializer = MarineCatalogueItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(MarineCatalogueItemSerializer(updated).data)


class StoreInventoryItemListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = StoreInventoryItem.objects.filter(organization=membership.organization).select_related("item")

        location = request.query_params.get("location")
        if location:
            qs = qs.filter(location=location)

        item_id = request.query_params.get("item_id")
        if item_id:
            qs = qs.filter(item__public_id=item_id)

        serializer = StoreInventoryItemSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Record a goods receipt / stock intake"""
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized storekeepers can record stock intake.")

        item_id = request.data.get("item_id")
        if not item_id:
            raise ValidationError({"item_id": "item_id is required."})

        try:
            item = MarineCatalogueItem.objects.get(organization=membership.organization, public_id=item_id)
        except MarineCatalogueItem.DoesNotExist:
            raise NotFound("Catalogue item not found.")

        location = request.data.get("location")
        if not location:
            raise ValidationError({"location": "location is required."})

        quantity = request.data.get("quantity")
        if quantity is None:
            raise ValidationError({"quantity": "quantity is required."})

        try:
            stock = MarineStoresService.record_stock_receipt(
                organization=membership.organization,
                user=request.user,
                item=item,
                location=location,
                quantity=quantity,
                unit_cost_minor=int(request.data.get("unit_cost_minor", 0)),
                currency=request.data.get("currency", "NGN"),
                lot_number=request.data.get("batch_or_lot_number", ""),
                serial_number=request.data.get("serial_number", ""),
                expires_on=request.data.get("expires_on") or None,
                reason=request.data.get("reason", "Goods intake"),
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))

        return Response(StoreInventoryItemSerializer(stock).data, status=status.HTTP_201_CREATED)


class RefrigerantCylinderListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = RefrigerantCylinder.objects.filter(organization=membership.organization)

        cyl_status = request.query_params.get("status")
        if cyl_status:
            qs = qs.filter(status=cyl_status)

        gas_type = request.query_params.get("gas_type")
        if gas_type:
            qs = qs.filter(gas_type__iexact=gas_type)

        serializer = RefrigerantCylinderSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can register refrigerant cylinders.")

        serializer = RefrigerantCylinderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cylinder = serializer.save(organization=membership.organization)
        return Response(RefrigerantCylinderSerializer(cylinder).data, status=status.HTTP_201_CREATED)


class RefrigerantCylinderDetailView(APIView):
    def get_object(self, organization, public_id):
        try:
            return RefrigerantCylinder.objects.get(organization=organization, public_id=public_id)
        except RefrigerantCylinder.DoesNotExist:
            raise NotFound("Refrigerant cylinder not found.")

    def get(self, request, public_id):
        membership = resolve_membership(request)
        cylinder = self.get_object(membership.organization, public_id)
        return Response(RefrigerantCylinderSerializer(cylinder).data)

    def patch(self, request, public_id):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can update refrigerant cylinders.")

        cylinder = self.get_object(membership.organization, public_id)
        data = request.data.copy()

        # If marking as recovered, record timestamp
        if data.get("status") == RefrigerantCylinder.Status.RECOVERED and not cylinder.recovery_logged_at:
            data["recovery_logged_at"] = timezone.now().isoformat()

        serializer = RefrigerantCylinderSerializer(cylinder, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(RefrigerantCylinderSerializer(updated).data)


class StoreOrderListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = StoreOrder.objects.filter(organization=membership.organization).prefetch_related(
            "line_items__catalogue_item"
        )

        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = StoreOrderSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can create store requisitions.")

        line_items_data = request.data.get("line_items", [])
        if not line_items_data:
            raise ValidationError({"line_items": "At least one line item is required."})

        try:
            order = MarineStoresService.create_order(
                organization=membership.organization,
                user=request.user,
                data=request.data,
                line_items_data=line_items_data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(StoreOrderSerializer(order).data, status=status.HTTP_201_CREATED)


class StoreOrderDetailView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        try:
            order = StoreOrder.objects.prefetch_related("line_items__catalogue_item").get(
                organization=membership.organization, public_id=public_id
            )
        except StoreOrder.DoesNotExist:
            raise NotFound("Store order not found.")

        return Response(StoreOrderSerializer(order).data)


class StoreOrderTransitionView(APIView):
    def post(self, request, public_id, action):
        membership = resolve_membership(request)
        try:
            order = StoreOrder.objects.prefetch_related("line_items__catalogue_item").get(
                organization=membership.organization, public_id=public_id
            )
        except StoreOrder.DoesNotExist:
            raise NotFound("Store order not found.")

        if action == "approve" and not can_approve(membership):
            raise PermissionDenied("Only administrators and owners can approve store orders.")

        version = request.data.get("version")
        if version is None:
            raise ValidationError({"version": "Current order version is required."})

        reason = request.data.get("reason", "")
        delivery_data = request.data.get("delivery_data")

        try:
            updated = MarineStoresService.transition_order(
                organization=membership.organization,
                user=request.user,
                order=order,
                action=action,
                version=int(version),
                reason=reason,
                delivery_data=delivery_data,
            )
        except ConflictError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))

        return Response(StoreOrderSerializer(updated).data)


class InventoryMovementListView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = InventoryMovement.objects.filter(organization=membership.organization).select_related(
            "catalogue_item", "actor"
        )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = InventoryMovementSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class MarineStoresSummaryView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        org = membership.organization

        total_catalogue = MarineCatalogueItem.objects.filter(organization=org).count()
        total_active_catalogue = MarineCatalogueItem.objects.filter(organization=org, is_active=True).count()
        
        cylinders = RefrigerantCylinder.objects.filter(organization=org)
        total_cylinders = cylinders.count()
        in_service_cylinders = cylinders.filter(status=RefrigerantCylinder.Status.IN_SERVICE).count()
        marpol_compliant = cylinders.filter(marpol_compliant=True).count()

        orders = StoreOrder.objects.filter(organization=org)
        total_orders = orders.count()
        pending_orders = orders.filter(status__in=[StoreOrder.Status.DRAFT, StoreOrder.Status.APPROVED]).count()
        dispatched_orders = orders.filter(status=StoreOrder.Status.DISPATCHED).count()
        delivered_orders = orders.filter(status=StoreOrder.Status.DELIVERED).count()

        # Low stock items calculation
        catalogue_items = MarineCatalogueItem.objects.filter(organization=org, is_active=True, minimum_stock_level__gt=0).prefetch_related("stock_levels")
        low_stock_count = 0
        for item in catalogue_items:
            stock_qty = sum(s.quantity_on_hand for s in item.stock_levels.all())
            if stock_qty < item.minimum_stock_level:
                low_stock_count += 1

        recent_movements = InventoryMovement.objects.filter(organization=org).select_related("catalogue_item", "actor")[:5]

        return Response({
            "total_catalogue_items": total_catalogue,
            "total_active_catalogue_items": total_active_catalogue,
            "low_stock_alerts_count": low_stock_count,
            "total_refrigerant_cylinders": total_cylinders,
            "in_service_cylinders": in_service_cylinders,
            "marpol_compliant_cylinders": marpol_compliant,
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "dispatched_orders": dispatched_orders,
            "delivered_orders": delivered_orders,
            "recent_movements": InventoryMovementSerializer(recent_movements, many=True).data,
        })
