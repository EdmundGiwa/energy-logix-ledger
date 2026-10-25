import json
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from client_portal.models import (
    ClientPortalAccessLog,
    ClientPortalProfile,
    SharedDeliverablePackage,
)


class ClientPortalService:
    @staticmethod
    def log_access(*, organization, user, client_name, action, resource_type, resource_reference, ip_address="", user_agent="", metadata=None):
        return ClientPortalAccessLog.objects.create(
            organization=organization,
            client_user=user,
            client_name=client_name,
            action=action,
            resource_type=resource_type,
            resource_reference=resource_reference,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata or {},
        )

    @staticmethod
    @transaction.atomic
    def create_client_profile(*, organization, user, target_user, client_name, client_customer_code="", allowed_modules=None):
        profile, created = ClientPortalProfile.objects.update_or_create(
            organization=organization,
            user=target_user,
            defaults={
                "client_name": client_name,
                "client_customer_code": client_customer_code,
                "allowed_modules": allowed_modules or ["bunkering", "haulage", "pipe_integrity", "compliance", "billing"],
                "is_active": True,
            },
        )
        return profile

    @staticmethod
    @transaction.atomic
    def share_deliverable_package(*, organization, user, client_name, title, deliverable_type, source_reference, summary_metadata, expires_at=None):
        package = SharedDeliverablePackage.objects.create(
            organization=organization,
            client_name=client_name,
            title=title,
            deliverable_type=deliverable_type,
            source_reference=source_reference,
            summary_metadata=summary_metadata or {},
            expires_at=expires_at,
            created_by=user,
        )
        return package
