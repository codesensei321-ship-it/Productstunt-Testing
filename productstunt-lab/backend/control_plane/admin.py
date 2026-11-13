from django.contrib import admin
from .models import Proxy, Bot, Account, Campaign, ActivityLog

@admin.register(Proxy)
class ProxyAdmin(admin.ModelAdmin):
    list_display = ('ip', 'port', 'geo', 'city', 'latency_ms', 'health_status', 'is_active', 'last_checked')
    list_filter = ('health_status', 'geo', 'is_active')
    search_fields = ('ip', 'username', 'city', 'isp')

@admin.register(Bot)
class BotAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'proxy', 'vnc_port', 'cookies_count', 'profile_size_mb', 'last_active')
    list_filter = ('status',)
    search_fields = ('name', 'profile_path')

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('bot', 'mailbox_provider', 'mailbox_email', 'app_email', 'is_verified')
    list_filter = ('mailbox_provider', 'is_verified')
    search_fields = ('mailbox_email', 'app_email')

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ('id', 'target_url', 'votes_requested', 'votes_completed', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('target_url',)

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'bot', 'action', 'target_url', 'status_code')
    list_filter = ('action', 'status_code')
    search_fields = ('bot__name', 'target_url', 'details')
