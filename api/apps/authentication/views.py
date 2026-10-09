from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.auth import get_user_model
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView

from .serializers import DeleteAccountSerializer
from apps.classifications.models import Classification, UserProfile

User = get_user_model()


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CSRFTokenView(APIView):
    """
    GET /api/auth/csrf/

    Anonymous endpoint that sets the csrftoken cookie on the client.
    Frontends call this before unauthenticated POSTs (register, password reset,
    email verification confirm) so the cookie exists when they send the token.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return JsonResponse({'detail': 'ok'})


class GoogleLoginView(SocialLoginView):
    """
    POST /api/auth/google/

    Accepts a Google access_token or id_token from the frontend
    and returns an auth token for the API.

    Request body:
        {"access_token": "<google_access_token>"}
        or
        {"id_token": "<google_id_token>"}
    """
    adapter_class = GoogleOAuth2Adapter
    callback_url = "postmessage"  # For frontend popup flow
    client_class = OAuth2Client
    permission_classes = [AllowAny]  # Login must be accessible to anonymous users


class DeleteAccountView(APIView):
    """
    DELETE /api/auth/delete-account/
    
    Delete user account with two options:
    1. delete_classifications=true: Delete user and all their classifications (cascade)
    2. delete_classifications=false: Delete user but keep classifications anonymously (user set to null)
    
    Request body:
        {
            "delete_classifications": false,  // optional, default: false
            "confirm": true  // required
        }
    
    Response:
        {
            "message": "Account deleted successfully. X classifications were preserved anonymously.",
            "deleted_user": "user@example.com",
            "classifications_deleted": false,
            "classification_count": X
        }
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DeleteAccountSerializer
    
    def delete(self, request):
        """Handle account deletion"""
        serializer = DeleteAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        delete_classifications = serializer.validated_data.get('delete_classifications', False)
        
        # Get user's classification count before deletion
        classification_count = Classification.objects.filter(user=user).count()
        
        try:
            with transaction.atomic():
                if delete_classifications:
                    # Option 1: Delete user and all their classifications (cascade)
                    Classification.objects.filter(user=user).delete()
                    message = f"Account deleted successfully. {classification_count} classifications were also deleted."
                else:
                    # Option 2: Delete user but keep classifications (set user to null)
                    # Update classifications to set user to null (anonymize)
                    Classification.objects.filter(user=user).update(user=None)
                    message = f"Account deleted successfully. {classification_count} classifications were preserved anonymously."
                
                # Delete user profile (will cascade to user due to OneToOneField)
                try:
                    profile = UserProfile.objects.get(user=user)
                    profile.delete()
                except UserProfile.DoesNotExist:
                    pass
                
                # Store user email before deletion
                user_email = user.email
                
                # Finally delete the user
                user.delete()
            
            return Response({
                'message': message,
                'deleted_user': user_email,
                'classifications_deleted': delete_classifications,
                'classification_count': classification_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error deleting account: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


def _legal_status_payload(profile):
    """Build the legal-status dict from a UserProfile."""
    terms_current = settings.CURRENT_TERMS_VERSION
    privacy_current = settings.CURRENT_PRIVACY_VERSION
    terms_ok = profile.terms_version_accepted == terms_current
    privacy_ok = profile.privacy_version_accepted == privacy_current
    return {
        'terms_current_version': terms_current,
        'terms_accepted_version': profile.terms_version_accepted or None,
        'terms_accepted_at': profile.terms_accepted_at,
        'terms_ok': terms_ok,
        'privacy_current_version': privacy_current,
        'privacy_accepted_version': profile.privacy_version_accepted or None,
        'privacy_accepted_at': profile.privacy_accepted_at,
        'privacy_ok': privacy_ok,
        'needs_acceptance': not (terms_ok and privacy_ok),
    }


class LegalStatusView(APIView):
    """
    GET /api/auth/legal-status/

    Returns the user's Terms/Privacy acceptance state and the current versions.
    The frontend calls this right after any successful login; if
    `needs_acceptance` is true, it must show the acceptance modal and then
    POST to /api/auth/accept-legal/.
    """
    # IsAuthenticated only — bypass HasAcceptedLegal (chicken-and-egg).
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response(_legal_status_payload(profile))


class AcceptLegalView(APIView):
    """
    POST /api/auth/accept-legal/

    Record the user's acceptance of the current Terms of Service and Privacy
    Policy versions.

    Body (all fields required):
        {
          "terms_version": "April 2026",
          "privacy_version": "April 2026"
        }

    The versions must match settings.CURRENT_TERMS_VERSION and
    settings.CURRENT_PRIVACY_VERSION byte-for-byte; otherwise the request is
    rejected with 400. This prevents a stale frontend from accepting an old
    version.

    Response: same shape as GET /api/auth/legal-status/ (with updated state).
    """
    # IsAuthenticated only — bypass HasAcceptedLegal (this endpoint grants it).
    permission_classes = [IsAuthenticated]

    def post(self, request):
        terms_version = request.data.get('terms_version')
        privacy_version = request.data.get('privacy_version')

        errors = {}
        if not terms_version:
            errors['terms_version'] = 'This field is required.'
        elif terms_version != settings.CURRENT_TERMS_VERSION:
            errors['terms_version'] = (
                f"Version mismatch. Expected {settings.CURRENT_TERMS_VERSION!r}, "
                f"got {terms_version!r}."
            )
        if not privacy_version:
            errors['privacy_version'] = 'This field is required.'
        elif privacy_version != settings.CURRENT_PRIVACY_VERSION:
            errors['privacy_version'] = (
                f"Version mismatch. Expected {settings.CURRENT_PRIVACY_VERSION!r}, "
                f"got {privacy_version!r}."
            )
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        now = timezone.now()
        profile.terms_version_accepted = terms_version
        profile.terms_accepted_at = now
        profile.privacy_version_accepted = privacy_version
        profile.privacy_accepted_at = now
        profile.save(update_fields=[
            'terms_version_accepted', 'terms_accepted_at',
            'privacy_version_accepted', 'privacy_accepted_at',
        ])

        return Response(_legal_status_payload(profile))
