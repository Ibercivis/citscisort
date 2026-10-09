from django.db import models
from django.db.models import Count, Sum, Q
from django.contrib.auth import get_user_model
from django.contrib.postgres.indexes import GinIndex
from django_countries.fields import CountryField
from apps.abstracts.models import Abstract

User = get_user_model()


class Category(models.Model):
    """Hierarchical categories for classification"""
    CATEGORY_TYPES = [
        ('main', 'Main Classification'),
        ('meta_aspect', 'Meta-research Aspect'),
    ]

    # Ioannidis et al. 2015 meta-research pillars (+ Harpe 2021 Organization)
    IOANNIDIS_PILLARS = [
        ('none', 'Not applicable'),
        ('methods', 'Methods'),
        ('reporting', 'Reporting'),
        ('reproducibility', 'Reproducibility'),
        ('evaluation', 'Evaluation'),
        ('incentives', 'Incentives'),
        ('organization', 'Organization (Harpe 2021)'),
    ]

    # Responsible Research and Innovation (RRI) keys
    # Stilgoe, Owen & Macnaghten 2013; EU Horizon 2020
    RRI_KEYS = [
        ('none', 'Not applicable'),
        ('ethics', 'Ethics'),
        ('public_engagement', 'Public Engagement'),
        ('gender_equality', 'Gender Equality'),
        ('science_education', 'Science Education'),
        ('open_access', 'Open Access'),
        ('governance', 'Governance'),
    ]

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    category_type = models.CharField(max_length=20, choices=CATEGORY_TYPES, db_index=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    description = models.TextField(blank=True, help_text="Full composed description (auto-built from description_short + keywords + disambiguation)")
    description_short = models.CharField(max_length=300, blank=True, help_text="Concise headline: what the category studies")
    keywords = models.JSONField(default=list, blank=True, help_text="List of topic keywords that belong to this category")
    disambiguation = models.TextField(blank=True, help_text="Decision rules when this category overlaps with others")
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    allows_multiple = models.BooleanField(default=False)
    icon = models.CharField(
        max_length=100,
        blank=True,
        help_text="MUI icon name (from @mui/icons-material, e.g. 'Groups', 'Biotech')"
    )

    # Canonical-framework mapping (for meta-research provenance)
    ioannidis_pillar = models.CharField(
        max_length=20,
        choices=IOANNIDIS_PILLARS,
        default='none',
        help_text="Mapping to Ioannidis et al. 2015 meta-research pillars (Harpe 2021 adds Organization)"
    )
    rri_key = models.CharField(
        max_length=30,
        choices=RRI_KEYS,
        default='none',
        help_text="Mapping to Responsible Research and Innovation keys (Stilgoe et al. 2013; Horizon 2020)"
    )
    reference = models.TextField(
        blank=True,
        help_text="Bibliographic justification for this category"
    )

    # Conditional logic
    show_if_parent_category = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='conditional_children'
    )
    show_if_parent_values = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['category_type', 'order', 'name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['category_type', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.get_category_type_display()}: {self.name}"


class Infrastructure(models.Model):
    """
    Citizen-science platforms, apps, databases, and tools mentioned in papers.
    Any authenticated user can create a new entry implicitly via the classification endpoint.
    Admins can promote entries to is_verified=True to mark them as canonical.
    """
    TYPE_CHOICES = [
        ('platform', 'Platform'),
        ('app', 'Mobile/Web App'),
        ('database', 'Database'),
        ('network', 'Sensor Network'),
        ('tool', 'Tool/Software'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=150, unique=True, db_index=True)
    slug = models.SlugField(max_length=160, unique=True, db_index=True)
    url = models.URLField(blank=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='other', db_index=True)
    description = models.TextField(blank=True)
    icon = models.CharField(
        max_length=100,
        blank=True,
        help_text="MUI icon name (from @mui/icons-material)"
    )
    aliases = models.JSONField(
        default=list,
        blank=True,
        help_text="Alternative names or spellings (admin-curated) — used by search"
    )
    is_verified = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Admin-verified canonical entry (vs. user-created)"
    )
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_infrastructures',
        help_text="User who first created this entry (null for seeded/canonical entries)"
    )
    usage_count = models.IntegerField(
        default=0,
        db_index=True,
        help_text="Number of classifications referencing this infrastructure"
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Infrastructure'
        verbose_name_plural = 'Infrastructures'
        ordering = ['-is_verified', '-usage_count', 'name']
        indexes = [
            models.Index(fields=['-is_verified', '-usage_count']),
            models.Index(fields=['is_active', 'is_verified']),
            GinIndex(
                fields=['name'],
                name='infrastructure_name_trgm_idx',
                opclasses=['gin_trgm_ops'],
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        badge = '✓' if self.is_verified else '·'
        return f"{badge} {self.name} ({self.get_type_display()})"


class MetaAspectSuggestion(models.Model):
    """
    User-proposed meta-research aspects that don't fit the 7 canonical ones
    (bound to Ioannidis 2015 / RRI). Any authenticated user can create a new
    suggestion implicitly via the classification endpoint. Admins can promote
    high-quality suggestions to is_verified=True.
    """
    name = models.CharField(max_length=150, unique=True, db_index=True)
    slug = models.SlugField(max_length=160, unique=True, db_index=True)
    description = models.TextField(blank=True)
    usage_count = models.IntegerField(
        default=0,
        db_index=True,
        help_text="Number of classifications referencing this suggestion"
    )
    is_verified = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Admin-verified canonical entry (vs. user-created)"
    )
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_meta_aspect_suggestions',
        help_text="User who first created this entry (null for seeded/canonical entries)"
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Meta-aspect Suggestion'
        verbose_name_plural = 'Meta-aspect Suggestions'
        ordering = ['-is_verified', '-usage_count', 'name']
        indexes = [
            models.Index(fields=['-is_verified', '-usage_count']),
            models.Index(fields=['is_active', 'is_verified']),
            GinIndex(
                fields=['name'],
                name='metaaspectsugg_name_trgm_idx',
                opclasses=['gin_trgm_ops'],
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        badge = '✓' if self.is_verified else '·'
        return f"{badge} {self.name}"


class UserProfile(models.Model):
    """User profile extension"""

    # Academic background — closed choices, adapted from OECD Fields of Science.
    # Used for cross-group analysis (e.g. do biologists classify differently
    # from social scientists?). Single selection, optional.
    BACKGROUND_CHOICES = [
        ('biology_life_sciences', 'Biology / Life Sciences'),
        ('physical_sciences', 'Physics / Chemistry / Earth Sciences'),
        ('mathematics_theoretical_cs', 'Mathematics / Theoretical Computer Science / Statistics'),
        ('engineering_applied_cs', 'Engineering / Applied Computing / Technology'),
        ('medical_health', 'Medical / Health Sciences'),
        ('social_sciences', 'Social Sciences'),
        ('humanities', 'Humanities'),
        ('other', 'Other'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='classification_profile')
    
    # User classification
    is_gold_user = models.BooleanField(default=False)
    reliability_score = models.FloatField(default=0.0)
    total_classifications = models.IntegerField(default=0)
    agreement_with_gold = models.FloatField(default=0.0)
    
    # Onboarding
    completed_training = models.BooleanField(default=False)
    training_score = models.FloatField(default=0.0)
    training_attempts = models.IntegerField(default=0)
    
    # Gamification
    points = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    badges = models.JSONField(default=list)
    
    # Profile information (optional)
    first_name = models.CharField(
        max_length=150,
        blank=True,
        default='',
        help_text="User's first name (optional)"
    )
    last_name = models.CharField(
        max_length=150,
        blank=True,
        default='',
        help_text="User's last name (optional)"
    )
    country = CountryField(
        blank=True,
        blank_label='(select country)',
        help_text="User's country (optional, ISO 3166)"
    )
    institution = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="User's institution or affiliation (optional)"
    )
    is_profile_public = models.BooleanField(
        default=False,
        help_text="Whether to show profile in public leaderboards and stats"
    )
    wants_in_acknowledgments = models.BooleanField(
        default=False,
        help_text="Opt-in to appear in platform/paper acknowledgments"
    )
    wants_paper_collaboration = models.BooleanField(
        default=False,
        help_text="Opt-in to be contacted for potential research paper collaboration"
    )
    newsletter_opt_in = models.BooleanField(
        default=False,
        help_text="Opt-in to receive the project newsletter by email"
    )
    # GDPR proof of consent: set when opt-in turns on, cleared when it turns off
    newsletter_opt_in_at = models.DateTimeField(null=True, blank=True)
    # Engagement emails (re-engagement nudges, milestone congratulations).
    # Default on: they are service messages about the person's own activity,
    # distinct from the newsletter (explicit opt-in). One-click unsubscribe
    # link in every email flips this off; the timestamp is kept as a record.
    activity_emails_opt_in = models.BooleanField(
        default=True,
        help_text="Receive reminder/milestone emails about your own activity"
    )
    activity_emails_opt_out_at = models.DateTimeField(null=True, blank=True)
    background = models.CharField(
        max_length=30,
        choices=BACKGROUND_CHOICES,
        blank=True,
        default='',
        help_text="User's academic background (OECD FOS-inspired, optional)"
    )

    # Legal acceptance (Terms of Service and Privacy Policy)
    # Versions are opaque strings; must match settings.CURRENT_TERMS_VERSION /
    # settings.CURRENT_PRIVACY_VERSION byte-for-byte to count as accepted.
    terms_version_accepted = models.CharField(
        max_length=50, blank=True, default='',
        help_text="Version string of the Terms of Service the user accepted"
    )
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    privacy_version_accepted = models.CharField(
        max_length=50, blank=True, default='',
        help_text="Version string of the Privacy Policy the user accepted"
    )
    privacy_accepted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
    
    def get_display_name(self):
        """
        Return user's full name if available, otherwise email
        """
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name}".strip()
        return self.user.email
    
    def __str__(self):
        return f"{self.user.email} - {'Gold' if self.is_gold_user else 'Regular'} (Score: {self.reliability_score:.1f})"


class Classification(models.Model):
    """Individual classification of an abstract by a user"""
    user = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='user_classifications',
        help_text="User who made the classification. Can be null if user is deleted but classifications are preserved."
    )
    abstract = models.ForeignKey(Abstract, on_delete=models.CASCADE, related_name='classifications')
    
    # Main classification (required) - stores the category code
    main_classification = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Code of the main classification category"
    )
    
    # Meta-research aspects (only if main_classification = 'meta_research')
    meta_aspects = models.JSONField(default=list, blank=True, help_text="List of meta-research aspect codes (the 7 canonical ones)")

    # Free-form user-created meta-aspect tags (outside the 7 canonical)
    other_meta_aspects = models.ManyToManyField(
        'MetaAspectSuggestion',
        blank=True,
        related_name='classifications',
        help_text="User-proposed meta-aspects not covered by the 7 canonical ones"
    )

    # Infrastructure — structured M2M to Infrastructure catalog (created-on-the-fly by users)
    mentions_infrastructure = models.BooleanField(
        default=False,
        help_text="Frontend gate: whether the classifier declared the paper mentions infrastructure/platforms"
    )
    infrastructures = models.ManyToManyField(
        'Infrastructure',
        blank=True,
        related_name='classifications',
        help_text="Platforms/apps/databases/tools the paper mentions"
    )

    # Additional info
    comments = models.TextField(blank=True)
    
    # Metrics
    time_spent_seconds = models.IntegerField(default=0)
    is_training = models.BooleanField(default=False)
    
    # Validation
    is_valid = models.BooleanField(default=True)
    validation_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'abstract']
        ordering = ['-created_at']
        verbose_name = 'Classification'
        verbose_name_plural = 'Classifications'
        indexes = [
            models.Index(fields=['user', 'abstract']),
            models.Index(fields=['main_classification']),
            models.Index(fields=['is_training']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        abstract_id = self.abstract.doi if self.abstract.doi else f"ID:{self.abstract.id}"
        return f"{self.user.email} → {abstract_id} ({self.main_classification})"
    
    def get_main_category(self):
        """Get the Category object for this classification's main_classification"""
        try:
            return Category.objects.get(code=self.main_classification, category_type='main')
        except Category.DoesNotExist:
            return None


class GoldStandard(models.Model):
    """Consensus classifications from gold users"""
    abstract = models.ForeignKey(Abstract, on_delete=models.CASCADE, related_name='gold_standards')
    
    # Main classification consensus
    main_classification = models.CharField(max_length=50)
    main_agreement_score = models.FloatField(help_text="Agreement level (0-1)")
    
    # Meta aspects consensus (if applicable)
    meta_aspects = models.JSONField(default=list, blank=True)
    meta_agreement_score = models.FloatField(default=0.0)

    num_gold_classifications = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Gold Standard'
        verbose_name_plural = 'Gold Standards'
    
    def __str__(self):
        return f"Gold: {self.abstract.doi} - {self.main_classification}"


class ClassificationSession(models.Model):
    """User classification session"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='classification_sessions')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    classifications_count = models.IntegerField(default=0)
    total_time_seconds = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Classification Session'
        verbose_name_plural = 'Classification Sessions'
    
    def __str__(self):
        return f"{self.user.email} - {self.started_at.strftime('%Y-%m-%d %H:%M')}"


class SavedAbstract(models.Model):
    """
    Model to save/bookmark abstracts for later reference
    Users can save interesting abstracts to their personal library
    """
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='saved_abstracts'
    )
    abstract = models.ForeignKey(
        'abstracts.Abstract',
        on_delete=models.CASCADE,
        related_name='saved_by_users'
    )
    
    # Optional metadata
    notes = models.TextField(
        blank=True,
        help_text="Personal notes about this abstract"
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Personal tags/labels for organization"
    )
    
    # Timestamps
    saved_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'abstract']
        ordering = ['-saved_at']
        verbose_name = 'Saved Abstract'
        verbose_name_plural = 'Saved Abstracts'
        indexes = [
            models.Index(fields=['user', '-saved_at']),
            models.Index(fields=['abstract']),
        ]
    
    def __str__(self):
        title_preview = self.abstract.title[:50] if self.abstract.title else 'Untitled'
        return f"{self.user.email} saved '{title_preview}'"


class FollowedDebate(models.Model):
    """
    Model to follow debates for updates
    Users can follow debates to stay updated on new comments
    """
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='followed_debates'
    )
    debate = models.ForeignKey(
        'AbstractDebate',
        on_delete=models.CASCADE,
        related_name='followed_by_users'
    )
    
    # Timestamps
    followed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'debate']
        ordering = ['-followed_at']
        verbose_name = 'Followed Debate'
        verbose_name_plural = 'Followed Debates'
        indexes = [
            models.Index(fields=['user', '-followed_at']),
            models.Index(fields=['debate']),
        ]
    
    def __str__(self):
        text_preview = self.debate.text[:50] if self.debate.text else 'No text'
        return f"{self.user.email} follows debate '{text_preview}'"


class SharedAbstract(models.Model):
    """
    Model to track when users share abstracts via email
    Keeps history of shared abstracts for statistics
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shared_abstracts'
    )
    abstract = models.ForeignKey(
        'abstracts.Abstract',
        on_delete=models.CASCADE,
        related_name='shared_by_users'
    )
    
    # Email details
    recipient_email = models.EmailField(
        help_text="Email address of the recipient"
    )
    message = models.TextField(
        blank=True,
        help_text="Personal message from sender"
    )
    
    # Tracking
    shared_at = models.DateTimeField(auto_now_add=True)
    email_sent_successfully = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-shared_at']
        verbose_name = 'Shared Abstract'
        verbose_name_plural = 'Shared Abstracts'
        indexes = [
            models.Index(fields=['user', '-shared_at']),
            models.Index(fields=['abstract', '-shared_at']),
        ]
    
    def __str__(self):
        title_preview = self.abstract.title[:50] if self.abstract.title else 'Untitled'
        return f"{self.user.email} shared '{title_preview}' to {self.recipient_email}"


class SharedDebate(models.Model):
    """
    Model to track when users share debates via email
    Keeps history of shared debates for statistics
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shared_debates'
    )
    debate = models.ForeignKey(
        'AbstractDebate',
        on_delete=models.CASCADE,
        related_name='shared_by_users'
    )
    
    # Email details
    recipient_email = models.EmailField(
        help_text="Email address of the recipient"
    )
    message = models.TextField(
        blank=True,
        help_text="Personal message from sender"
    )
    
    # Tracking
    shared_at = models.DateTimeField(auto_now_add=True)
    email_sent_successfully = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-shared_at']
        verbose_name = 'Shared Debate'
        verbose_name_plural = 'Shared Debates'
        indexes = [
            models.Index(fields=['user', '-shared_at']),
            models.Index(fields=['debate', '-shared_at']),
        ]
    
    def __str__(self):
        text_preview = self.debate.text[:50] if self.debate.text else 'No text'
        return f"{self.user.email} shared debate '{text_preview}' to {self.recipient_email}"


class AbstractDebate(models.Model):
    """
    Debate thread on an abstract for academic discussion
    Multiple users can discuss different aspects of a research paper
    """
    abstract = models.ForeignKey(
        'abstracts.Abstract',
        on_delete=models.CASCADE,
        related_name='debates'
    )
    initiator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='initiated_debates'
    )
    
    # Debate content
    text = models.TextField(
        help_text="Initial post explaining the debate topic"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_closed = models.BooleanField(
        default=False,
        help_text="Closed debates don't accept new comments"
    )
    is_pinned = models.BooleanField(
        default=False,
        help_text="Pinned debates appear at the top"
    )
    views_count = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-is_pinned', '-created_at']
        verbose_name = 'Abstract Debate'
        verbose_name_plural = 'Abstract Debates'
        indexes = [
            models.Index(fields=['abstract', '-created_at']),
            models.Index(fields=['initiator', '-created_at']),
            models.Index(fields=['-is_pinned', '-created_at']),
        ]
    
    def __str__(self):
        text_preview = self.text[:50] if len(self.text) > 50 else self.text
        return f"Debate: {text_preview} on {self.abstract.title[:30]}"
    
    @property
    def comments_count(self):
        """Count active (non-deleted) comments"""
        return self.comments.filter(is_deleted=False).count()


class DebateComment(models.Model):
    """
    Comment in a debate thread (flat comments, no nesting)
    Like X/Twitter: no editing, only delete
    """
    debate = models.ForeignKey(
        AbstractDebate,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='debate_comments'
    )
    
    # Comment content
    text = models.TextField(
        max_length=350,
        help_text="Comment text (max 350 characters)"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(
        default=False,
        help_text="Soft delete: shows 'Comment deleted' instead of text"
    )
    likes_count = models.IntegerField(
        default=0,
        help_text="Number of likes (for future implementation)"
    )
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Debate Comment'
        verbose_name_plural = 'Debate Comments'
        indexes = [
            models.Index(fields=['debate', 'created_at']),
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        if self.is_deleted:
            return f"[Deleted comment] by {self.user.username}"
        text_preview = self.text[:50] if len(self.text) > 50 else self.text
        return f"{self.user.username}: {text_preview}"


class Notification(models.Model):
    """
    User notifications for debate interactions
    """
    NOTIFICATION_TYPES = [
        ('debate_comment', 'New comment on your debate'),
        ('debate_reply', 'Reply to your comment'),
        ('debate_mention', 'Mentioned in a comment'),
        ('debate_on_my_abstract', 'New debate on an abstract you classified'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text="User who receives this notification"
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_TYPES,
        db_index=True
    )
    
    # Related objects
    debate = models.ForeignKey(
        AbstractDebate,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    comment = models.ForeignKey(
        DebateComment,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='triggered_notifications',
        help_text="User who triggered this notification (e.g., who commented)"
    )
    
    # Notification content
    message = models.TextField(help_text="Notification message")
    
    # Status
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['notification_type', '-created_at']),
        ]
    
    def __str__(self):
        status = "Read" if self.is_read else "Unread"
        return f"[{status}] {self.get_notification_type_display()} for {self.user.username}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            from django.utils import timezone
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class EngagementEmail(models.Model):
    """
    Audit log of every engagement email we send (or try to send).

    One row per (user, dedupe_key). The dedupe key encodes *why* the email went
    out (``milestone:50``, ``reengagement:lapsed:2026-09-01:1``) so the policy
    in ``engagement.py`` can ask "did we already send this?" and the cooldown
    can ask "when did we last email this person?". Failed sends are kept (with
    the error) but do not count as sent, so they are retried on the next run.
    """
    TYPE_MILESTONE = 'milestone'
    TYPE_REENGAGEMENT_NEVER = 'reengagement_never'
    TYPE_REENGAGEMENT_LAPSED = 'reengagement_lapsed'
    EMAIL_TYPES = [
        (TYPE_MILESTONE, 'Milestone reached'),
        (TYPE_REENGAGEMENT_NEVER, 'Re-engagement: never classified'),
        (TYPE_REENGAGEMENT_LAPSED, 'Re-engagement: stopped classifying'),
    ]

    STATUS_SENT = 'sent'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_SENT, 'Sent'),
        (STATUS_FAILED, 'Failed'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='engagement_emails',
    )
    email_type = models.CharField(max_length=30, choices=EMAIL_TYPES, db_index=True)
    dedupe_key = models.CharField(
        max_length=100,
        help_text="Why this email was sent; unique per user (e.g. 'milestone:50')"
    )
    recipient_email = models.EmailField(help_text="Address at the time of sending")
    subject = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_SENT, db_index=True)
    error = models.TextField(blank=True)
    payload = models.JSONField(
        default=dict, blank=True,
        help_text="Numbers used to decide/render (milestone, days inactive, attempt...)"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'dedupe_key']
        indexes = [
            models.Index(fields=['user', 'status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.email_type} -> {self.recipient_email} ({self.status})"


class Keyword(models.Model):
    """
    Normalized keyword extracted from the free-text Abstract.keywords field.

    Abstract.keywords stays as-is (semicolon-delimited text, used for display and
    import back-compat). This table is the normalized, deduplicated view that
    powers reliable filtering, counts and keyword-based Challenges.

    Populated/refreshed by the `populate_keywords` management command and kept in
    sync on import. `name` is the canonical lowercase form (used for matching);
    `label` is the nicest original spelling (used for display).
    """
    name = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="Canonical normalized form (lowercased, stripped) — used for matching"
    )
    label = models.CharField(
        max_length=255,
        help_text="Most common original spelling — used for display (e.g. 'eBird', 'COVID-19')"
    )
    slug = models.SlugField(max_length=280, unique=True, db_index=True)
    abstracts = models.ManyToManyField(
        'abstracts.Abstract',
        related_name='keywords_rel',
        blank=True,
    )
    abstract_count = models.PositiveIntegerField(
        default=0,
        db_index=True,
        help_text="Cached number of abstracts with this keyword (refreshed by populate_keywords)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Keyword'
        verbose_name_plural = 'Keywords'
        ordering = ['-abstract_count', 'name']
        indexes = [
            models.Index(fields=['-abstract_count']),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)[:280]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.label} ({self.abstract_count})"


class WosCategory(models.Model):
    """
    Normalized Web of Science Category (WC field), extracted from the free-text
    Abstract.wos_categories. Same shape and rationale as Keyword: the free text
    stays untouched; this is the deduplicated view that powers wos_category
    Challenges. Named WosCategory to avoid clashing with the classification
    taxonomy `Category`.
    """
    name = models.CharField(
        max_length=255, unique=True, db_index=True,
        help_text="Canonical normalized form (lowercased, stripped) — used for matching"
    )
    label = models.CharField(
        max_length=255,
        help_text="Most common original spelling — used for display"
    )
    slug = models.SlugField(max_length=280, unique=True, db_index=True)
    abstracts = models.ManyToManyField(
        'abstracts.Abstract',
        related_name='wos_categories_rel',
        blank=True,
    )
    abstract_count = models.PositiveIntegerField(
        default=0, db_index=True,
        help_text="Cached number of abstracts in this category (refreshed by populate_wos_categories)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'WoS Category'
        verbose_name_plural = 'WoS Categories'
        ordering = ['-abstract_count', 'name']
        indexes = [
            models.Index(fields=['-abstract_count']),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)[:280]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.label} ({self.abstract_count})"


class Challenge(models.Model):
    """
    A participable "Reto": a lens over the single global abstract corpus.

    A Challenge is NOT a separate dataset — it's a filter. 'general' is the whole
    active corpus; 'keyword'/'journal' scope it down. Because it's just a filter,
    a single classification counts towards every challenge the abstract belongs
    to, and a challenge is "completed" exactly when all its abstracts have reached
    consensus (which already removes them from the classification queue).
    """
    TYPE_GENERAL = 'general'
    TYPE_KEYWORD = 'keyword'
    TYPE_JOURNAL = 'journal'
    TYPE_WOS = 'wos_category'
    CHALLENGE_TYPES = [
        (TYPE_GENERAL, 'General (whole corpus)'),
        (TYPE_KEYWORD, 'Keyword'),
        (TYPE_JOURNAL, 'Journal'),
        (TYPE_WOS, 'WoS Category'),
    ]

    challenge_type = models.CharField(
        max_length=15, choices=CHALLENGE_TYPES, db_index=True
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, db_index=True)

    # Scope (exactly one is set depending on challenge_type; general uses none)
    keyword = models.ForeignKey(
        Keyword,
        null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='challenges',
        help_text="Set when challenge_type='keyword'"
    )
    wos_category = models.ForeignKey(
        WosCategory,
        null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='challenges',
        help_text="Set when challenge_type='wos_category'"
    )
    journal_name = models.CharField(
        max_length=500, blank=True,
        help_text="Set when challenge_type='journal' (matches Abstract.journal exactly)"
    )

    is_active = models.BooleanField(default=True, db_index=True)

    # Cached stats — refreshed by `populate_challenges --refresh-stats`. Live
    # values are computed in the API; these are a convenience for fast listing.
    total_abstracts = models.PositiveIntegerField(default=0)
    completed_abstracts = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Challenge'
        verbose_name_plural = 'Challenges'
        ordering = ['challenge_type', 'title']
        indexes = [
            models.Index(fields=['challenge_type', 'is_active']),
        ]
        constraints = [
            # Only one general challenge can exist.
            models.UniqueConstraint(
                fields=['challenge_type'],
                condition=models.Q(challenge_type='general'),
                name='unique_general_challenge',
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            base = self.title or self.challenge_type
            self.slug = slugify(f"{self.challenge_type}-{base}")[:280]
        super().save(*args, **kwargs)

    def get_abstract_queryset(self):
        """Active abstracts in this challenge's scope. The single source of truth
        for both the classification queue and the challenge stats."""
        qs = Abstract.objects.filter(is_active=True)
        if self.challenge_type == self.TYPE_KEYWORD and self.keyword_id:
            return qs.filter(keywords_rel=self.keyword_id)
        if self.challenge_type == self.TYPE_WOS and self.wos_category_id:
            return qs.filter(wos_categories_rel=self.wos_category_id)
        if self.challenge_type == self.TYPE_JOURNAL and self.journal_name:
            return qs.filter(journal=self.journal_name)
        return qs  # general

    @staticmethod
    def stats_dict(total, completed, target=0, done=0, my_contributions=None):
        """Build the canonical stats payload from raw counts.

        Two granularities:
        - abstract-level: total/completed_abstracts (completed = reached consensus)
        - classification-level: classifications_target (sum of required per abstract)
          vs classifications_done (sum of classifications actually made)
        """
        in_progress = max(total - completed, 0)
        pct = round(completed / total * 100, 1) if total else 0.0
        cl_pct = min(round(done / target * 100, 1), 100.0) if target else 0.0
        data = {
            'total_abstracts': total,
            'completed_abstracts': completed,
            'in_progress': in_progress,
            'progress_pct': pct,
            'is_completed': total > 0 and completed >= total,
            'classifications_target': target,
            'classifications_done': done,
            'classifications_pct': cl_pct,
        }
        if my_contributions is not None:
            data['my_contributions'] = my_contributions
        return data

    def live_stats(self, user=None):
        """Compute stats on the fly for a single challenge (used in detail/queue).
        For the catalog the viewset batches these to avoid N queries.

        `classifications_done` counts real Classification rows (not the cached
        Abstract.current_classifications_count, which can drift from seed data)."""
        scope = self.get_abstract_queryset()
        agg = scope.aggregate(
            total=Count('id'),
            completed=Count('id', filter=Q(consensus_reached=True)),
            target=Sum('required_classifications'),
        )
        done = Classification.objects.filter(
            abstract__in=scope, is_valid=True
        ).count()
        my = None
        if user is not None and getattr(user, 'is_authenticated', False):
            my = Classification.objects.filter(
                user=user, abstract__in=scope, is_valid=True
            ).count()
        return self.stats_dict(
            agg['total'], agg['completed'], agg['target'] or 0, done, my
        )

    def __str__(self):
        return f"[{self.get_challenge_type_display()}] {self.title}"


class ChallengeParticipation(models.Model):
    """
    The "persistent-light" piece: records that a user joined a Challenge so the
    app can show their active challenges and resume where they were. Progress and
    stats are always computed live from classifications — nothing is duplicated
    here.
    """
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='challenge_participations'
    )
    challenge = models.ForeignKey(
        Challenge, on_delete=models.CASCADE, related_name='participations'
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    last_activity_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Updated whenever the user classifies within this challenge"
    )

    class Meta:
        unique_together = ['user', 'challenge']
        ordering = ['-last_activity_at', '-joined_at']
        verbose_name = 'Challenge Participation'
        verbose_name_plural = 'Challenge Participations'
        indexes = [
            models.Index(fields=['user', '-last_activity_at']),
            models.Index(fields=['challenge']),
        ]

    def __str__(self):
        return f"{self.user.email} → {self.challenge.title}"
