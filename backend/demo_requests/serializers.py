import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from rest_framework import serializers

from . import catalog
from .models import DemoRequest

_PHONE = re.compile(r"^\+?[0-9][0-9 ()\-]{6,24}$")


def _choice_list(*, choices: dict, required: bool, max_items: int):
    def validate(values):
        if not isinstance(values, list) or not all(isinstance(v, str) for v in values):
            raise serializers.ValidationError("Expected a list of option keys.")
        unknown = sorted(set(values) - set(choices))
        if unknown:
            raise serializers.ValidationError(f"Unknown option(s): {', '.join(unknown)}.")
        deduped = list(dict.fromkeys(values))
        if required and not deduped:
            raise serializers.ValidationError("Choose at least one option.")
        if len(deduped) > max_items:
            raise serializers.ValidationError(f"Choose at most {max_items} options.")
        return deduped

    return validate


class DemoRequestCreateSerializer(serializers.Serializer):
    segment = serializers.ChoiceField(choices=list(catalog.SEGMENTS))
    operations = serializers.JSONField(required=False, default=list)
    company_name = serializers.CharField(max_length=200, trim_whitespace=True)
    company_website = serializers.URLField(max_length=300, required=False, allow_blank=True, default="")
    company_size = serializers.ChoiceField(choices=DemoRequest.CompanySize.choices)
    countries = serializers.JSONField()
    pain_points = serializers.JSONField(required=False, default=list)
    interested_modules = serializers.JSONField()
    current_tools = serializers.ChoiceField(choices=DemoRequest.CurrentTools.choices)

    full_name = serializers.CharField(max_length=150, trim_whitespace=True)
    work_email = serializers.EmailField(max_length=254)
    phone = serializers.CharField(max_length=32, trim_whitespace=True)
    job_title = serializers.CharField(max_length=120, trim_whitespace=True)
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")

    scheduled_start = serializers.DateTimeField()
    prospect_timezone = serializers.CharField(max_length=64)
    meeting_format = serializers.ChoiceField(choices=DemoRequest.MeetingFormat.choices)
    on_site_location = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    consent_to_contact = serializers.BooleanField()

    def validate_operations(self, value):
        return _choice_list(choices=catalog.OPERATIONS, required=False, max_items=len(catalog.OPERATIONS))(value)

    def validate_countries(self, value):
        return _choice_list(choices=catalog.COUNTRIES, required=True, max_items=len(catalog.COUNTRIES))(value)

    def validate_pain_points(self, value):
        return _choice_list(choices=catalog.PAIN_POINTS, required=False, max_items=len(catalog.PAIN_POINTS))(value)

    def validate_interested_modules(self, value):
        return _choice_list(choices=catalog.MODULES, required=True, max_items=len(catalog.MODULES))(value)

    def validate_work_email(self, value):
        return value.strip().lower()

    def validate_phone(self, value):
        if not _PHONE.match(value):
            raise serializers.ValidationError("Enter a phone number with country code, e.g. +234 803 000 0000.")
        return value

    def validate_prospect_timezone(self, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise serializers.ValidationError("Unknown time zone.")
        return value

    def validate_consent_to_contact(self, value):
        if value is not True:
            raise serializers.ValidationError("We need your permission to contact you about the demo.")
        return value

    def validate(self, attrs):
        if attrs["meeting_format"] == DemoRequest.MeetingFormat.ON_SITE and not attrs.get("on_site_location"):
            raise serializers.ValidationError({"on_site_location": ["Tell us where to meet you."]})
        if attrs["meeting_format"] != DemoRequest.MeetingFormat.ON_SITE:
            attrs["on_site_location"] = ""
        return attrs


class DemoRequestReceiptSerializer(serializers.ModelSerializer):
    """Deliberately minimal: never echo contact details back."""

    class Meta:
        model = DemoRequest
        fields = ("reference", "status", "scheduled_start", "duration_minutes", "meeting_format")
        read_only_fields = fields
