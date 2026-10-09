from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailBackend(ModelBackend):
    """
    Custom authentication backend that allows users to log in using their email address.
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Authenticate a user based on email address as the username.
        
        Args:
            request: The request object
            username: Can be either username or email
            password: The user's password
            
        Returns:
            User object if authentication succeeds, None otherwise
        """
        # Try to fetch the user by searching the email field
        user = User.objects.filter(email=username).first()
        if user is None:
            # Try with username field as fallback
            user = User.objects.filter(username=username).first()
        if user is None:
            return None
        
        # Check the password
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        
        return None
