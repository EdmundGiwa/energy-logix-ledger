import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
