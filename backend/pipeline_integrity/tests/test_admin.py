from django.contrib import admin
from django.test import SimpleTestCase

from pipeline_integrity.models import CPSurveyPoint, Hydrotest, InspectionRecord, PigRun, PipelineAsset, PipelineAuditEvent, ROWObservation


class PipelineIntegrityAdminTests(SimpleTestCase):
    def test_all_models_are_registered(self):
        self.assertIsInstance(admin.site._registry[PipelineAsset], admin.ModelAdmin)
        self.assertIsInstance(admin.site._registry[PigRun], admin.ModelAdmin)
        self.assertIsInstance(admin.site._registry[Hydrotest], admin.ModelAdmin)
        self.assertIsInstance(admin.site._registry[PipelineAuditEvent], admin.ModelAdmin)
        self.assertIsInstance(admin.site._registry[InspectionRecord], admin.ModelAdmin)
        self.assertIsInstance(admin.site._registry[CPSurveyPoint], admin.ModelAdmin)
        self.assertIsInstance(admin.site._registry[ROWObservation], admin.ModelAdmin)
