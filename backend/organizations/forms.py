from django import forms

from .models import Organization
from .modules import CORE_MODULES, MODULES, OPTIONAL_MODULE_CHOICES

CORE_HELP = "Always included: " + ", ".join(MODULES[m] for m in sorted(CORE_MODULES, key=MODULES.get)) + "."


class ModuleSelectionForm(forms.Form):
    modules = forms.MultipleChoiceField(
        choices=OPTIONAL_MODULE_CHOICES,
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text=CORE_HELP,
    )
    reason = forms.CharField(max_length=300, required=False, help_text="Recorded in the module history, e.g. the contract or pilot reference.")


class ProvisionCustomerForm(ModuleSelectionForm):
    organization_name = forms.CharField(max_length=200)
    plan = forms.ChoiceField(choices=Organization.Plan.choices)
    owner_first_name = forms.CharField(max_length=150)
    owner_last_name = forms.CharField(max_length=150)
    owner_email = forms.EmailField(max_length=254, help_text="Receives a 7-day link to set their password.")
    owner_job_title = forms.CharField(max_length=120, required=False)

    field_order = ["organization_name", "plan", "owner_first_name", "owner_last_name", "owner_email", "owner_job_title", "modules", "reason"]
