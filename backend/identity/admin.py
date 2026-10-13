from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class PetroLedgerUserAdmin(UserAdmin):
    list_display = ("username", "email", "is_staff", "is_active", "date_joined")
    list_filter = ("is_staff", "is_superuser", "is_active", "groups")
    search_fields = ("username", "first_name", "last_name", "email", "public_id")
    ordering = ("username",)
    readonly_fields = ("public_id", "last_login", "date_joined")
    fieldsets = UserAdmin.fieldsets + (("PetroLedger", {"fields": ("public_id",)}),)
