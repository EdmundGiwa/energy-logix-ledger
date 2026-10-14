from django.urls import path

from .views import CsrfView, CurrentUserView, LoginView, LogoutView, RegisterView, SessionRefreshView


urlpatterns = [
    path("csrf/", CsrfView.as_view(), name="auth-csrf"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("session/refresh/", SessionRefreshView.as_view(), name="auth-session-refresh"),
    path("me/", CurrentUserView.as_view(), name="auth-me"),
]
