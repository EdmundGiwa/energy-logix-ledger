import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


DEBUG = env_bool("DJANGO_DEBUG")
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "insecure-local-development-key-change-me"
    else:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY is required when DJANGO_DEBUG is false")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "core",
    "identity",
    "organizations",
    "bunkering",
    "haulage",
    "hse",
    "pipeline_integrity",
    "refinery_link",
    "marine_stores",
    "tank_works",
    "epc_link",
    "compliance_shield",
    "billing",
    "client_portal",
    "demo_requests",
    "owner_dashboard",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "core.middleware.RequestCorrelationMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "organizations.middleware.TenantDatabaseContextMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "petroledger"),
        "USER": os.getenv("DATABASE_USER", os.getenv("POSTGRES_APP_USER", os.getenv("POSTGRES_USER", "petroledger"))),
        "PASSWORD": os.getenv("DATABASE_PASSWORD", os.getenv("POSTGRES_APP_PASSWORD", os.getenv("POSTGRES_PASSWORD", "petroledger"))),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
        "CONN_HEALTH_CHECKS": True,
    }
}
DATABASES["default"]["ATOMIC_REQUESTS"] = True

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTH_USER_MODEL = "identity.User"

LANGUAGE_CODE = "en-gb"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "login": "10/minute",
        "session_refresh": "30/hour",
        "email_verification": "6/hour",
        "password_reset": "5/hour",
        "demo_request": "5/hour",
        "module_request": "20/hour",
    },
}

RESEND_KEY = os.getenv("RESEND_KEY") or os.getenv("RESEND_API_KEY")
DEFAULT_FROM_EMAIL = "Ofshora <notifications@send.ofshora.com>"
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
# Book-a-Demo calendar. Slot times are in TIMEZONE; WEEKDAYS uses Monday=0.
# Public holidays are not excluded yet: cancel affected bookings in admin.
DEMO_BOOKING = {
    "TIMEZONE": "Africa/Lagos",
    "WEEKDAYS": [0, 1, 2, 3, 4],
    "START_TIMES": ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"],
    "DURATION_MINUTES": 45,
    "HORIZON_DAYS": 21,
    "MIN_NOTICE_HOURS": 12,
    "NOTIFY_EMAILS": env_list("DEMO_REQUEST_NOTIFY_EMAILS", "support@ofshora.com,eddie@ofshora.com,chukwuka@ofshora.com"),
}
# Inbox for sales alerts (new module requests). Defaults to the demo-booking inbox.
SALES_NOTIFY_EMAILS = DEMO_BOOKING["NOTIFY_EMAILS"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend" if DEBUG else "django.core.mail.backends.console.EmailBackend"

CORS_ALLOWED_ORIGINS = env_list("DJANGO_CORS_ALLOWED_ORIGINS", "http://localhost:3000")
CORS_ALLOW_CREDENTIALS = True

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = os.getenv("DJANGO_SESSION_COOKIE_SAMESITE", "None" if not DEBUG else "Lax")
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_NAME = "offshora_session"
SESSION_COOKIE_AGE = 60 * 60 * 24 * 14
SESSION_COOKIE_DOMAIN = os.getenv("DJANGO_SESSION_COOKIE_DOMAIN", ".ofshora.com" if not DEBUG else None)
CSRF_COOKIE_SAMESITE = os.getenv("DJANGO_CSRF_COOKIE_SAMESITE", "None" if not DEBUG else "Lax")
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_NAME = "offshora_csrftoken"
CSRF_COOKIE_DOMAIN = os.getenv("DJANGO_CSRF_COOKIE_DOMAIN", ".ofshora.com" if not DEBUG else None)
