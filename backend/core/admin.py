from django.contrib import admin

from .models import EmailLog


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = (
        "recipient_email",
        "email_type",
        "status",
        "subject",
        "organization",
        "provider",
        "provider_message_id",
        "created_at",
    )
    list_filter = ("status", "email_type", "provider", "created_at")
    search_fields = (
        "public_id",
        "recipient_email",
        "subject",
        "provider_message_id",
        "organization__name",
        "recipient_user__email",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "recipient_user")
    readonly_fields = (
        "public_id",
        "organization",
        "recipient_user",
        "recipient_email",
        "sender",
        "subject",
        "email_type",
        "provider",
        "provider_message_id",
        "status",
        "error_message",
        "metadata",
        "created_at",
        "sent_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset
        organization_ids = request.user.memberships.filter(is_active=True).values_list("organization_id", flat=True)
        return queryset.filter(organization_id__in=organization_ids)

