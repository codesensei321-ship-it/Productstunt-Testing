from django.db import models


class Proxy(models.Model):
    HEALTH_CHOICES = [
        ('ONLINE', 'ONLINE'),
        ('DEGRADED', 'DEGRADED'),
        ('OFFLINE', 'OFFLINE'),
        ('CHECKING', 'CHECKING'),
    ]

    SCHEME_CHOICES = [
        ('http', 'HTTP'),
        ('https', 'HTTPS'),
        ('socks5', 'SOCKS5'),
    ]

    TYPE_CHOICES = [
        ('FREE', 'Free / Shared'),
        ('ISP', 'Static ISP'),
        ('RESIDENTIAL', 'Residential Static'),
    ]

    scheme = models.CharField(max_length=10, choices=SCHEME_CHOICES, default='http')
    proxy_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='ISP')
    ip = models.GenericIPAddressField()
    port = models.IntegerField(default=80)
    username = models.CharField(max_length=150, blank=True, default='')
    password = models.CharField(max_length=150, blank=True, default='')
    exit_ip = models.GenericIPAddressField(null=True, blank=True)
    geo = models.CharField(max_length=50, blank=True, default='US')
    city = models.CharField(max_length=100, blank=True, default='New York')
    isp = models.CharField(max_length=150, blank=True, default='Static ISP Proxy')
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
        return f"{self.scheme}://{self.ip}:{self.port} [{self.health_status}] ({self.geo} - {self.city})"

    def to_playwright_dict(self):
        cfg = {"server": f"{self.scheme}://{self.ip}:{self.port}"}
        if self.username:
            cfg["username"] = self.username
        if self.password:
            cfg["password"] = self.password
        return cfg

    def to_requests_url(self):
        proto = 'socks5h' if self.scheme == 'socks5' else self.scheme
        if self.username and self.password:
            return f"{proto}://{self.username}:{self.password}@{self.ip}:{self.port}"
        return f"{proto}://{self.ip}:{self.port}"


class Bot(models.Model):
    STATUS_CHOICES = [
        ('IDLE', 'IDLE'),
        ('RUNNING', 'RUNNING'),
        ('ASSIGNED', 'ASSIGNED'),
        ('ERROR', 'ERROR'),
    ]

    name = models.CharField(max_length=50, unique=True)
    proxy = models.ForeignKey(Proxy, on_delete=models.SET_NULL, null=True, blank=True, related_name='bots')
    profile_path = models.CharField(max_length=255)  # e.g. /data/profiles/bot_001
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IDLE')
    vnc_port = models.IntegerField(null=True, blank=True)
    vnc_pid = models.IntegerField(null=True, blank=True)
    last_active = models.DateTimeField(null=True, blank=True)
    cookies_count = models.IntegerField(default=0)
    profile_size_mb = models.FloatField(default=0.0)

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
    comments = models.JSONField(default=list)
    comments_completed = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Campaign #{self.id} -> {self.target_url} ({self.status})"


class ActivityLog(models.Model):
    bot = models.ForeignKey(Bot, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=50)
    target_url = models.URLField()
    timestamp = models.DateTimeField(auto_now_add=True)
    status_code = models.IntegerField(default=200)
    details = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp}] {self.bot.name} - {self.action}"
