"""
Django settings for CitSciSort project.

Copyright (C) 2025 CitSciSort Contributors

Licensed under the EUPL, Version 1.2 or – as soon they will be approved by
the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

https://joinup.ec.europa.eu/software/page/eupl

Unless required by applicable law or agreed to in writing, software
distributed under the Licence is distributed on an "AS IS" basis,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the Licence for the specific language governing permissions and
limitations under the Licence.
"""

from pathlib import Path
from decouple import config, Csv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    
    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',
    'drf_spectacular',
    'corsheaders',
    'django_countries',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'django_ses',
    'django_db_logger',
    'django_rq',

    # Local apps
    'apps.authentication',
    'apps.abstracts',
    'apps.classifications',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}


# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Authentication Backends
AUTHENTICATION_BACKENDS = [
    'apps.authentication.backends.EmailBackend',  # Custom email backend
    'django.contrib.auth.backends.ModelBackend',  # Default backend as fallback
]


# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'es-es'

TIME_ZONE = 'Europe/Madrid'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Cache Configuration — in-process per gunicorn worker.
# Sufficient for short-TTL read caches (e.g. /stats/overview/, /abstracts/ list).
# Each worker holds its own copy after fork; no cross-worker invalidation.
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'citscisort-default',
    }
}

# Redis / RQ (background jobs + scheduler).
# A single named queue, "citscisort_scheduler", backed by local Redis. The
# rqworker consumes it; rqscheduler enqueues the recurring jobs (e.g. the daily
# public stats snapshot). REDIS_URL is overridable per-environment.
#
# IMPORTANT: citscisort uses a dedicated Redis DB (db5) on the shared instance.
# rq-scheduler stores every scheduled job under a single non-namespaced key
# (rq:scheduler:scheduled_jobs) *per DB*, so two projects sharing a DB wipe each
# other's scheduled jobs on restart. The queue name does NOT isolate this — only
# the DB number does. Keep the /5 suffix.
REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/5')

RQ_QUEUES = {
    'citscisort_scheduler': {
        'URL': REDIS_URL,
        'DEFAULT_TIMEOUT': 600,
    },
}

# Name of the queue used for scheduled/background jobs. Referenced by the job
# enqueue helpers and the systemd worker/scheduler units.
RQ_SCHEDULER_QUEUE = 'citscisort_scheduler'

# Public project stats snapshot (cross-project "stats standard v1.0").
# Served read-only and unauthenticated at /.well-known/stats.json, regenerated
# once a day by a scheduled RQ job. See apps/classifications/stats.py.
PROJECT_STATS_IDENTITY = {
    'id': config('PROJECT_STATS_ID', default='citscisort'),
    'name': config('PROJECT_STATS_NAME', default='CitSciSort'),
    'url': config('PROJECT_STATS_URL', default='https://citscisort.ibercivis.es'),
}
PROJECT_STATS_SNAPSHOT_PATH = config(
    'PROJECT_STATS_SNAPSHOT_PATH',
    default=str(BASE_DIR / 'media' / 'stats.json'),
)

# Engagement (reminder) emails: re-engagement nudges and milestone
# congratulations, sent by a daily RQ job. Policy + eligibility rules live in
# apps/classifications/engagement.py; every send is logged in EngagementEmail.
# Disabled by default so a deploy never starts emailing people by accident —
# flip ENGAGEMENT_EMAILS_ENABLED=True in .env once the dry-run looks right:
#   python manage.py send_engagement_emails --dry-run
ENGAGEMENT_EMAILS_ENABLED = config('ENGAGEMENT_EMAILS_ENABLED', default=False, cast=bool)
ENGAGEMENT_EMAILS = {
    # Never more than one engagement email per person in this window
    # (transactional mail — verification, password reset, shares — is unaffected).
    'COOLDOWN_DAYS': 7,
    # Cap per daily run so switching this on (or a big sign-up wave) trickles
    # out over days instead of blasting everyone at once. Milestones go first,
    # then the most recently active people. None = no cap.
    'MAX_PER_RUN': 100,
    # Classification counts that earn a congratulations email. Only the highest
    # milestone reached is sent, and only if the person classified recently
    # (MILESTONE_RECENCY_DAYS) so we never backfill stale milestones.
    'MILESTONES': [10, 25, 50, 100, 250, 500, 1000],
    'MILESTONE_RECENCY_DAYS': 7,
    # Re-engagement schedule, in days since the reference date (sign-up date for
    # people who never classified; last classification for people who lapsed).
    # One email per entry, then silence for good.
    'NEVER_CLASSIFIED_ATTEMPT_DAYS': [7, 45],
    'LAPSED_ATTEMPT_DAYS': [14, 45],
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:3000', cast=Csv())
CORS_ALLOW_CREDENTIALS = True

# CSRF: Django validates the Origin header against this list for unsafe methods
# when using session auth. Defaults to CORS_ALLOWED_ORIGINS since the frontends
# that are allowed to make CORS requests should also be trusted for CSRF.
CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default=','.join(CORS_ALLOWED_ORIGINS),
    cast=Csv()
)

