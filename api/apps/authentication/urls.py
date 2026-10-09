from django.urls import path
from .views import (
    DeleteAccountView, GoogleLoginView, LegalStatusView, AcceptLegalView,
    CSRFTokenView,
)

urlpatterns = [
    path('csrf/', CSRFTokenView.as_view(), name='csrf-token'),
    path('delete-account/', DeleteAccountView.as_view(), name='delete-account'),
    path('google/', GoogleLoginView.as_view(), name='google-login'),
    path('legal-status/', LegalStatusView.as_view(), name='legal-status'),
    path('accept-legal/', AcceptLegalView.as_view(), name='accept-legal'),
]
