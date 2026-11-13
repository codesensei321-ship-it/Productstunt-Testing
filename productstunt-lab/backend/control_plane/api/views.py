import random
import os
import subprocess
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from control_plane.models import Proxy, Bot, Account, Campaign, ActivityLog
from control_plane.api.serializers import (
    ProxySerializer, BotSerializer, AccountSerializer,
    CampaignSerializer, ActivityLogSerializer
)
from control_plane.tasks import execute_bot_session

class ProxyViewSet(viewsets.ModelViewSet):
    queryset = Proxy.objects.all().order_by('id')
    serializer_class = ProxySerializer

    @action(detail=False, methods=['post'])
    def health_check(self, request):
        """Triggers background or synchronous health check across all Webshare Static ISP proxies."""
        from control_plane.tasks import check_proxy_health
        results = check_proxy_health()
        return Response(results, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def ping(self, request, pk=None):
        """Performs immediate socket connection test to measure real round-trip latency."""
        import socket
        import time
        proxy = self.get_object()
        start = time.time()
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2.5)
            err = sock.connect_ex((proxy.ip, proxy.port))
            duration_ms = int((time.time() - start) * 1000)
            sock.close()

            if err == 0:
                proxy.latency_ms = duration_ms
                proxy.health_status = 'ONLINE' if duration_ms < 120 else 'DEGRADED'
                proxy.packet_loss_percent = 0
                proxy.is_active = True
            else:
                proxy.health_status = 'OFFLINE'
                proxy.latency_ms = 999
                proxy.packet_loss_percent = 100

            proxy.last_checked = timezone.now()
            proxy.save(update_fields=['latency_ms', 'health_status', 'packet_loss_percent', 'is_active', 'last_checked'])
            return Response(self.get_serializer(proxy).data)
        except Exception as e:
            proxy.health_status = 'OFFLINE'
            proxy.latency_ms = 999
            proxy.packet_loss_percent = 100
            proxy.last_checked = timezone.now()
            proxy.save(update_fields=['latency_ms', 'health_status', 'packet_loss_percent', 'last_checked'])
            return Response({"error": str(e), "proxy": self.get_serializer(proxy).data}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def import_csv(self, request):
        """Imports bulk Webshare proxy CSV credentials."""
        csv_text = request.data.get('csv_data', '').strip()
        if not csv_text:
            return Response({"error": "No CSV data provided"}, status=status.HTTP_400_BAD_REQUEST)

        lines = [line.strip() for line in csv_text.split('\n') if line.strip() and not line.startswith('#')]
        imported = 0
        for idx, line in enumerate(lines[:100]):
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 4:
                ip, port_str, username, password = parts[0], parts[1], parts[2], parts[3]
                geo = parts[4] if len(parts) > 4 else 'US'
                port = int(port_str) if port_str.isdigit() else 80

                proxy = Proxy.objects.filter(id=idx + 1).first()
                if proxy:
                    proxy.ip = ip
                    proxy.port = port
                    proxy.username = username
                    proxy.password = password
                    proxy.geo = geo
                    proxy.last_checked = timezone.now()
                    proxy.save()
                    imported += 1

        return Response({"status": "imported", "count": imported}, status=status.HTTP_200_OK)

class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all().order_by('-created_at')
    serializer_class = CampaignSerializer

    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):
        campaign = self.get_object()
        campaign.status = 'STOPPED'
        campaign.save(update_fields=['status'])
        # Reset assigned bots to IDLE
        Bot.objects.filter(status='ASSIGNED').update(status='IDLE')
        return Response({"status": "stopped", "campaign_id": campaign.id})

    def create(self, request, *args, **kwargs):
        target_url = request.data.get('target_url', '').strip()
        votes_requested = int(request.data.get('votes_requested', 1))
        comments = request.data.get('comments', [])

        # Validate domain against TARGET_URL/STAGING_URL unless dynamic mode or bypass is enabled
        target_domain = getattr(settings, 'TARGET_URL', getattr(settings, 'STAGING_URL', 'https://staging.productstunt.com'))
        allow_any = getattr(settings, 'ALLOW_ANY_HOST', False) or request.data.get('allow_any_host', False)
        if not allow_any and not target_url.startswith(target_domain):
            return Response(
                {"error": f"Invalid target URL. Must start with {target_domain} (or enable ALLOW_ANY_HOST=True in .env)"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Query all IDLE bots
        idle_bots = list(Bot.objects.filter(status='IDLE'))
        if len(idle_bots) < votes_requested:
            return Response(
                {"error": f"Not enough IDLE bots available. Requested: {votes_requested}, Available: {len(idle_bots)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create campaign record
        campaign = Campaign.objects.create(
            target_url=target_url,
            votes_requested=votes_requested,
            comments=comments,
            status='IN_PROGRESS'
        )

        # Select random IDLE bots and schedule Celery tasks with staggered countdown (0 to 7200s)
        selected_bots = random.sample(idle_bots, votes_requested)
        for i, bot in enumerate(selected_bots):
            bot.status = 'ASSIGNED'
            bot.save(update_fields=['status'])

            comment_text = comments[i % len(comments)] if comments else None
            # Stagger delays evenly across the 2-hour window or random uniform
            countdown = random.uniform(5, 7200)

            execute_bot_session.apply_async(
                args=[bot.id, campaign.id, comment_text],
                countdown=countdown
            )

        serializer = self.get_serializer(campaign)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.select_related('bot', 'bot__proxy').all()
    serializer_class = AccountSerializer

    def list(self, request, *args, **kwargs):
        # Also expose Bot list with nested account and proxy
        bots = Bot.objects.select_related('proxy', 'account').all().order_by('id')
        serializer = BotSerializer(bots, many=True)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        account = self.get_object()
        serializer = self.get_serializer(account, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class HistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.select_related('bot').all().order_by('-timestamp')
    serializer_class = ActivityLogSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        action_param = self.request.query_params.get('action')
        bot_id = self.request.query_params.get('bot')
        if action_param:
            qs = qs.filter(action=action_param)
        if bot_id:
            qs = qs.filter(bot_id=bot_id)
        return qs

@api_view(['POST'])
def launch_bot_vnc(request, bot_id):
    """
    Launch a headed browser for bot with Xvfb + x11vnc + websockify.
    Supports 1-click service targets (Gmail, Outlook, Staging).
    Returns VNC port and viewer URL.
    """
    try:
        bot = Bot.objects.get(id=bot_id)
    except Bot.DoesNotExist:
        return Response({"error": "Bot not found"}, status=status.HTTP_404_NOT_FOUND)

    service = request.data.get('service', 'staging').lower()
    service_urls = {
        'gmail': 'https://accounts.google.com/signup',
        'outlook': 'https://signup.live.com',
        'staging': f"{settings.STAGING_URL}/signup",
    }
    start_url = service_urls.get(service, f"{settings.STAGING_URL}/signup")

    display_num = 100 + (bot.id % 500)
    vnc_port = 5900 + (bot.id % 500)
    ws_port = 6080 + (bot.id % 500)

    # Spawn real Xvfb + websockify process if script exists
    script_path = os.path.join(settings.BASE_DIR, 'automation', 'launch_vnc.sh')
    proxy_str = f"http://{bot.proxy.ip}:{bot.proxy.port}" if bot.proxy else ""
    if os.path.exists(script_path):
        try:
            subprocess.Popen([
                "/bin/bash", script_path,
                str(bot.id), str(display_num), str(vnc_port), str(ws_port),
                bot.profile_path, start_url, proxy_str
            ])
        except Exception as e:
            pass

    bot.vnc_port = ws_port
    bot.status = 'RUNNING'
    bot.save(update_fields=['vnc_port', 'status'])

    # Log action
    ActivityLog.objects.create(
        bot=bot,
        action='LAUNCH_VNC',
        target_url=start_url,
        details=f"NoVNC interactive studio started on port {ws_port} (Display :{display_num}) -> {service.upper()}"
    )

    host = os.getenv('NEXT_PUBLIC_NOVNC_HOST', 'localhost')
    return Response({
        "status": "launched",
        "bot_id": bot.id,
        "bot_name": bot.name,
        "service": service,
        "start_url": start_url,
        "vnc_port": vnc_port,
        "websocket_port": ws_port,
        "novnc_url": f"http://{host}:{ws_port}/vnc.html?host={host}&port={ws_port}&autoconnect=true",
        "profile_path": bot.profile_path,
        "proxy": f"{bot.proxy.ip}:{bot.proxy.port}" if bot.proxy else "Direct"
    })

@api_view(['POST'])
def stop_bot_vnc(request, bot_id):
    try:
        bot = Bot.objects.get(id=bot_id)
        bot.status = 'IDLE'
        bot.save(update_fields=['status'])

        ActivityLog.objects.create(
            bot=bot,
            action='STOP_VNC',
            target_url=settings.STAGING_URL,
            details="Interactive NoVNC session saved & closed."
        )
        return Response({"status": "stopped", "bot_id": bot.id})
    except Bot.DoesNotExist:
        return Response({"error": "Bot not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def emergency_kill_switch(request):
    """
    Emergency kill switch:
    1. Purges Redis Celery queue
    2. Resets all running/assigned bots to IDLE
    3. Aborts in-progress campaigns
    """
    from config.celery import app as celery_app

    # Purge Redis queue
    purged_tasks = 0
    try:
        purged_tasks = celery_app.control.purge()
    except Exception as e:
        pass

    # Reset bots
    updated_bots = Bot.objects.exclude(status='IDLE').update(status='IDLE')

    # Abort active campaigns
    Campaign.objects.filter(status='IN_PROGRESS').update(status='STOPPED')

    return Response({
        "status": "killed",
        "purged_tasks": purged_tasks,
        "reset_bots": updated_bots,
        "timestamp": timezone.now().isoformat()
    })

@api_view(['GET'])
def system_metrics(request):
    """
    Provides VPS system metrics (Contabo 6 vCPU, 12 GB RAM, 4 GB Swap) and Celery state
    """
    idle_bots = Bot.objects.filter(status='IDLE').count()
    running_bots = Bot.objects.filter(status='RUNNING').count()
    assigned_bots = Bot.objects.filter(status='ASSIGNED').count()
    total_bots = Bot.objects.count()

    return Response({
        "vps": {
            "model": "Contabo Cloud VPS 6",
            "cpu_cores": 6,
            "total_ram_mb": 12288,
            "swap_mb": 4096,
            "concurrency": 4,
            "shm_size": "2GB",
        },
        "bot_pool": {
            "total": total_bots,
            "idle": idle_bots,
            "running": running_bots,
            "assigned": assigned_bots,
        },
        "staging_url": settings.STAGING_URL
    })
