from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.db.models import Q, Count, F, Avg, Max, Min, Sum
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from datetime import timedelta
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample
from .models import (
    Category, UserProfile, Classification, ClassificationSession,
    GoldStandard, SavedAbstract, FollowedDebate, AbstractDebate, DebateComment, Notification, SharedDebate,
    Infrastructure, MetaAspectSuggestion, Keyword, WosCategory, Challenge, ChallengeParticipation
)
from .serializers import (
    CategorySerializer, CategoryListSerializer, ClassificationFlowCategorySerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    ClassificationSerializer, ClassificationCreateSerializer,
    ClassificationSessionSerializer, UserStatsSerializer, GoldStandardSerializer,
    GeneralStatsSerializer, MyStatsSerializer,
    SavedAbstractSerializer, SavedAbstractListSerializer, SavedAbstractUpdateSerializer,
    FollowedDebateSerializer, FollowedDebateListSerializer,
    PublicUserProfileSerializer,
    AbstractDebateSerializer, AbstractDebateListSerializer, AbstractDebateCreateSerializer,
    DebateCommentSerializer, DebateCommentCreateSerializer,
    NotificationSerializer, NotificationListSerializer, ShareDebateSerializer,
    InfrastructureSerializer, InfrastructureListSerializer,
    MetaAspectSuggestionSerializer, MetaAspectSuggestionListSerializer,
    HallOfFameSerializer,
    ChallengeSerializer, ChallengeParticipationSerializer,
)
from .permissions import IsOwnerOrReadOnly, IsGoldUserOrReadOnly, HasAcceptedLegal
from apps.abstracts.models import Abstract


class InfrastructureViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Infrastructure catalog — READ ONLY, public access.

    Query params:
      ?search=<q>    fuzzy search on name (pg_trgm) + alias icontains
      ?type=<type>   filter by type (platform/app/database/network/tool/other)
      ?verified=1    only verified entries

    Search ordering when ?search= is used:
      trigram similarity DESC, is_verified DESC, usage_count DESC, name ASC.
    Otherwise: is_verified DESC, usage_count DESC, name ASC.

    New entries are created implicitly via the classification endpoint, not here.
    """
    queryset = Infrastructure.objects.filter(is_active=True)
    serializer_class = InfrastructureListSerializer

    # Similarity threshold — matches above this score appear in results even
    # without a substring match. 0.15 is permissive; raise to 0.3 if noisy.
    TRIGRAM_THRESHOLD = 0.15

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return InfrastructureSerializer
        return InfrastructureListSerializer

    def get_queryset(self):
        from django.contrib.postgres.search import TrigramWordSimilarity

        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        infra_type = self.request.query_params.get('type')
        verified = self.request.query_params.get('verified')

        if search:
            qs = qs.annotate(
                sim=TrigramWordSimilarity(search, 'name')
            ).filter(
                Q(name__icontains=search)
                | Q(aliases__icontains=search)
                | Q(sim__gte=self.TRIGRAM_THRESHOLD)
            ).order_by('-sim', '-is_verified', '-usage_count', 'name')
        else:
            qs = qs.order_by('-is_verified', '-usage_count', 'name')

        if infra_type:
            qs = qs.filter(type=infra_type)
        if verified in ('1', 'true', 'True'):
            qs = qs.filter(is_verified=True)

        return qs


class MetaAspectSuggestionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for user-proposed meta-aspect suggestions — READ ONLY, public access.

    Query params:
      ?search=<q>    fuzzy search on name (pg_trgm)
      ?verified=1    only verified entries

    Ordering when ?search= is used:
      trigram similarity DESC, is_verified DESC, usage_count DESC, name ASC.
    Otherwise: is_verified DESC, usage_count DESC, name ASC.

    New entries are created implicitly via the classification endpoint.
    """
    queryset = MetaAspectSuggestion.objects.filter(is_active=True)
    serializer_class = MetaAspectSuggestionListSerializer

    TRIGRAM_THRESHOLD = 0.15

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MetaAspectSuggestionSerializer
        return MetaAspectSuggestionListSerializer

    def get_queryset(self):
        from django.contrib.postgres.search import TrigramWordSimilarity

        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        verified = self.request.query_params.get('verified')

        if search:
            qs = qs.annotate(
                sim=TrigramWordSimilarity(search, 'name')
            ).filter(
                Q(name__icontains=search) | Q(sim__gte=self.TRIGRAM_THRESHOLD)
            ).order_by('-sim', '-is_verified', '-usage_count', 'name')
        else:
            qs = qs.order_by('-is_verified', '-usage_count', 'name')

        if verified in ('1', 'true', 'True'):
            qs = qs.filter(is_verified=True)

        return qs


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for categories - READ ONLY, NO AUTHENTICATION REQUIRED
    list: Get all active categories
    retrieve: Get a specific category
    by_type: Get categories by type
    """
    queryset = Category.objects.filter(is_active=True)
    
    def get_serializer_class(self):
        if self.action == 'list' or self.action == 'by_type':
            return CategoryListSerializer
        return CategorySerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        category_type = self.request.query_params.get('type', None)
        
        if category_type:
            queryset = queryset.filter(category_type=category_type)
        
        return queryset.order_by('category_type', 'order', 'name')
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get categories grouped by type"""
        category_type = request.query_params.get('type')
        
        if not category_type:
            return Response(
                {'error': 'type parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        categories = self.get_queryset().filter(category_type=category_type)
        serializer = self.get_serializer(categories, many=True)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def classification_flow(self, request):
        """Get the complete classification flow with conditional logic"""
        # Get all root categories (main classification)
        main_categories = Category.objects.filter(
            category_type='main',
            is_active=True
        ).order_by('order')
        
        # Get meta-research aspects
        meta_aspects = Category.objects.filter(
            category_type='meta_aspect',
            is_active=True
        ).order_by('order')
        
        flow = {
            'main': ClassificationFlowCategorySerializer(main_categories, many=True).data,
            'meta_aspects': ClassificationFlowCategorySerializer(meta_aspects, many=True).data,
        }

        return Response(flow)


class UserProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for user profiles
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated, HasAcceptedLegal]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return UserProfile.objects.all()
        return UserProfile.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's profile"""
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get detailed statistics for current user"""
        profile = UserProfile.objects.get(user=request.user)
        
        # Get classification counts
        total_classifications = Classification.objects.filter(
            user=request.user,
            is_valid=True
        ).count()
        
        training_classifications = Classification.objects.filter(
            user=request.user,
            is_training=True,
            is_valid=True
        ).count()
        
        regular_classifications = total_classifications - training_classifications
        
        # Calculate rank
        rank = UserProfile.objects.filter(
            total_classifications__gt=profile.total_classifications
        ).count() + 1
        
        total_users = UserProfile.objects.filter(total_classifications__gt=0).count()
        
        stats = {
            'total_classifications': total_classifications,
            'training_classifications': training_classifications,
            'regular_classifications': regular_classifications,
            'reliability_score': profile.reliability_score,
            'agreement_with_gold': profile.agreement_with_gold,
            'level': profile.level,
            'points': profile.points,
            'badges': profile.badges,
            'rank': rank,
            'total_users': total_users,
        }
        
        serializer = UserStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        """Get top users leaderboard - only shows public profiles"""
        limit = int(request.query_params.get('limit', 10))

        top_users = UserProfile.objects.filter(
            total_classifications__gt=0,
            is_profile_public=True
        ).select_related('user').order_by('-points', '-total_classifications')[:limit]

        serializer = PublicUserProfileSerializer(top_users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def hall_of_fame(self, request):
        """
        Paginated Hall of Fame — 20 entries per page.

        Includes every user with at least one classification. Profiles that
        opted in (`is_profile_public=True`) show name/institution/country;
        everyone else appears as 'Anonymous'. Ordered by points then number
        of classifications. Includes `delta_last_day`: classifications added
        by that user in the last 24h.
        """
        since_24h = timezone.now() - timedelta(days=1)
        queryset = UserProfile.objects.filter(
            total_classifications__gt=0
        ).select_related('user').annotate(
            delta_last_day=Count(
                'user__user_classifications',
                filter=Q(
                    user__user_classifications__created_at__gte=since_24h,
                    user__user_classifications__is_valid=True,
                ),
            ),
        ).order_by('-points', '-total_classifications', 'id')

        my_position = self._compute_hall_of_fame_position(request.user)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = HallOfFameSerializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['my_position'] = my_position
            return response

        serializer = HallOfFameSerializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'my_position': my_position,
        })

    def _compute_hall_of_fame_position(self, user):
        """
        Caller's rank in the Hall of Fame, or None if they have no
        classifications. Matches the ordering used by `hall_of_fame`:
        (-points, -total_classifications, id).
        """
        profile = UserProfile.objects.filter(user=user).first()
        if not profile or profile.total_classifications <= 0:
            return None

        ahead_count = UserProfile.objects.filter(
            total_classifications__gt=0
        ).filter(
            Q(points__gt=profile.points)
            | Q(points=profile.points,
                total_classifications__gt=profile.total_classifications)
            | Q(points=profile.points,
                total_classifications=profile.total_classifications,
                id__lt=profile.id)
        ).count()
        return ahead_count + 1
    
    @extend_schema(
        request=UserProfileUpdateSerializer,
        responses={200: UserProfileSerializer},
        description="Update current user's profile settings (name, country, institution, visibility and opt-ins)."
    )
    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """
        Update current user's profile settings
        PATCH /api/profiles/update_profile/

        Editable fields:
        - first_name, last_name: strings
        - country: ISO 3166 country code (e.g., "ES", "US", "FR")
        - institution: Institution name (string)
        - is_profile_public: show profile in public leaderboards/stats (boolean)
        - wants_in_acknowledgments: opt-in to appear in platform/paper acknowledgments (boolean)
        - wants_paper_collaboration: opt-in for potential research paper collaboration (boolean)
        - newsletter_opt_in: opt-in to receive the project newsletter by email (boolean)
        - activity_emails_opt_in: receive reminder/milestone emails about your own activity (boolean, default true)
        """
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        
        serializer = UserProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def countries(self, request):
        """
        Get list of all available countries (ISO 3166)
        GET /api/profiles/countries/

        Returns list of countries with code and name for dropdown selector
        REQUIRES AUTHENTICATION
        """
        from django_countries import countries

        countries_list = [
            {'code': code, 'name': name}
            for code, name in countries
        ]

        return Response({
            'countries': countries_list,
            'total': len(countries_list)
        })

    @action(detail=False, methods=['get'])
    def backgrounds(self, request):
        """
        Get list of academic-background choices for the profile dropdown.
        GET /api/profiles/backgrounds/
        """
        return Response({
            'backgrounds': [
                {'code': code, 'name': name}
                for code, name in UserProfile.BACKGROUND_CHOICES
            ],
            'total': len(UserProfile.BACKGROUND_CHOICES),
        })


class ClassificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for classifications
    - Only authenticated users can access
    - Users can only see their own classifications
    - Cannot update or delete classifications (immutable after creation)
    """
    permission_classes = [IsAuthenticated, HasAcceptedLegal, IsOwnerOrReadOnly]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ClassificationCreateSerializer
        return ClassificationSerializer
    
    def get_queryset(self):
        """Users can only see their own classifications"""
        if self.request.user.is_staff:
            return Classification.objects.all().select_related('user', 'abstract')
        return Classification.objects.filter(user=self.request.user).select_related('abstract')
    
    def create(self, request, *args, **kwargs):
        """Create a new classification"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # Check if user already classified this abstract
        abstract = serializer.validated_data['abstract']
        if Classification.objects.filter(
            user=request.user,
            abstract=abstract
        ).exists():
            return Response(
                {'error': 'You have already classified this abstract'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        
        return Response(
            ClassificationSerializer(serializer.instance).data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def update(self, request, *args, **kwargs):
        """Prevent updating classifications"""
        return Response(
            {'error': 'Classifications cannot be modified once created'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    def partial_update(self, request, *args, **kwargs):
        """Prevent partial updating classifications"""
        return Response(
            {'error': 'Classifications cannot be modified once created'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    def destroy(self, request, *args, **kwargs):
        """Prevent deleting classifications"""
        return Response(
            {'error': 'Classifications cannot be deleted'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    @action(detail=False, methods=['get'])
    def next_abstract(self, request):
        """
        Get the next abstract to classify for the current user.
        Smart assignment algorithm prioritizes:
        1. Abstracts with fewer classifications
        2. Avoids abstracts already classified by this user
        3. Balances gold vs regular abstracts

        Optional `?challenge=<id>` scopes the pool to a Reto/Challenge (a keyword
        or journal). Without it, the queue is the global pool as before.
        """
        user = request.user
        user_profile, _ = UserProfile.objects.get_or_create(user=user)

        # Optional challenge scoping
        challenge = None
        challenge_id = request.query_params.get('challenge')
        if challenge_id:
            try:
                challenge = Challenge.objects.get(id=challenge_id, is_active=True)
            except (Challenge.DoesNotExist, ValueError):
                return Response(
                    {'error': 'Challenge not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Get abstracts already classified by this user
        classified_ids = Classification.objects.filter(
            user=user
        ).values_list('abstract_id', flat=True)

        # Filter available abstracts
        available_abstracts = Abstract.objects.filter(
            is_active=True
        ).exclude(
            id__in=classified_ids
        ).annotate(
            classifications_count=Count('classifications')
        )

        # Scope to the challenge, if any. Classifying inside a specific
        # (keyword/journal) challenge requires explicit membership — you must
        # join before you can pull scoped work. The General pool stays open to
        # everyone. (Note: this only gates *getting scoped work*; a classification
        # still counts towards every challenge its abstract belongs to, joined or
        # not — that happens via the global stats, not here.)
        if challenge is not None:
            if challenge.challenge_type != Challenge.TYPE_GENERAL:
                is_member = ChallengeParticipation.objects.filter(
                    user=user, challenge=challenge
                ).exists()
                if not is_member:
                    return Response(
                        {
                            'error': 'You must join this challenge before classifying in it',
                            'code': 'challenge_join_required',
                            'challenge_id': challenge.id,
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
            available_abstracts = available_abstracts.filter(
                id__in=challenge.get_abstract_queryset().values_list('id', flat=True)
            )
            # Pulling work from a joined challenge counts as activity.
            ChallengeParticipation.objects.filter(
                user=user, challenge=challenge
            ).update(last_activity_at=timezone.now())

        # Priority 1: Gold standard abstracts for training (if user hasn't completed training)
        if not user_profile.completed_training and user_profile.is_gold_user:
            gold_abstracts = available_abstracts.filter(
                is_gold_standard=True,
                gold_classifications_complete=True
            )
            if gold_abstracts.exists():
                abstract = gold_abstracts.order_by('classifications_count', '?').first()
                from apps.abstracts.serializers import AbstractSerializer
                return Response({
                    'abstract': AbstractSerializer(abstract).data,
                    'is_training': True,
                    'message': 'Training abstract - your classification will be compared with gold standard'
                })
        
        # Priority 2: Abstracts needing more classifications (haven't reached consensus)
        priority_abstracts = available_abstracts.filter(
            current_classifications_count__lt=F('required_classifications')
        ).order_by('current_classifications_count', '?')
        
        if priority_abstracts.exists():
            abstract = priority_abstracts.first()
            from apps.abstracts.serializers import AbstractSerializer
            payload = {
                'abstract': AbstractSerializer(abstract).data,
                'is_training': False,
                'progress': {
                    'current': abstract.current_classifications_count,
                    'required': abstract.required_classifications
                }
            }
            if challenge is not None:
                payload['challenge'] = {
                    'id': challenge.id,
                    'title': challenge.title,
                    'challenge_type': challenge.challenge_type,
                    'stats': challenge.live_stats(user=user),
                }
            return Response(payload)

        # No more abstracts available (for this scope)
        if challenge is not None:
            return Response({
                'message': f'No more abstracts to classify in challenge "{challenge.title}"',
                'completed': True,
                'challenge': {
                    'id': challenge.id,
                    'title': challenge.title,
                    'challenge_type': challenge.challenge_type,
                    'stats': challenge.live_stats(user=user),
                },
            }, status=status.HTTP_200_OK)
        return Response(
            {
                'message': 'No more abstracts available to classify',
                'completed': True
            },
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'])
    def submit(self, request):
        """
        Alias for create endpoint - submit a new classification
        """
        return self.create(request)
    
    @action(detail=False, methods=['get'])
    def my_classifications(self, request):
        """Get all classifications by current user"""
        classifications = Classification.objects.filter(
            user=request.user
        ).select_related('abstract').order_by('-created_at')
        
        page = self.paginate_queryset(classifications)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(classifications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_stats(self, request):
        """Get statistics for current user's classifications"""
        user = request.user
        user_profile, _ = UserProfile.objects.get_or_create(user=user)
        
        classifications = Classification.objects.filter(user=user, is_valid=True)
        
        stats = {
            'total_classifications': classifications.count(),
            'training_classifications': classifications.filter(is_training=True).count(),
            'regular_classifications': classifications.filter(is_training=False).count(),
            'is_gold_user': user_profile.is_gold_user,
            'reliability_score': user_profile.reliability_score,
            'agreement_with_gold': user_profile.agreement_with_gold,
            'completed_training': user_profile.completed_training,
            'points': user_profile.points,
            'level': user_profile.level,
            'badges': user_profile.badges,
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def abstract_classifications(self, request):
        """
        GET /api/classifications/abstract_classifications/?abstract_id=123
        
        Get classification statistics for a specific abstract
        Returns aggregated data: total, by_category, meta_aspects
        Each with count, percentage, and display_name
        REQUIRES AUTHENTICATION
        """
        from collections import Counter
        
        abstract_id = request.query_params.get('abstract_id')
        
        if not abstract_id:
            return Response(
                {'error': 'abstract_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if abstract exists
        try:
            abstract = Abstract.objects.get(id=abstract_id, is_active=True)
        except Abstract.DoesNotExist:
            return Response(
                {'error': 'Abstract not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all valid classifications for this abstract
        classifications = Classification.objects.filter(
            abstract=abstract,
            is_valid=True
        )
        
        if not classifications.exists():
            return Response({
                'abstract_id': abstract_id,
                'abstract_title': abstract.title,
                'total': 0,
                'by_category': {},
                'meta_aspects': {}
            })
        
        # Build category code -> name mapping
        categories = Category.objects.all()
        category_names = {cat.code: cat.name for cat in categories}
        
        # Aggregate classifications using Counter
        main_counter = Counter()
        meta_counter = Counter()
        
        for c in classifications:
            main_counter[c.main_classification] += 1
            if c.meta_aspects:
                for aspect in c.meta_aspects:
                    meta_counter[aspect] += 1
        
        total = classifications.count()
        
        # Build response with count, percentage, display_name
        by_category = {
            category: {
                'count': count,
                'percentage': round((count / total * 100), 1),
                'display_name': category_names.get(category, category)
            }
            for category, count in main_counter.items()
        }
        
        meta_aspects = {
            aspect: {
                'count': count,
                'percentage': round((count / total * 100), 1),
                'display_name': category_names.get(aspect, aspect)
            }
            for aspect, count in meta_counter.items()
        }
        
        return Response({
            'abstract_id': abstract_id,
            'abstract_title': abstract.title,
            'total': total,
            'by_category': by_category,
            'meta_aspects': meta_aspects
        })
    
    @action(detail=False, methods=['get'])
    def activity_feed(self, request):
        """
        GET /api/classifications/activity_feed/?limit=20&minutes=1440
        
        Mixed feed with classifications, debates, milestones, and progress updates
        Keeps feed interesting even with low activity
        GDPR-compliant: anonymous/semi-anonymous display
        REQUIRES AUTHENTICATION
        """
        limit = int(request.query_params.get('limit', 20))
        minutes = int(request.query_params.get('minutes', 1440))  # Default: last 24 hours
        
        time_threshold = timezone.now() - timedelta(minutes=minutes)
        feed_items = []
        
        # 1. Recent classifications
        recent_classifications = Classification.objects.filter(
            created_at__gte=time_threshold,
            user__isnull=False  # Only get classifications with non-null users
        ).select_related('abstract', 'user', 'user__classification_profile').order_by('-created_at')[:limit]
        
        for c in recent_classifications:
            # Show display name if profile is public, otherwise anonymize
            try:
                profile = c.user.classification_profile
                if profile.is_profile_public:
                    user_display_name = profile.get_display_name()
                else:
                    user_display_name = "Anonymous"
            except UserProfile.DoesNotExist:
                user_display_name = "Anonymous"
            
            main_category = c.main_classification.replace('main_', '')
            
            feed_items.append({
                'type': 'classification',
                'id': f"class_{c.id}",
                'user_display_name': user_display_name,
                'abstract_title': c.abstract.title,
                'abstract_id': c.abstract.id,
                'category': main_category,
                'time_ago': self._time_ago(c.created_at),
                'timestamp': c.created_at.isoformat()
            })
        
        # 1b. Recent debates
        recent_debates = AbstractDebate.objects.filter(
            created_at__gte=time_threshold
        ).select_related('initiator', 'initiator__classification_profile', 'abstract').order_by('-created_at')[:limit]
        
        for d in recent_debates:
            # Show display name if profile is public, otherwise anonymize
            try:
                profile = d.initiator.classification_profile
                if profile.is_profile_public:
                    user_display_name = profile.get_display_name()
                else:
                    user_display_name = "Anonymous"
            except UserProfile.DoesNotExist:
                user_display_name = "Anonymous"
            
            feed_items.append({
                'type': 'debate',
                'id': f"debate_{d.id}",
                'debate_id': d.id,
                'user_display_name': user_display_name,
                'abstract_title': d.abstract.title,
                'abstract_id': d.abstract.id,
                'debate_text': d.text[:100] + '...' if len(d.text) > 100 else d.text,
                'comments_count': d.comments_count,
                'time_ago': self._time_ago(d.created_at),
                'timestamp': d.created_at.isoformat()
            })
        
        # 2. Check for user milestones
        milestone_values = [1, 5, 10, 25, 50, 100, 250, 500]
        
        milestone_users_seen = set()
        for c in recent_classifications:
            if c.user.id in milestone_users_seen:
                continue
                
            # Count total for this user
            user_total = Classification.objects.filter(
                user=c.user,
                created_at__lte=c.created_at
            ).count()
            
            if user_total in milestone_values:
                milestone_users_seen.add(c.user.id)
                
                # Show display name if profile is public, otherwise anonymize
                try:
                    profile = c.user.classification_profile
                    if profile.is_profile_public:
                        user_display_name = profile.get_display_name()
                    else:
                        user_display_name = "Anonymous"
                except UserProfile.DoesNotExist:
                    user_display_name = "Anonymous"
                
                feed_items.append({
                    'type': 'milestone',
                    'id': f"milestone_{c.user.id}_{user_total}",
                    'user_display_name': user_display_name,
                    'message': f"reached {user_total} classifications",
                    'milestone_count': user_total,
                    'time_ago': self._time_ago(c.created_at),
                    'timestamp': c.created_at.isoformat()
                })
        
        # 3. Global progress milestones (every 100 classifications)
        total_classifications = Classification.objects.count()
        last_hundred_mark = (total_classifications // 100) * 100
        
        if last_hundred_mark > 0:
            classifications_over = total_classifications - last_hundred_mark
            if classifications_over < limit:
                try:
                    crossing_classification = Classification.objects.order_by('-created_at')[classifications_over]
                    if crossing_classification.created_at >= time_threshold:
                        feed_items.append({
                            'type': 'global_milestone',
                            'id': f"global_{last_hundred_mark}",
                            'message': f"Community reached {last_hundred_mark} total classifications",
                            'count': last_hundred_mark,
                            'time_ago': self._time_ago(crossing_classification.created_at),
                            'timestamp': crossing_classification.created_at.isoformat()
                        })
                except IndexError:
                    pass  # Not enough classifications yet
        
        # Sort all items by timestamp
        feed_items.sort(key=lambda x: x['timestamp'], reverse=True)
        feed_items = feed_items[:limit]
        
        # Live activity summary (only recent activity stats)
        fifteen_min_ago = timezone.now() - timedelta(minutes=15)
        today = timezone.now().date()
        
        active_users_now = Classification.objects.filter(
            created_at__gte=fifteen_min_ago
        ).values('user').distinct().count()
        
        summary = {
            'active_users_now': active_users_now,
            'classifications_last_15min': Classification.objects.filter(
                created_at__gte=fifteen_min_ago
            ).count(),
            'classifications_today': Classification.objects.filter(
                created_at__date=today
            ).count()
        }
        
        return Response({
            'feed': feed_items,
            'summary': summary,
            'message': self._get_activity_message(active_users_now),
            'timestamp': timezone.now().isoformat()
        })
    
    @action(detail=False, methods=['get'])
    def pulse(self, request):
        """
        GET /api/classifications/pulse/
        
        Quick stats about current activity (lightweight endpoint for polling)
        Can be called frequently (every 30-60s) to update live indicators
        REQUIRES AUTHENTICATION
        """
        now = timezone.now()
        fifteen_min_ago = now - timedelta(minutes=15)
        today = now.date()
        
        active_users = Classification.objects.filter(
            created_at__gte=fifteen_min_ago
        ).values('user').distinct().count()
        
        pulse = {
            'active_users_now': active_users,
            'classifications_last_15min': Classification.objects.filter(
                created_at__gte=fifteen_min_ago
            ).count(),
            'classifications_today': Classification.objects.filter(
                created_at__date=today
            ).count(),
            'timestamp': now.isoformat(),
            'message': self._get_activity_message(active_users)
        }
        
        return Response(pulse)
    
    def _time_ago(self, dt):
        """Helper to show relative time"""
        now = timezone.now()
        diff = now - dt
        seconds = diff.total_seconds()
        
        if seconds < 60:
            return "just now"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes}m ago"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours}h ago"
        else:
            days = diff.days
            if days == 1:
                return "yesterday"
            elif days < 7:
                return f"{days}d ago"
            else:
                return dt.strftime("%b %d")
    
    def _get_activity_message(self, active_count):
        """Get encouraging message based on current activity"""
        if active_count == 0:
            return "Be the first to classify today"
        elif active_count == 1:
            return "You're making progress"
        elif active_count < 5:
            return f"{active_count} people are working together right now"
        else:
            return f"{active_count} people are actively classifying"


class ClassificationSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for classification sessions
    """
    serializer_class = ClassificationSessionSerializer
    permission_classes = [IsAuthenticated, HasAcceptedLegal]
    
    def get_queryset(self):
        return ClassificationSession.objects.filter(
            user=self.request.user
        ).order_by('-started_at')
    
    def create(self, request, *args, **kwargs):
        """Start a new classification session"""
        # Check if there's an active session
        active_session = ClassificationSession.objects.filter(
            user=request.user,
            ended_at__isnull=True
        ).first()
        
        if active_session:
            serializer = self.get_serializer(active_session)
            return Response(serializer.data)
        
        # Create new session
        session = ClassificationSession.objects.create(user=request.user)
        serializer = self.get_serializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def end_session(self, request, pk=None):
        """End a classification session"""
        session = self.get_object()
        
        if session.ended_at:
            return Response(
                {'error': 'Session already ended'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session.ended_at = timezone.now()
        
        # Update session stats
        classifications_in_session = Classification.objects.filter(
            user=request.user,
            created_at__gte=session.started_at,
            created_at__lte=session.ended_at
        )
        
        session.classifications_count = classifications_in_session.count()
        session.total_time_seconds = sum(
            c.time_spent_seconds for c in classifications_in_session
        )
        
        session.save()
        
        serializer = self.get_serializer(session)
        return Response(serializer.data)


@method_decorator(cache_page(60 * 5), name='get')
class GeneralStatsView(views.APIView):
    """
    GET /api/stats/overview/
    Public endpoint for general statistics (GDPR-compliant, anonymous).
    Response cached for 5 minutes per gunicorn worker.
    """
    permission_classes = [AllowAny]
    serializer_class = GeneralStatsSerializer

    def get(self, request):
        """Get general project statistics"""
        from django.db.models import Count as DjangoCount
        
        # Get abstracts with dynamic classification count
        abstracts = Abstract.objects.filter(is_active=True).annotate(
            classifications_count=DjangoCount('classifications', filter=Q(classifications__is_valid=True))
        )
        
        # Project overview with improved metrics
        total_abstracts = abstracts.count()
        completed_abstracts = abstracts.filter(
            classifications_count__gte=F('required_classifications')
        ).count()
        in_progress_abstracts = total_abstracts - completed_abstracts
        
        # Calculate total classifications needed (abstracts * replicas)
        total_classifications_needed = sum(a.required_classifications for a in abstracts)
        
        # Get actual completed classifications count
        completed_classifications = Classification.objects.filter(is_valid=True).count()
        
        # Calculate percentages
        abstracts_percentage = round(
            (completed_abstracts / total_abstracts * 100) if total_abstracts > 0 else 0,
            1
        )
        classifications_percentage = round(
            (completed_classifications / total_classifications_needed * 100) if total_classifications_needed > 0 else 0,
            1
        )
        
        # Activity statistics
        # Use UTC consistently for cross-timezone fairness
        now_utc = timezone.now()
        today = now_utc.date()
        week_ago = today - timedelta(days=7)
        
        total_classifiers = Classification.objects.values('user').distinct().count()
        active_today = Classification.objects.filter(
            created_at__date=today
        ).values('user').distinct().count()
        active_this_week = Classification.objects.filter(
            created_at__date__gte=week_ago
        ).values('user').distinct().count()
        classifications_today = Classification.objects.filter(
            created_at__date=today
        ).count()
        classifications_this_week = Classification.objects.filter(
            created_at__date__gte=week_ago
        ).count()
        
        # Distribution by main category
        main_distribution = {}
        main_counts = Classification.objects.values('main_classification').annotate(
            count=Count('id')
        )
        total_for_percentage = sum(item['count'] for item in main_counts)
        
        for item in main_counts:
            code = item['main_classification']
            count = item['count']
            percentage = round((count / total_for_percentage * 100) if total_for_percentage > 0 else 0, 1)
            # Remove 'main_' prefix for cleaner display
            display_code = code.replace('main_', '') if code.startswith('main_') else code
            main_distribution[display_code] = {
                'count': count,
                'percentage': percentage
            }
        
        # Distribution by meta aspects
        from django.db.models import JSONField
        from django.contrib.postgres.aggregates import ArrayAgg
        
        meta_distribution = {}
        # Get all classifications with meta_aspects
        classifications_with_meta = Classification.objects.exclude(
            meta_aspects=[]
        ).exclude(
            meta_aspects__isnull=True
        )
        
        # Count each meta aspect
        for classification in classifications_with_meta:
            if classification.meta_aspects:
                for aspect in classification.meta_aspects:
                    meta_distribution[aspect] = meta_distribution.get(aspect, 0) + 1
        
        # Progress tracking - distribution by classification count
        abstracts_by_count = {}
        
        # Count abstracts by classification count (0 to 9, then 10+)
        for i in range(10):
            count = abstracts.filter(classifications_count=i).count()
            if count > 0:
                abstracts_by_count[str(i)] = count
        
        # Count abstracts with 10+ classifications
        count_10_plus = abstracts.filter(classifications_count__gte=10).count()
        if count_10_plus > 0:
            abstracts_by_count['10+'] = count_10_plus
        
        avg_classifications = abstracts.aggregate(
            avg=Avg('classifications_count')
        )['avg'] or 0
        
        # Cumulative progress over time (daily)
        # Get first classification date
        first_classification = Classification.objects.order_by('created_at').first()
        
        cumulative_data = []
        if first_classification:
            # Use UTC consistently for all date calculations
            start_date = first_classification.created_at.date()
            current_date = start_date
            
            # Get the last classification to determine the actual end date
            last_classification = Classification.objects.filter(is_valid=True).order_by('-created_at').first()
            if last_classification:
                # Add 1 day to catch classifications from users in ahead timezones
                end_date = last_classification.created_at.date() + timedelta(days=1)
            else:
                end_date = timezone.now().date()
            
            while current_date <= end_date:
                # Count total classifications up to and including this date (cumulative)
                classifications_count = Classification.objects.filter(
                    created_at__date__lte=current_date,
                    is_valid=True
                ).count()
                
                # Count completed abstracts up to this date (cumulative)
                # For each abstract, check if it had enough classifications by this date
                abstracts_at_date = Abstract.objects.filter(is_active=True).annotate(
                    classifications_until_date=DjangoCount(
                        'classifications',
                        filter=Q(
                            classifications__created_at__date__lte=current_date,
                            classifications__is_valid=True
                        )
                    )
                )
                
                # Count abstracts that reached required classifications by this date
                completed_count = abstracts_at_date.filter(
                    classifications_until_date__gte=F('required_classifications')
                ).count()
                
                cumulative_data.append({
                    'date': current_date.isoformat(),
                    'classifications': classifications_count,
                    'completed_abstracts': completed_count
                })
                
                current_date += timedelta(days=1)
        
        data = {
            'project': {
                'total_abstracts': total_abstracts,
                'completed_abstracts': completed_abstracts,
                'in_progress_abstracts': in_progress_abstracts,
                'abstracts_percentage': abstracts_percentage,
                'total_classifications_needed': total_classifications_needed,
                'completed_classifications': completed_classifications,
                'classifications_percentage': classifications_percentage
            },
            'activity': {
                'total_classifiers': total_classifiers,
                'active_today': active_today,
                'active_this_week': active_this_week,
                'classifications_today': classifications_today,
                'classifications_this_week': classifications_this_week
            },
            'distribution': {
                'by_main_category': main_distribution,
                'by_meta_aspect': meta_distribution
            },
            'progress': {
                'abstracts_by_classification_count': abstracts_by_count,
                'average_classifications_per_abstract': round(avg_classifications, 1),
                'cumulative_over_time': cumulative_data
            }
        }
        
        serializer = self.serializer_class(data)
        return Response(serializer.data)


class AbstractStatsView(views.APIView):
    """
    GET /api/stats/abstracts/
    Public endpoint for abstract metadata statistics
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Get abstract distribution statistics"""
        from collections import Counter
        
        abstracts = Abstract.objects.filter(is_active=True)
        
        # 1. Distribution by year
        by_year = abstracts.values('publication_year').annotate(
            count=Count('id')
        ).order_by('-publication_year')
        
        year_distribution = {
            str(item['publication_year']): item['count'] 
            for item in by_year 
            if item['publication_year']
        }
        
        # 2. Distribution by publication type
        by_type = abstracts.values('publication_type').annotate(
            count=Count('id')
        )
        
        type_distribution = {}
        type_mapping = dict(Abstract.PUBLICATION_TYPE_CHOICES)
        for item in by_type:
            type_code = item['publication_type']
            type_distribution[type_mapping.get(type_code, type_code)] = item['count']
        
        # 3. Top journals (top 20)
        by_journal = abstracts.exclude(journal='').values('journal').annotate(
            count=Count('id')
        ).order_by('-count')[:20]
        
        journal_distribution = {
            item['journal']: item['count'] 
            for item in by_journal
        }
        
        # 4. Distribution by times cited (ranges)
        citation_ranges = {
            '0': abstracts.filter(times_cited=0).count(),
            '1-10': abstracts.filter(times_cited__gte=1, times_cited__lte=10).count(),
            '11-50': abstracts.filter(times_cited__gte=11, times_cited__lte=50).count(),
            '51-100': abstracts.filter(times_cited__gte=51, times_cited__lte=100).count(),
            '100+': abstracts.filter(times_cited__gt=100).count(),
        }
        
        # 5. Average citations per year
        avg_by_year = abstracts.values('publication_year').annotate(
            avg_citations=Avg('times_cited'),
            count=Count('id')
        ).order_by('-publication_year')
        
        citations_by_year = {
            str(item['publication_year']): {
                'average': round(item['avg_citations'], 1),
                'count': item['count']
            }
            for item in avg_by_year 
            if item['publication_year']
        }
        
        # 7. Distribution by WoS categories (top 30)
        wos_cat_counter = Counter()
        for abstract in abstracts.exclude(wos_categories=''):
            categories = [cat.strip() for cat in abstract.wos_categories.split(';') if cat.strip()]
            wos_cat_counter.update(categories)
        
        wos_categories_distribution = dict(wos_cat_counter.most_common(30))
        
        # 8. Distribution by research areas (top 30)
        research_area_counter = Counter()
        for abstract in abstracts.exclude(research_areas=''):
            areas = [area.strip() for area in abstract.research_areas.split(';') if area.strip()]
            research_area_counter.update(areas)
        
        research_areas_distribution = dict(research_area_counter.most_common(30))
        
        # 9. Distribution by keywords (top 50) - count unique abstracts per keyword
        keyword_abstracts = {}
        abstracts_with_keywords = 0
        for abstract in abstracts:
            if abstract.keywords and abstract.keywords.strip():
                abstracts_with_keywords += 1
                keywords = set([kw.strip().lower() for kw in abstract.keywords.split(';') if kw.strip()])
                for kw in keywords:
                    keyword_abstracts[kw] = keyword_abstracts.get(kw, 0) + 1
        
        # Sort by count and get top 50
        sorted_keywords = sorted(keyword_abstracts.items(), key=lambda x: x[1], reverse=True)[:50]
        keywords_distribution = dict(sorted_keywords)
        
        # 10. Classification status distribution
        status_distribution = {
            'pending': abstracts.filter(current_classifications_count=0).count(),
            'in_progress': abstracts.filter(
                current_classifications_count__gt=0,
                current_classifications_count__lt=F('required_classifications')
            ).count(),
            'completed': abstracts.filter(
                current_classifications_count__gte=F('required_classifications')
            ).count(),
            'consensus_reached': abstracts.filter(consensus_reached=True).count(),
        }
        
        # 11. Overall citation statistics
        citation_stats = abstracts.aggregate(
            total_citations=Count('times_cited'),
            avg_citations=Avg('times_cited'),
            max_citations=Max('times_cited'),
            min_citations=Min('times_cited')
        )
        
        data = {
            'overview': {
                'total_abstracts': abstracts.count(),
                'with_citations': abstracts.filter(times_cited__gt=0).count(),
                'with_keywords': abstracts_with_keywords,
                'with_wos_categories': abstracts.exclude(wos_categories='').count(),
                'with_research_areas': abstracts.exclude(research_areas='').count(),
            },
            'by_year': year_distribution,
            'by_publication_type': type_distribution,
            'by_journal': journal_distribution,
            'by_citation_range': citation_ranges,
            'citations_by_year': citations_by_year,
            'citation_stats': {
                'average': round(citation_stats['avg_citations'] or 0, 1),
                'max': citation_stats['max_citations'] or 0,
                'min': citation_stats['min_citations'] or 0
            },
            'by_wos_category': wos_categories_distribution,
            'by_research_area': research_areas_distribution,
            'by_keyword': keywords_distribution,
            'by_classification_status': status_distribution,
        }
        
        return Response(data)


class MyStatsView(views.APIView):
    """
    GET /api/stats/me/
    Personal statistics for authenticated user (GDPR-compliant)
    """
    permission_classes = [IsAuthenticated, HasAcceptedLegal]
    serializer_class = MyStatsSerializer
    
    def get(self, request):
        """Get personal statistics for the authenticated user"""
        user = request.user
        
        # Get user's classifications
        user_classifications = Classification.objects.filter(user=user)
        
        # Overview
        total_classifications = user_classifications.count()
        
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        classifications_today = user_classifications.filter(
            created_at__date=today
        ).count()
        classifications_this_week = user_classifications.filter(
            created_at__date__gte=week_ago
        ).count()
        classifications_this_month = user_classifications.filter(
            created_at__date__gte=month_ago
        ).count()
        
        # Time statistics
        time_stats = user_classifications.aggregate(
            avg=Avg('time_spent_seconds'),
            min=Min('time_spent_seconds'),
            max=Max('time_spent_seconds')
        )
        
        # Get user profile
        try:
            profile = UserProfile.objects.get(user=user)
            is_gold_user = profile.is_gold_user
        except UserProfile.DoesNotExist:
            is_gold_user = False
        
        overview = {
            'total_classifications': total_classifications,
            'classifications_today': classifications_today,
            'classifications_this_week': classifications_this_week,
            'classifications_this_month': classifications_this_month,
            'average_time_seconds': round(time_stats['avg'] or 0, 1),
            'fastest_time_seconds': time_stats['min'] or 0,
            'is_gold_user': is_gold_user
        }
        
        # My classifications by category
        my_main_category = {}
        main_counts = user_classifications.values('main_classification').annotate(
            count=Count('id')
        )
        for item in main_counts:
            my_main_category[item['main_classification']] = item['count']
        
        # My classifications by meta aspect
        my_meta_aspects = {}
        classifications_with_meta = user_classifications.exclude(
            meta_aspects=[]
        ).exclude(
            meta_aspects__isnull=True
        )
        
        for classification in classifications_with_meta:
            if classification.meta_aspects:
                for aspect in classification.meta_aspects:
                    my_meta_aspects[aspect] = my_meta_aspects.get(aspect, 0) + 1
        
        my_classifications = {
            'by_main_category': my_main_category,
            'by_meta_aspect': my_meta_aspects
        }
        
        # Activity timeline - last 7 days and last 30 days
        last_7_days = []
        for i in range(7):
            date = today - timedelta(days=6-i)
            count = user_classifications.filter(created_at__date=date).count()
            last_7_days.append({
                'date': date.isoformat(),
                'count': count
            })
        
        last_30_days = []
        for i in range(30):
            date = today - timedelta(days=29-i)
            count = user_classifications.filter(created_at__date=date).count()
            last_30_days.append({
                'date': date.isoformat(),
                'count': count
            })
        
        activity_timeline = {
            'last_7_days': last_7_days,
            'last_30_days': last_30_days
        }
        
        # Comparison with community (anonymous)
        all_users_stats = Classification.objects.values('user').annotate(
            count=Count('id'),
            avg_time=Avg('time_spent_seconds')
        )
        
        total_users = all_users_stats.count()
        
        # Calculate community averages
        community_average = sum(u['count'] for u in all_users_stats) / total_users if total_users > 0 else 0
        all_counts = sorted([u['count'] for u in all_users_stats])
        community_median = all_counts[len(all_counts)//2] if all_counts else 0
        
        # Calculate percentile (correctly handling ties)
        # Percentile = percentage of users you are BETTER than
        # Higher percentile = better ranking (e.g., 90th percentile = top 10%)
        # If user has 0 classifications, set percentile to 0 (bottom)
        if total_classifications == 0:
            my_percentile = 0
        else:
            users_below = sum(1 for u in all_users_stats if u['count'] < total_classifications)
            users_equal = sum(1 for u in all_users_stats if u['count'] == total_classifications)
            my_percentile = round(((users_below + 0.5 * users_equal) / total_users * 100) if total_users > 0 else 0)
        
        # Average time comparison
        community_avg_time = sum(u['avg_time'] for u in all_users_stats if u['avg_time']) / total_users if total_users > 0 else 0
        
        comparison = {
            'note': 'Anonymous comparison with community averages',
            'my_total': total_classifications,
            'community_average': round(community_average, 1),
            'community_median': community_median,
            'my_percentile': my_percentile,
            'my_average_time': round(time_stats['avg'] or 0, 1),
            'community_average_time': round(community_avg_time, 1)
        }
        
        # Recent activity (last 10 classifications)
        recent = user_classifications.select_related('abstract').order_by('-created_at')[:10]
        recent_activity = []
        for c in recent:
            recent_activity.append({
                'abstract_id': c.abstract.id,
                'abstract_title': c.abstract.title[:100] + '...' if len(c.abstract.title) > 100 else c.abstract.title,
                'main_classification': c.main_classification,
                'meta_aspects': c.meta_aspects or [],
                'classified_at': c.created_at.isoformat(),
                'time_spent_seconds': c.time_spent_seconds
            })
        
        data = {
            'overview': overview,
            'my_classifications': my_classifications,
            'activity_timeline': activity_timeline,
            'comparison': comparison,
            'recent_activity': recent_activity
        }
        
        serializer = self.serializer_class(data)
        return Response(serializer.data)


class SavedAbstractViewSet(viewsets.ModelViewSet):
    """
    ViewSet for saved/bookmarked abstracts
    REQUIRES AUTHENTICATION
    
    list: GET /api/saved-abstracts/ - List all my saved abstracts
    create: POST /api/saved-abstracts/ - Save an abstract
    retrieve: GET /api/saved-abstracts/{id}/ - Get saved abstract detail
    update: PUT/PATCH /api/saved-abstracts/{id}/ - Update notes/tags
    destroy: DELETE /api/saved-abstracts/{id}/ - Remove from saved
    
    Additional actions:
    - check_saved: Check if an abstract is saved
    - most_saved: Get most saved abstracts (community stats)
    - by_tag: Filter by tag
    - my_tags: Get all my tags
    """
    permission_classes = [IsAuthenticated, HasAcceptedLegal]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SavedAbstractListSerializer
        elif self.action in ['update', 'partial_update']:
            return SavedAbstractUpdateSerializer
        return SavedAbstractSerializer
    
    def get_queryset(self):
        """Users can only see their own saved abstracts"""
        return SavedAbstract.objects.filter(
            user=self.request.user
        ).select_related('abstract').order_by('-saved_at')
    
    def create(self, request, *args, **kwargs):
        """Save an abstract"""
        # Check if already saved
        abstract_id = request.data.get('abstract_id')
        if SavedAbstract.objects.filter(
            user=request.user,
            abstract_id=abstract_id
        ).exists():
            return Response(
                {'error': 'You have already saved this abstract'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return full details
        return Response(
            SavedAbstractSerializer(serializer.instance, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['get'])
    def check_saved(self, request):
        """
        Check if an abstract is saved by the current user
        Query param: abstract_id
        
        GET /api/saved-abstracts/check_saved/?abstract_id=123
        """
        abstract_id = request.query_params.get('abstract_id')
        
        if not abstract_id:
            return Response(
                {'error': 'abstract_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            saved_abstract = SavedAbstract.objects.get(
                user=request.user,
                abstract_id=abstract_id
            )
            return Response({
                'is_saved': True,
                'saved_abstract_id': saved_abstract.id,
                'notes': saved_abstract.notes,
                'tags': saved_abstract.tags,
                'saved_at': saved_abstract.saved_at
            })
        except SavedAbstract.DoesNotExist:
            return Response({
                'is_saved': False,
                'saved_abstract_id': None
            })
    
    @action(detail=False, methods=['get'])
    def most_saved(self, request):
        """
        Get most saved abstracts (community feature - GDPR compliant)
        Returns anonymous statistics
        
        GET /api/saved-abstracts/most_saved/?limit=10
        """
        limit = int(request.query_params.get('limit', 10))
        
        # Get abstracts with save counts
        most_saved = Abstract.objects.filter(
            is_active=True
        ).annotate(
            saves_count=Count('saved_by_users')
        ).filter(
            saves_count__gt=0
        ).order_by('-saves_count')[:limit]
        
        from apps.abstracts.serializers import AbstractListSerializer
        
        results = []
        for abstract in most_saved:
            data = AbstractListSerializer(abstract).data
            data['saves_count'] = abstract.saves_count
            # Check if current user saved it
            data['is_saved_by_me'] = SavedAbstract.objects.filter(
                user=request.user,
                abstract=abstract
            ).exists()
            results.append(data)
        
        return Response({
            'most_saved': results,
            'note': 'Anonymous community statistics - shows how many users saved each abstract'
        })
    
    @action(detail=False, methods=['get'])
    def by_tag(self, request):
        """
        Filter saved abstracts by tag
        Query param: tag
        
        GET /api/saved-abstracts/by_tag/?tag=methodology
        """
        tag = request.query_params.get('tag')
        
        if not tag:
            return Response(
                {'error': 'tag parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        saved = self.get_queryset().filter(
            tags__contains=[tag]
        )
        
        serializer = SavedAbstractListSerializer(saved, many=True)
        return Response({
            'tag': tag,
            'count': saved.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def my_tags(self, request):
        """
        Get all unique tags used by current user
        
        GET /api/saved-abstracts/my_tags/
        """
        saved_abstracts = self.get_queryset()
        
        all_tags = set()
        tag_counts = {}
        
        for saved in saved_abstracts:
            if saved.tags:
                for tag in saved.tags:
                    all_tags.add(tag)
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        # Sort by count (most used first)
        sorted_tags = sorted(
            [{'tag': tag, 'count': count} for tag, count in tag_counts.items()],
            key=lambda x: x['count'],
            reverse=True
        )
        
        return Response({
            'tags': sorted_tags,
            'total_unique_tags': len(all_tags)
        })


class FollowedDebateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for followed debates
    REQUIRES AUTHENTICATION
    
    list: GET /api/followed-debates/ - List all my followed debates
    create: POST /api/followed-debates/ - Follow a debate
    retrieve: GET /api/followed-debates/{id}/ - Get followed debate detail
    destroy: DELETE /api/followed-debates/{id}/ - Unfollow debate
    
    Additional actions:
    - check_followed: Check if a debate is followed
    - most_followed: Get most followed debates (community stats)
    """
    permission_classes = [IsAuthenticated, HasAcceptedLegal]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']  # Disable PUT/PATCH
    
    def get_serializer_class(self):
        if self.action == 'list':
            return FollowedDebateListSerializer
        return FollowedDebateSerializer
    
    def get_queryset(self):
        """Users can only see their own followed debates"""
        return FollowedDebate.objects.filter(
            user=self.request.user
        ).select_related('debate', 'debate__abstract', 'debate__initiator').order_by('-followed_at')
    
    def create(self, request, *args, **kwargs):
        """Follow a debate"""
        # Check if already following
        debate_id = request.data.get('debate_id')
        if FollowedDebate.objects.filter(
            user=request.user,
            debate_id=debate_id
        ).exists():
            return Response(
                {'error': 'You are already following this debate'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return full details
        return Response(
            FollowedDebateSerializer(serializer.instance, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['get'])
    def check_followed(self, request):
        """
        Check if a debate is followed by the current user
        Query param: debate_id
        
        GET /api/followed-debates/check_followed/?debate_id=123
        """
        debate_id = request.query_params.get('debate_id')
        
        if not debate_id:
            return Response(
                {'error': 'debate_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            followed_debate = FollowedDebate.objects.get(
                user=request.user,
                debate_id=debate_id
            )
            return Response({
                'is_followed': True,
                'followed_debate_id': followed_debate.id,
                'followed_at': followed_debate.followed_at
            })
        except FollowedDebate.DoesNotExist:
            return Response({
                'is_followed': False,
                'followed_debate_id': None
            })
    
    @action(detail=False, methods=['get'])
    def most_followed(self, request):
        """
        Get most followed debates (community feature - GDPR compliant)
        Returns anonymous statistics
        
        GET /api/followed-debates/most_followed/?limit=10
        """
        limit = int(request.query_params.get('limit', 10))
        
        # Get debates with follow counts
        most_followed = AbstractDebate.objects.annotate(
            follows_count=Count('followed_by_users')
        ).filter(
            follows_count__gt=0
        ).select_related('abstract', 'initiator').order_by('-follows_count')[:limit]
        
        results = []
        for debate in most_followed:
            data = AbstractDebateListSerializer(debate).data
            data['follows_count'] = debate.follows_count
            # Check if current user follows it
            data['is_followed_by_me'] = FollowedDebate.objects.filter(
                user=request.user,
                debate=debate
            ).exists()
            results.append(data)
        
        return Response({
            'most_followed': results,
            'note': 'Anonymous community statistics - shows how many users follow each debate'
        })


class AbstractDebateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for debates on abstracts
    
    list: GET /api/debates/ - List all debates
    retrieve: GET /api/debates/{id}/ - Get debate details with comments
    create: POST /api/debates/ - Create new debate (requires: abstract, text)
    destroy: DELETE /api/debates/{id}/ - Delete debate (only initiator or admin)
    
    Additional actions:
    - by_abstract: Get debates for a specific abstract
    - my_debates: Get debates initiated by current user
    - close: Close a debate (no more comments allowed)
    """
    permission_classes = [IsAuthenticated, HasAcceptedLegal]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AbstractDebateCreateSerializer
        elif self.action == 'list' or self.action == 'by_abstract' or self.action == 'my_debates':
            return AbstractDebateListSerializer
        return AbstractDebateSerializer
    
    def get_queryset(self):
        """Get all debates (ordered by pinned, then date)"""
        return AbstractDebate.objects.all().select_related(
            'initiator', 'abstract'
        ).order_by('-is_pinned', '-created_at')
    
    def list(self, request, *args, **kwargs):
        """List debates and increment views for items in current page"""
        response = super().list(request, *args, **kwargs)
        
        # Get the IDs from the current page results
        if 'results' in response.data:
            debate_ids = [item['id'] for item in response.data['results']]
            # Increment views for all debates in current page
            AbstractDebate.objects.filter(id__in=debate_ids).update(
                views_count=F('views_count') + 1
            )
        
        return response
    
    def retrieve(self, request, *args, **kwargs):
        """Get debate details and increment views"""
        debate = self.get_object()
        debate.views_count += 1
        debate.save(update_fields=['views_count'])
        serializer = self.get_serializer(debate)
        return Response(serializer.data)
    
    @extend_schema(
        request=AbstractDebateCreateSerializer,
        responses={201: AbstractDebateSerializer},
        examples=[
            OpenApiExample(
                'Create debate',
                value={
                    'abstract': 123,
                    'text': 'I think the methodology in this paper has some interesting aspects we should discuss...'
                },
                request_only=True
            )
        ]
    )
    def create(self, request, *args, **kwargs):
        """Create a new debate on an abstract"""
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """Save debate - appears in activity feed automatically"""
        serializer.save()
    
    def update(self, request, *args, **kwargs):
        """Prevent updating debates (no editing allowed, like X)"""
        return Response(
            {'error': 'Debates cannot be edited once created'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    def partial_update(self, request, *args, **kwargs):
        """Prevent partial updating debates"""
        return Response(
            {'error': 'Debates cannot be edited once created'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    def destroy(self, request, *args, **kwargs):
        """Delete debate (only initiator or admin)"""
        debate = self.get_object()
        
        if debate.initiator != request.user and not request.user.is_staff:
            return Response(
                {'error': 'You can only delete your own debates'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        debate.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def by_abstract(self, request):
        """
        Get all debates for a specific abstract
        GET /api/debates/by_abstract/?abstract_id=123
        """
        abstract_id = request.query_params.get('abstract_id')
        
        if not abstract_id:
            return Response(
                {'error': 'abstract_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        debates = self.get_queryset().filter(abstract_id=abstract_id)
        serializer = self.get_serializer(debates, many=True)
        
        return Response({
            'abstract_id': abstract_id,
            'debates': serializer.data,
            'total': debates.count()
        })
    
    @action(detail=False, methods=['get'])
    def my_debates(self, request):
        """
        Get debates initiated by current user
        GET /api/debates/my_debates/
        """
        debates = self.get_queryset().filter(initiator=request.user)
        serializer = self.get_serializer(debates, many=True)
        
        return Response({
            'debates': serializer.data,
            'total': debates.count()
        })
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """
        Close a debate (no more comments allowed)
        POST /api/debates/{id}/close/
        Only initiator or admin can close
        """
        debate = self.get_object()
        
        if debate.initiator != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Only the initiator or admin can close this debate'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        debate.is_closed = True
        debate.save(update_fields=['is_closed'])
        
        return Response({
            'message': 'Debate closed successfully',
            'is_closed': True
        })
    
    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        """
        Reopen a closed debate
        POST /api/debates/{id}/reopen/
        Only initiator or admin can reopen
        """
        debate = self.get_object()
        
        if debate.initiator != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Only the initiator or admin can reopen this debate'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        debate.is_closed = False
        debate.save(update_fields=['is_closed'])
        
        return Response({
            'message': 'Debate reopened successfully',
            'is_closed': False
        })
    
    @extend_schema(
        request=ShareDebateSerializer,
        responses={200: {'type': 'object'}},
        description="Share a debate via email. Requires debate_id, recipient_email, and optional message."
    )
    @action(detail=False, methods=['post'])
    def share(self, request):
        """
        Share a debate via email
        POST /api/debates/share/
        
        Body: {
            "debate_id": 123,
            "recipient_email": "user@example.com",
            "message": "Check out this debate!"
        }
        """
        serializer = ShareDebateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # Get validated data
        debate_id = serializer.validated_data['debate_id']
        recipient_email = serializer.validated_data['recipient_email']
        user_message = serializer.validated_data.get('message', '')
        
        # Get the debate
        debate = AbstractDebate.objects.select_related('abstract', 'initiator').get(id=debate_id)
        
        # Prepare email context - use display name if available
        try:
            profile = request.user.classification_profile
            sender_name = profile.get_display_name()
        except:
            sender_name = request.user.email
        
        debate_url = f"{settings.FRONTEND_URL}/debates/{debate.id}"
        
        context = {
            'sender_name': sender_name,
            'debate': debate,
            'debate_url': debate_url,
            'user_message': user_message,
        }
        
        # Render email templates
        subject = render_to_string('emails/debates/share_debate_subject.txt', context).strip()
        text_message = render_to_string('emails/debates/share_debate_message.txt', context)
        html_message = render_to_string('emails/debates/share_debate_message.html', context)
        
        # Send email
        try:
            send_mail(
                subject=subject,
                message=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                html_message=html_message,
                fail_silently=False,
            )
            
            # Save to database
            shared_debate = SharedDebate.objects.create(
                user=request.user,
                debate=debate,
                recipient_email=recipient_email,
                message=user_message,
                email_sent_successfully=True
            )
            
            return Response({
                'success': True,
                'message': f'Debate shared successfully with {recipient_email}',
                'shared_id': shared_debate.id,
                'shared_at': shared_debate.shared_at
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Log error and save failed attempt
            SharedDebate.objects.create(
                user=request.user,
                debate=debate,
                recipient_email=recipient_email,
                message=user_message,
                email_sent_successfully=False
            )
            
            return Response({
                'success': False,
                'error': 'Failed to send email. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DebateCommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for debate comments
    
    list: GET /api/debates/{debate_id}/comments/ - List all comments in debate
    create: POST /api/debates/{debate_id}/comments/ - Add comment to debate
    destroy: DELETE /api/comments/{id}/ - Soft delete comment (only author or admin)
    
    No editing allowed (like X/Twitter)
    """
    permission_classes = [IsAuthenticated, HasAcceptedLegal]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return DebateCommentCreateSerializer
        return DebateCommentSerializer
    
    def get_queryset(self):
        """Get comments for a specific debate"""
        debate_id = self.kwargs.get('debate_pk')
        if debate_id:
            return DebateComment.objects.filter(
                debate_id=debate_id
            ).select_related('user').order_by('created_at')
        return DebateComment.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Add a new comment to the debate"""
        debate_id = self.kwargs.get('debate_pk')
        
        try:
            debate = AbstractDebate.objects.get(id=debate_id)
        except AbstractDebate.DoesNotExist:
            return Response(
                {'error': 'Debate not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if debate is closed
        if debate.is_closed:
            return Response(
                {'error': 'This debate is closed. No new comments allowed.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request, 'debate': debate}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(
            DebateCommentSerializer(serializer.instance).data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """Prevent updating comments (no editing allowed, like X)"""
        return Response(
            {'error': 'Comments cannot be edited once posted'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    def partial_update(self, request, *args, **kwargs):
        """Prevent partial updating comments"""
        return Response(
            {'error': 'Comments cannot be edited once posted'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    def destroy(self, request, *args, **kwargs):
        """
        Soft delete comment (shows 'Comment deleted')
        Only comment author or admin can delete
        """
        comment = self.get_object()
        
        if comment.user != request.user and not request.user.is_staff:
            return Response(
                {'error': 'You can only delete your own comments'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Soft delete
        comment.is_deleted = True
        comment.save(update_fields=['is_deleted'])
        
        return Response({
            'message': 'Comment deleted successfully',
            'id': comment.id,
            'is_deleted': True
        })
    
    @action(detail=False, methods=['get'])
    def by_user(self, request, debate_pk=None):
        """
        Get all comments by current user in this debate
        GET /api/debates/{debate_id}/comments/by_user/
        """
        comments = self.get_queryset().filter(
            user=request.user,
            is_deleted=False
        )
        serializer = self.get_serializer(comments, many=True)
        
        return Response({
            'comments': serializer.data,
            'total': comments.count()
        })


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for user notifications
    
    list: GET /api/notifications/ - List my unread notifications (default)
          GET /api/notifications/?show_all=true - List all notifications
    retrieve: GET /api/notifications/{id}/ - Get notification detail
    
    Additional actions:
    - mark_as_read: Mark notification as read
    - mark_all_as_read: Mark all notifications as read
    - unread_count: Get count of unread notifications
    """
    permission_classes = [IsAuthenticated, HasAcceptedLegal]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NotificationListSerializer
        return NotificationSerializer
    
    def get_queryset(self):
        """
        Users can only see their own notifications
        By default, only returns unread notifications
        Use ?show_all=true to get all notifications
        """
        queryset = Notification.objects.filter(
            user=self.request.user
        ).select_related(
            'actor', 'debate', 'debate__abstract', 'comment'
        )
        
        # By default, only show unread notifications
        show_all = self.request.query_params.get('show_all', 'false').lower() == 'true'
        if not show_all:
            queryset = queryset.filter(is_read=False)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['patch'])
    def mark_as_read(self, request, pk=None):
        """
        Mark a notification as read
        PATCH /api/notifications/{id}/mark_as_read/
        """
        notification = self.get_object()
        notification.mark_as_read()
        
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """
        Mark all notifications as read
        POST /api/notifications/mark_all_as_read/
        """
        from django.utils import timezone
        
        updated = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'{updated} notifications marked as read',
            'updated_count': updated
        })
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        Get count of unread notifications
        GET /api/notifications/unread_count/
        """
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        
        return Response({
            'unread_count': count
        })


class ChallengeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Reto/Challenge catalog: the General challenge + top-N keyword and journal
    challenges. A challenge is a lens over the global corpus, so its stats are a
    subset of the general ones and a single classification counts everywhere.

    - GET  /challenges/                list the catalog (filter with ?type=keyword|journal|general)
    - GET  /challenges/{id}/           detail incl. my_contributions + is_participating
    - POST /challenges/{id}/join/      join (persistent-light)
    - POST /challenges/{id}/leave/     leave
    - GET  /challenges/my/             my joined challenges with progress
    """
    permission_classes = [IsAuthenticated, HasAcceptedLegal]
    serializer_class = ChallengeSerializer
    pagination_class = None  # bounded catalog (general + 2*N)

    def get_queryset(self):
        qs = Challenge.objects.filter(is_active=True).select_related('keyword', 'wos_category')
        ctype = self.request.query_params.get('type')
        if ctype in (Challenge.TYPE_GENERAL, Challenge.TYPE_KEYWORD,
                     Challenge.TYPE_JOURNAL, Challenge.TYPE_WOS):
            qs = qs.filter(challenge_type=ctype)
        return qs

    def _batched_stats(self, challenges):
        """Global stats for many challenges in a few aggregate queries.
        Returns {challenge_id: stats_dict} (without my_contributions)."""
        active_abs = Abstract.objects.filter(is_active=True)

        journal_names = [c.journal_name for c in challenges
                         if c.challenge_type == Challenge.TYPE_JOURNAL]
        keyword_ids = [c.keyword_id for c in challenges
                       if c.challenge_type == Challenge.TYPE_KEYWORD]
        wos_ids = [c.wos_category_id for c in challenges
                   if c.challenge_type == Challenge.TYPE_WOS]
        has_general = any(c.challenge_type == Challenge.TYPE_GENERAL for c in challenges)

        # Abstract-level aggregates (total / completed / target). No classification
        # join here, so counts can't be inflated.
        journ = {}
        if journal_names:
            for r in (active_abs.filter(journal__in=journal_names)
                      .values('journal')
                      .annotate(total=Count('id'),
                                completed=Count('id', filter=Q(consensus_reached=True)),
                                target=Sum('required_classifications'))):
                journ[r['journal']] = (r['total'], r['completed'], r['target'] or 0)

        kwmap = {}
        if keyword_ids:
            for k in Keyword.objects.filter(id__in=keyword_ids).annotate(
                    total=Count('abstracts', filter=Q(abstracts__is_active=True), distinct=True),
                    completed=Count('abstracts', filter=Q(
                        abstracts__is_active=True,
                        abstracts__consensus_reached=True), distinct=True),
                    target=Sum('abstracts__required_classifications',
                               filter=Q(abstracts__is_active=True))):
                kwmap[k.id] = (k.total, k.completed, k.target or 0)

        wcmap = {}
        if wos_ids:
            for w in WosCategory.objects.filter(id__in=wos_ids).annotate(
                    total=Count('abstracts', filter=Q(abstracts__is_active=True), distinct=True),
                    completed=Count('abstracts', filter=Q(
                        abstracts__is_active=True,
                        abstracts__consensus_reached=True), distinct=True),
                    target=Sum('abstracts__required_classifications',
                               filter=Q(abstracts__is_active=True))):
                wcmap[w.id] = (w.total, w.completed, w.target or 0)

        general = None
        if has_general:
            g = active_abs.aggregate(
                total=Count('id'),
                completed=Count('id', filter=Q(consensus_reached=True)),
                target=Sum('required_classifications'))
            general = (g['total'], g['completed'], g['target'] or 0)

        # Classification-level "done": count real Classification rows grouped by
        # the scope key (separate queries to avoid join inflation).
        done_journal, done_keyword, done_woscat, done_general = {}, {}, {}, 0
        valid_cl = Classification.objects.filter(
            abstract__is_active=True, is_valid=True)
        if journal_names:
            for r in (valid_cl.filter(abstract__journal__in=journal_names)
                      .values('abstract__journal').annotate(d=Count('id'))):
                done_journal[r['abstract__journal']] = r['d']
        if keyword_ids:
            for r in (valid_cl.filter(abstract__keywords_rel__in=keyword_ids)
                      .values('abstract__keywords_rel').annotate(d=Count('id'))):
                done_keyword[r['abstract__keywords_rel']] = r['d']
        if wos_ids:
            for r in (valid_cl.filter(abstract__wos_categories_rel__in=wos_ids)
                      .values('abstract__wos_categories_rel').annotate(d=Count('id'))):
                done_woscat[r['abstract__wos_categories_rel']] = r['d']
        if has_general:
            done_general = valid_cl.count()

        stats_map = {}
        for c in challenges:
            if c.challenge_type == Challenge.TYPE_GENERAL:
                total, completed, target = general or (0, 0, 0)
                done = done_general
            elif c.challenge_type == Challenge.TYPE_JOURNAL:
                total, completed, target = journ.get(c.journal_name, (0, 0, 0))
                done = done_journal.get(c.journal_name, 0)
            elif c.challenge_type == Challenge.TYPE_WOS:
                total, completed, target = wcmap.get(c.wos_category_id, (0, 0, 0))
                done = done_woscat.get(c.wos_category_id, 0)
            else:
                total, completed, target = kwmap.get(c.keyword_id, (0, 0, 0))
                done = done_keyword.get(c.keyword_id, 0)
            stats_map[c.id] = Challenge.stats_dict(total, completed, target, done)
        return stats_map

    def _participating_ids(self, challenges):
        user = self.request.user
        if not user.is_authenticated:
            return set()
        return set(ChallengeParticipation.objects.filter(
            user=user, challenge__in=[c.id for c in challenges]
        ).values_list('challenge_id', flat=True))

    def list(self, request, *args, **kwargs):
        challenges = list(self.get_queryset())
        context = self.get_serializer_context()
        context['stats_map'] = self._batched_stats(challenges)
        context['participating_ids'] = self._participating_ids(challenges)
        serializer = ChallengeSerializer(challenges, many=True, context=context)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Join a challenge (idempotent)."""
        challenge = self.get_object()
        participation, created = ChallengeParticipation.objects.get_or_create(
            user=request.user, challenge=challenge
        )
        return Response(
            {
                'joined': True,
                'created': created,
                'challenge_id': challenge.id,
                'joined_at': participation.joined_at,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Leave a challenge."""
        challenge = self.get_object()
        deleted, _ = ChallengeParticipation.objects.filter(
            user=request.user, challenge=challenge
        ).delete()
        return Response({'left': True, 'was_participating': bool(deleted)})

    @action(detail=False, methods=['get'])
    def my(self, request):
        """Challenges the current user has joined, with live progress."""
        participations = list(
            ChallengeParticipation.objects.filter(user=request.user)
            .select_related('challenge', 'challenge__keyword', 'challenge__wos_category')
        )
        challenges = [p.challenge for p in participations]
        stats_map = self._batched_stats(challenges)

        # Add per-user contributions per challenge (one query per challenge scope;
        # the user only joins a handful, so this stays cheap).
        for c in challenges:
            mine = Classification.objects.filter(
                user=request.user,
                abstract__in=c.get_abstract_queryset(),
                is_valid=True
            ).count()
            stats_map[c.id] = {**stats_map.get(c.id, Challenge.stats_dict(0, 0)),
                               'my_contributions': mine}

        context = self.get_serializer_context()
        context['stats_map'] = stats_map
        context['participating_ids'] = {c.id for c in challenges}
        serializer = ChallengeParticipationSerializer(
            participations, many=True, context=context
        )
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def leaderboard(self, request, pk=None):
        """
        Ranking of users by number of valid classifications made within this
        challenge's scope. Profiles that opted into public visibility
        (`is_profile_public=True`) show their name; everyone else is 'Anonymous'.
        Always includes the caller's own count and position (`my_position`),
        even if outside the top `limit` (default 10).
        """
        challenge = self.get_object()
        limit = int(request.query_params.get('limit', 10))
        scope_ids = challenge.get_abstract_queryset().values_list('id', flat=True)

        # One grouped query: classifications per user within scope. The number of
        # distinct classifiers is bounded by the user base, so materializing it to
        # compute the caller's exact position is cheap.
        ranking = list(
            Classification.objects
            .filter(abstract_id__in=scope_ids, is_valid=True, user__isnull=False)
            .values('user_id')
            .annotate(n=Count('id'))
            .order_by('-n', 'user_id')
        )

        top = ranking[:limit]
        profiles = {
            p.user_id: p for p in UserProfile.objects
            .filter(user_id__in=[r['user_id'] for r in top])
            .select_related('user')
        }

        results = []
        for rank, row in enumerate(top, start=1):
            prof = profiles.get(row['user_id'])
            public = bool(prof and prof.is_profile_public)
            results.append({
                'rank': rank,
                'display_name': prof.get_display_name() if public else 'Anonymous',
                'institution': prof.institution if public else None,
                'is_anonymous': not public,
                'classifications': row['n'],
            })

        my_position, my_count = None, 0
        for idx, row in enumerate(ranking, start=1):
            if row['user_id'] == request.user.id:
                my_position, my_count = idx, row['n']
                break

        return Response({
            'challenge_id': challenge.id,
            'results': results,
            'my_position': my_position,
            'my_classifications': my_count,
        })
