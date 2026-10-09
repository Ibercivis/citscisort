from django.conf import settings
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied


class LegalAcceptanceRequired(PermissionDenied):
    """
    403 raised by HasAcceptedLegal. The response body is a dict so the frontend
    can detect the case reliably via the `code` field instead of string-matching.
    """
    default_detail = {
        'detail': 'You must accept the current Terms of Service and Privacy Policy.',
        'code': 'legal_acceptance_required',
        'needs_acceptance': True,
    }
    default_code = 'legal_acceptance_required'


class HasAcceptedLegal(permissions.BasePermission):
    """
    Require the authenticated user to have accepted the CURRENT Terms of Service
    and Privacy Policy versions (as defined in settings).

    Unauthenticated requests are allowed to fall through to other permissions
    (typically IsAuthenticated, which will reject them). This class only cares
    about authenticated users.

    Raises a PermissionDenied with code='legal_acceptance_required' so the
    frontend can distinguish it from other 403s and show the acceptance modal.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return True  # Let IsAuthenticated handle the rejection.

        profile = getattr(user, 'classification_profile', None)
        if profile is None:
            raise LegalAcceptanceRequired()

        terms_ok = profile.terms_version_accepted == settings.CURRENT_TERMS_VERSION
        privacy_ok = profile.privacy_version_accepted == settings.CURRENT_PRIVACY_VERSION
        if terms_ok and privacy_ok:
            return True

        raise LegalAcceptanceRequired()


class IsAuthenticatedOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow:
    - Read-only access for everyone
    - Write access only for authenticated users
    """
    def has_permission(self, request, view):
        # Allow read methods (GET, HEAD, OPTIONS) for everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write methods require authentication
        return request.user and request.user.is_authenticated


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner
        return obj.user == request.user


class IsGoldUserOrReadOnly(permissions.BasePermission):
    """
    Only allow gold users to write, everyone can read
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return (request.user and 
                request.user.is_authenticated and 
                hasattr(request.user, 'classification_profile') and
                request.user.classification_profile.is_gold_user)
