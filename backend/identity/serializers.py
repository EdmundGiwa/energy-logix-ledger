from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from organizations.models import Membership, Organization
from organizations.serializers import OrganizationSerializer


User = get_user_model()


class RegistrationSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, trim_whitespace=False, write_only=True)
    organization_name = serializers.CharField(max_length=200)
    job_title = serializers.CharField(max_length=120)
    requested_plan = serializers.ChoiceField(choices=Organization.Plan.choices)
    terms_accepted = serializers.BooleanField()

    def validate_email(self, value):
        normalized = User.objects.normalize_email(value).strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return normalized

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError("You must accept the terms and privacy notice.")
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, trim_whitespace=False, write_only=True)
    remember_me = serializers.BooleanField(default=False)

    def validate(self, attrs):
        email = User.objects.normalize_email(attrs["email"]).strip().lower()
        user = authenticate(request=self.context["request"], username=email, password=attrs["password"])
        if user is None:
            raise serializers.ValidationError("The email or password is incorrect.", code="invalid_credentials")
        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.", code="inactive_account")
        attrs["user"] = user
        return attrs


class CurrentMembershipSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ("id", "role", "job_title", "is_active", "organization")


class CurrentUserSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    name = serializers.SerializerMethodField()
    memberships = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "name", "memberships")

    def get_name(self, obj):
        return obj.get_full_name() or obj.email

    def get_memberships(self, obj):
        memberships = obj.memberships.select_related("organization").filter(is_active=True, organization__status="active")
        return CurrentMembershipSerializer(memberships, many=True).data