# Cookie domain: when the frontend and backend live on different subdomains of
# the same registrable domain (e.g. citscisort.ibercivis.es + citscisort-api.ibercivis.es),
# the cookie must be scoped to the parent domain so frontend JS can read the
# csrftoken and echo it in the X-CSRFToken header. Leave unset for local dev.
_cookie_domain = config('COOKIE_DOMAIN', default='')
if _cookie_domain:
    CSRF_COOKIE_DOMAIN = _cookie_domain
    SESSION_COOKIE_DOMAIN = _cookie_domain

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
        'apps.classifications.permissions.HasAcceptedLegal',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# Legal document versions (Terms of Service and Privacy Policy).
# Must be kept in sync with the frontend string that the user sees and confirms.
# Bump these when the documents change → every user will be asked to re-accept.
CURRENT_TERMS_VERSION = '04-26'
CURRENT_PRIVACY_VERSION = '04-26'


# DRF Spectacular (API Documentation)
SPECTACULAR_SETTINGS = {
    'TITLE': 'CitSciSort API',
    'DESCRIPTION': 'API for the citizen science classification platform CitSciSort',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# Django Sites Framework
SITE_ID = 1

# Site Configuration
SITE_NAME = config('SITE_NAME', default='CitSciSort')
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')
# Public base URL of this API (no trailing slash); used to build absolute links
# back to the API in emails, e.g. the one-click unsubscribe endpoint.
API_PUBLIC_URL = config('API_PUBLIC_URL', default='http://localhost:8000').rstrip('/')

# Django Allauth Configuration
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_EMAIL_VERIFICATION = config('ACCOUNT_EMAIL_VERIFICATION', default='mandatory')
ACCOUNT_CONFIRM_EMAIL_ON_GET = False  # Don't auto-confirm on GET, let frontend handle it
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = 3
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = True
ACCOUNT_EMAIL_CONFIRMATION_HMAC = True
ACCOUNT_ADAPTER = 'apps.authentication.adapter.CustomAccountAdapter'

# Email confirmation redirects (for frontend)
ACCOUNT_EMAIL_CONFIRMATION_ANONYMOUS_REDIRECT_URL = f'{FRONTEND_URL}/login'
ACCOUNT_EMAIL_CONFIRMATION_AUTHENTICATED_REDIRECT_URL = f'{FRONTEND_URL}/dashboard'

# Password reset configuration
PASSWORD_RESET_CONFIRM_URL = f'{FRONTEND_URL}/reset-password/{{uid}}/{{token}}'

# dj-rest-auth Configuration
REST_AUTH = {
    'USE_JWT': False,
    'SESSION_LOGIN': False,
    'REGISTER_SERIALIZER': 'apps.authentication.serializers.CustomRegisterSerializer',
    'REGISTER_PERMISSION_CLASSES': ('rest_framework.permissions.AllowAny',),
    'LOGIN_SERIALIZER': 'apps.authentication.serializers.CustomLoginSerializer',
    'PASSWORD_RESET_SERIALIZER': 'apps.authentication.serializers.CustomPasswordResetSerializer',
}

# Google OAuth Configuration
GOOGLE_CLIENT_ID = config('GOOGLE_CLIENT_ID', default='')
GOOGLE_CLIENT_SECRET = config('GOOGLE_CLIENT_SECRET', default='')

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'APP': {
            'client_id': GOOGLE_CLIENT_ID,
            'secret': GOOGLE_CLIENT_SECRET,
        },
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
    }
}

# Allow login without requiring a social app in the DB (use settings instead)
SOCIALACCOUNT_EMAIL_AUTHENTICATION = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True

OLD_PASSWORD_FIELD_ENABLED = True
LOGOUT_ON_PASSWORD_CHANGE = False

# Email Configuration with Amazon SES
EMAIL_BACKEND = config('EMAIL_BACKEND', default='config.email_backend.QuotedPrintableSESBackend')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@citscisort.com')

# AWS SES Configuration
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_SES_REGION_NAME = config('AWS_SES_REGION_NAME', default='eu-central-1')
AWS_SES_REGION_ENDPOINT = config('AWS_SES_REGION_ENDPOINT', default='email.eu-central-1.amazonaws.com')
AWS_SES_CONFIGURATION_SET = config('AWS_SES_CONFIGURATION_SET', default='')
USE_SES_V2 = config('USE_SES_V2', default=False, cast=bool)

# Security Settings for Production
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'db': {
            'class': 'django_db_logger.db_log_handler.DatabaseLogHandler',
            'level': 'WARNING',
        },
    },
    'loggers': {
        'apps.authentication': {
            'handlers': ['console', 'db'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'django_ses': {
            'handlers': ['console', 'db'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'django.core.mail': {
            'handlers': ['console', 'db'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'db'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console', 'db'],
        'level': 'INFO',
    },
}
