from rest_framework import serializers
from control_plane.models import Proxy, Bot, Account, Campaign, ActivityLog


class ProxySerializer(serializers.ModelSerializer):
    has_auth = serializers.SerializerMethodField()

    class Meta:
        model = Proxy
        fields = [
            'id', 'scheme', 'proxy_type', 'ip', 'port', 'username', 'password',
            'has_auth', 'exit_ip', 'geo', 'city', 'isp',
            'latency_ms', 'health_status', 'packet_loss_percent', 'is_active',
            'last_checked', 'created_at'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def get_has_auth(self, obj):
        return bool(obj.username)


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            'id', 'mailbox_provider', 'mailbox_email', 'mailbox_password',
            'app_email', 'app_password', 'is_verified', 'updated_at'
        ]
        extra_kwargs = {
            'mailbox_password': {'write_only': True},
            'app_password': {'write_only': True}
        }


class BotSerializer(serializers.ModelSerializer):
    proxy = ProxySerializer(read_only=True)
    account = AccountSerializer(read_only=True)

    class Meta:
        model = Bot
        fields = [
            'id', 'name', 'status', 'profile_path', 'vnc_port', 'last_active',
            'cookies_count', 'profile_size_mb', 'proxy', 'account'
        ]


class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = [
            'id', 'target_url', 'votes_requested', 'votes_completed',
            'comments', 'comments_completed', 'status', 'created_at'
        ]


class ActivityLogSerializer(serializers.ModelSerializer):
    bot_name = serializers.CharField(source='bot.name', read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'bot', 'bot_name', 'action', 'target_url', 'timestamp', 'status_code', 'details']
