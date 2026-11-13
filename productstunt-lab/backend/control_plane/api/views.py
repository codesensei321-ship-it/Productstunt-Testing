import json
import os
import random
import signal
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
from control_plane.tasks import execute_bot_session, verify_single_proxy, check_proxy_health
from control_plane.management.commands.seed_bots import parse_proxy_lines
from automation.stealth import get_bot_fingerprint, build_stealth_init_script, STEALTH_CHROMIUM_ARGS
from automation.browser import _measure_profile_mb


def _kill_vnc_pids(bot_id: int):
    pid_file = f"/tmp/vnc_bot_{bot_id}.pids"
    if os.path.exists(pid_file):
        try:
            with open(pid_file, 'r', encoding='utf-8') as f:
                for line in f:
                    pid_str = line.strip()
                    if pid_str.isdigit():
                        try:
                            os.kill(int(pid_str), signal.SIGKILL)
                        except ProcessLookupError:
                            pass
                        except Exception:
                            pass
            os.remove(pid_file)
        except Exception:
            pass


class ProxyViewSet(viewsets.ModelViewSet):
    queryset = Proxy.objects.all().order_by('id')
    serializer_class = ProxySerializer

    @action(detail=False, methods=['post'])
    def health_check(self, request):
        results = check_proxy_health()
        return Response(results, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def ping(self, request, pk=None):
        proxy = self.get_object()
        error_detail = verify_single_proxy(proxy)
        data = self.get_serializer(proxy).data
        if error_detail:
            data['error_detail'] = error_detail
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def import_csv(self, request):
        """
        Imports proxies in any format (ip,port,user,pass / ip:port:user:pass / socks5://user:pass@ip:port)
        and automatically distributes bots across all imported proxies.
        """
        raw_text = request.data.get('csv_data', '').strip()
        proxy_type = request.data.get('proxy_type', 'FREE')
        replace_all = request.data.get('replace_all', True)

        if proxy_type not in ('FREE', 'ISP', 'RESIDENTIAL'):
            proxy_type = 'FREE'

        if not raw_text:
            return Response({"error": "No proxy list provided"}, status=status.HTTP_400_BAD_REQUEST)

        parsed = parse_proxy_lines(raw_text)
        if not parsed:
            return Response(
                {"error": "Could not parse any valid proxies. Use ip,port,user,pass or ip:port:user:pass"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if replace_all:
            Bot.objects.update(proxy=None)
            Proxy.objects.all().delete()

        created_proxies = []
        for idx, p_info in enumerate(parsed[:100], start=1):
            proxy, _ = Proxy.objects.update_or_create(
                ip=p_info['ip'],
                port=p_info['port'],
                defaults={
                    'scheme': p_info.get('scheme', 'http'),
                    'proxy_type': proxy_type,
                    'username': p_info.get('username', ''),
                    'password': p_info.get('password', ''),
                    'geo': p_info.get('geo', 'US'),
                    'city': p_info.get('city', 'Imported'),
                    'isp': f"{proxy_type.title()} Proxy #{idx:02d}",
                    'health_status': 'ONLINE',
                    'is_active': True,
                    'last_checked': timezone.now(),
                }
            )
            created_proxies.append(proxy)

        bots = list(Bot.objects.all().order_by('id'))
        for idx, bot in enumerate(bots):
            bot.proxy = created_proxies[idx % len(created_proxies)]
            bot.save(update_fields=['proxy'])

        return Response(
            {
                "status": "imported",
                "count": len(created_proxies),
                "reassigned_bots": len(bots),
                "proxy_type": proxy_type,
            },
            status=status.HTTP_200_OK,
        )


class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all().order_by('-created_at')
    serializer_class = CampaignSerializer

    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):
        campaign = self.get_object()
        campaign.status = 'STOPPED'
        campaign.save(update_fields=['status'])
        Bot.objects.filter(status='ASSIGNED').update(status='IDLE')
        return Response({"status": "stopped", "campaign_id": campaign.id})

    def create(self, request, *args, **kwargs):
        target_url = request.data.get('target_url', '').strip()
        votes_requested = max(1, int(request.data.get('votes_requested', 1)))
        comments = request.data.get('comments', [])
        execution_mode = request.data.get('execution_mode', 'fast')

        target_domain = getattr(settings, 'TARGET_URL', getattr(settings, 'STAGING_URL', 'https://staging.productstunt.com'))
        allow_any = getattr(settings, 'ALLOW_ANY_HOST', True) or request.data.get('allow_any_host', False)
        if not allow_any and not target_url.startswith(target_domain):
            return Response(
                {"error": f"Invalid target URL. Must start with {target_domain} (or enable Allow Any Host)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        idle_bots = list(Bot.objects.filter(status='IDLE'))
        if len(idle_bots) < votes_requested:
            return Response(
                {"error": f"Not enough IDLE bots available. Requested: {votes_requested}, Available: {len(idle_bots)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campaign = Campaign.objects.create(
            target_url=target_url,
            votes_requested=votes_requested,
            comments=comments,
            status='IN_PROGRESS',
        )

        # Prefer verified bots first when available
        verified_idle = [b for b in idle_bots if getattr(getattr(b, 'account', None), 'is_verified', False)]
        unverified_idle = [b for b in idle_bots if b not in verified_idle]
        ordered_pool = verified_idle + unverified_idle
        selected_bots = ordered_pool[:votes_requested] if len(verified_idle) >= votes_requested else random.sample(idle_bots, votes_requested)

        for i, bot in enumerate(selected_bots):
            bot.status = 'ASSIGNED'
            bot.save(update_fields=['status'])

            comment_text = comments[i % len(comments)] if comments else None
            if execution_mode == 'organic':
                countdown = random.uniform(5, 7200)
            elif execution_mode == 'balanced':
                countdown = random.uniform(8, 90)
            else:
                countdown = 2 + (i * random.uniform(2.5, 5.0))

            execute_bot_session.apply_async(
                args=[bot.id, campaign.id, comment_text],
                countdown=countdown,
            )

        serializer = self.get_serializer(campaign)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.select_related('bot', 'bot__proxy').all()
    serializer_class = AccountSerializer

    def list(self, request, *args, **kwargs):
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
    Launch a headed stealth browser for bot with Xvfb + x11vnc + websockify
    using full proxy authentication (username/password) & persistent fingerprint.
    """
    try:
        bot = Bot.objects.select_related('proxy').get(id=bot_id)
    except Bot.DoesNotExist:
        return Response({"error": "Bot not found"}, status=status.HTTP_404_NOT_FOUND)

    service = request.data.get('service', 'gmail').lower()
    custom_url = request.data.get('custom_url', '').strip()
    service_urls = {
        'gmail': 'https://accounts.google.com/signup',
        'outlook': 'https://signup.live.com',
        'productstunt': f"{settings.STAGING_URL}/signup",
        'staging': f"{settings.STAGING_URL}/signup",
        'ipcheck': 'https://browserleaks.com/ip',
    }
    start_url = custom_url if custom_url.startswith(('http://', 'https://')) else service_urls.get(service, f"{settings.STAGING_URL}/signup")

    display_num = 100 + (bot.id % 500)
    vnc_port = 5900 + (bot.id % 500)
    ws_port = 6080 + (bot.id % 500)

    # Terminate any previous VNC session for this bot cleanly
    _kill_vnc_pids(bot.id)

    fp = get_bot_fingerprint(bot.id, proxy=bot.proxy)
    stealth_js = build_stealth_init_script(fp)
    proxy_cfg = bot.proxy.to_playwright_dict() if (bot.proxy and bot.proxy.is_active) else None

    cfg_path = f"/tmp/vnc_bot_{bot.id}.json"
    with open(cfg_path, 'w', encoding='utf-8') as f:
        json.dump({
            "profile_path": bot.profile_path,
            "start_url": start_url,
            "proxy": proxy_cfg,
            "viewport": fp["viewport"],
            "user_agent": fp["user_agent"],
            "locale": fp["locale"],
            "timezone_id": fp["timezone_id"],
            "args": STEALTH_CHROMIUM_ARGS,
            "extra_http_headers": {
                "sec-ch-ua": fp["sec_ch_ua"],
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": fp["sec_ch_ua_platform"],
                "Accept-Language": f"{fp['locale']},en;q=0.9",
            },
            "stealth_js": stealth_js,
        }, f)

    script_path = os.path.join(settings.BASE_DIR, 'automation', 'launch_vnc.sh')
    if os.path.exists(script_path):
        proc = subprocess.Popen([
            "/bin/bash", script_path,
            str(bot.id), str(display_num), str(vnc_port), str(ws_port), cfg_path,
        ])
        bot.vnc_pid = proc.pid

    bot.vnc_port = ws_port
    bot.status = 'RUNNING'
    bot.save(update_fields=['vnc_port', 'vnc_pid', 'status'])

    ActivityLog.objects.create(
        bot=bot,
        action='LAUNCH_VNC',
        target_url=start_url,
        details=f"NoVNC stealth browser started on port {ws_port} via {bot.proxy.scheme + '://' + bot.proxy.ip if bot.proxy else 'direct'} -> {service.upper()}",
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
        "novnc_url": f"http://{host}:{ws_port}/vnc.html?host={host}&port={ws_port}&autoconnect=true&resize=scale",
        "profile_path": bot.profile_path,
        "proxy": f"{bot.proxy.scheme}://{bot.proxy.ip}:{bot.proxy.port}" if bot.proxy else "Direct",
    })


@api_view(['POST'])
def stop_bot_vnc(request, bot_id):
    try:
        bot = Bot.objects.get(id=bot_id)
        _kill_vnc_pids(bot.id)
        bot.status = 'IDLE'
        bot.vnc_pid = None
        if os.path.exists(bot.profile_path):
            bot.profile_size_mb = _measure_profile_mb(bot.profile_path)
        bot.save(update_fields=['status', 'vnc_pid', 'profile_size_mb'])

        ActivityLog.objects.create(
            bot=bot,
            action='STOP_VNC',
            target_url=settings.STAGING_URL,
            details="Interactive NoVNC session saved & closed cleanly.",
        )
        return Response({"status": "stopped", "bot_id": bot.id, "profile_size_mb": bot.profile_size_mb})
    except Bot.DoesNotExist:
        return Response({"error": "Bot not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def emergency_kill_switch(request):
    from config.celery import app as celery_app

    purged_tasks = 0
    try:
        purged_tasks = celery_app.control.purge() or 0
        inspect = celery_app.control.inspect(timeout=1.0)
        active = inspect.active() or {}
        for _, tasks in active.items():
            for t in tasks:
                if t.get('id'):
                    celery_app.control.revoke(t['id'], terminate=True, signal='SIGKILL')
    except Exception:
        pass

    for bot in Bot.objects.exclude(status='IDLE'):
        _kill_vnc_pids(bot.id)

    updated_bots = Bot.objects.exclude(status='IDLE').update(status='IDLE', vnc_pid=None)
    Campaign.objects.filter(status='IN_PROGRESS').update(status='STOPPED')

    return Response({
        "status": "killed",
        "purged_tasks": purged_tasks,
        "reset_bots": updated_bots,
        "timestamp": timezone.now().isoformat(),
    })


@api_view(['GET'])
def system_metrics(request):
    idle_bots = Bot.objects.filter(status='IDLE').count()
    running_bots = Bot.objects.filter(status='RUNNING').count()
    assigned_bots = Bot.objects.filter(status='ASSIGNED').count()
    total_bots = Bot.objects.count()
    verified_bots = Bot.objects.filter(account__is_verified=True).count()
    online_proxies = Proxy.objects.filter(health_status='ONLINE', is_active=True).count()

    return Response({
        "bot_pool": {
            "total": total_bots,
            "idle": idle_bots,
            "running": running_bots,
            "assigned": assigned_bots,
            "verified": verified_bots,
            "online_proxies": online_proxies,
        },
        "staging_url": settings.STAGING_URL,
    })
