from django.test import TestCase
from django.urls import reverse


class HealthViewTests(TestCase):
    def test_health_endpoint_is_public(self):
        response = self.client.get(reverse("health"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_health_endpoint_is_not_rate_limited(self):
        responses = [self.client.get(reverse("health")) for _ in range(105)]

        self.assertTrue(all(response.status_code == 200 for response in responses))
