from django.urls import path

from .views import (
    CsrfView,
    CurrentUserView,
    EmailVerificationConfirmView,
    EmailVerificationRequestView,
    LoginView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    SessionRefreshView,
)


urlpatterns = [
    path("csrf/", CsrfView.as_view(), name="auth-csrf"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("session/refresh/", SessionRefreshView.as_view(), name="auth-session-refresh"),
    path("me/", CurrentUserView.as_view(), name="auth-me"),
    path("verify-email/request/", EmailVerificationRequestView.as_view(), name="auth-verify-email-request"),
    path("verify-email/confirm/", EmailVerificationConfirmView.as_view(), name="auth-verify-email-confirm"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="auth-password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
]
