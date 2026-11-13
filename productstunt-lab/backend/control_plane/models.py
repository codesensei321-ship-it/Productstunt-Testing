from django.db import models

class Proxy(models.Model):
    HEALTH_CHOICES = [
        ('ONLINE', 'ONLINE'),
        ('DEGRADED', 'DEGRADED'),
        ('OFFLINE', 'OFFLINE'),
        ('CHECKING', 'CHECKING'),
    ]

    ip = models.GenericIPAddressField()
    port = models.IntegerField(default=80)
    username = models.CharField(max_length=100)
    password = models.CharField(max_length=100)
    geo = models.CharField(max_length=50, blank=True, default='US')
    city = models.CharField(max_length=100, blank=True, default='New York')
    isp = models.CharField(max_length=100, blank=True, default='Webshare Static ISP')
    latency_ms = models.IntegerField(default=35)
    health_status = models.CharField(max_length=20, choices=HEALTH_CHOICES, default='ONLINE')
    packet_loss_percent = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    last_checked = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Proxies'
        ordering = ['id']

    def __str__(self):
        return f"{self.ip}:{self.port} [{self.health_status}] ({self.geo} - {self.city})"

class Bot(models.Model):
    STATUS_CHOICES = [
        ('IDLE', 'IDLE'),
        ('RUNNING', 'RUNNING'),
        ('ASSIGNED', 'ASSIGNED'),
        ('ERROR', 'ERROR'),
    ]

    name = models.CharField(max_length=50, unique=True)
    proxy = models.OneToOneField(Proxy, on_delete=models.SET_NULL, null=True, blank=True, related_name='bot')
    profile_path = models.CharField(max_length=255)  # e.g. /data/profiles/bot_001
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IDLE')
    vnc_port = models.IntegerField(null=True, blank=True)
    last_active = models.DateTimeField(null=True, blank=True)
    cookies_count = models.IntegerField(default=24)
    profile_size_mb = models.FloatField(default=16.4)

    def __str__(self):
        return f"{self.name} [{self.status}]"

class Account(models.Model):
    MAILBOX_CHOICES = [
        ('Gmail', 'Gmail'),
        ('Outlook', 'Outlook'),
        ('Yahoo', 'Yahoo'),
        ('Custom', 'Custom IMAP'),
    ]

    bot = models.OneToOneField(Bot, on_delete=models.CASCADE, related_name='account')
    mailbox_provider = models.CharField(max_length=50, choices=MAILBOX_CHOICES, default='Gmail')
    mailbox_email = models.EmailField(blank=True)
    mailbox_password = models.CharField(max_length=255, blank=True)
    app_email = models.EmailField(blank=True)
    app_password = models.CharField(max_length=255, blank=True)
    is_verified = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Account for {self.bot.name} ({self.mailbox_email or 'Unset'})"

class Campaign(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'PENDING'),
        ('IN_PROGRESS', 'IN_PROGRESS'),
        ('COMPLETED', 'COMPLETED'),
        ('STOPPED', 'STOPPED'),
    ]

    target_url = models.URLField()
    votes_requested = models.IntegerField(default=1)
    votes_completed = models.IntegerField(default=0)
    comments = models.JSONField(default=list)  # list of strings
    comments_completed = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Campaign #{self.id} -> {self.target_url} ({self.status})"

class ActivityLog(models.Model):
    bot = models.ForeignKey(Bot, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=50)  # UPVOTE, COMMENT, NAVIGATION, LOGIN, ERROR
    target_url = models.URLField()
    timestamp = models.DateTimeField(auto_now_add=True)
    status_code = models.IntegerField(default=200)
    details = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp}] {self.bot.name} - {self.action}"
