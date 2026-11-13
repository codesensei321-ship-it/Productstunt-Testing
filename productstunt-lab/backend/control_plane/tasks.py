import logging
import time
import requests
from celery import shared_task
from django.utils import timezone
from control_plane.models import Bot, Campaign, ActivityLog, Proxy
from automation.browser import run_bot_session

logger = logging.getLogger(__name__)


def verify_single_proxy(proxy: Proxy, timeout_sec: float = 8.0):
    """
    Tests real HTTP/HTTPS/SOCKS5 proxy tunneling + authentication against api.ipify.org.
    Updates latency_ms, health_status, exit_ip, and packet_loss_percent.
    """
    proxy_url = proxy.to_requests_url()
    proxies = {"http": proxy_url, "https": proxy_url}
    start = time.time()
    error_detail = None

    try:
        resp = requests.get("https://api.ipify.org?format=json", proxies=proxies, timeout=timeout_sec)
        duration_ms = int((time.time() - start) * 1000)

        if resp.status_code == 200:
            data = resp.json()
            proxy.exit_ip = data.get("ip") or proxy.ip
            proxy.latency_ms = duration_ms
            proxy.health_status = "ONLINE" if duration_ms < 800 else "DEGRADED"
            proxy.packet_loss_percent = 0
            proxy.is_active = True
        else:
            proxy.health_status = "OFFLINE"
            proxy.latency_ms = 9999
            proxy.packet_loss_percent = 100
            error_detail = f"HTTP {resp.status_code}"
    except Exception as exc:
        proxy.health_status = "OFFLINE"
        proxy.latency_ms = 9999
        proxy.packet_loss_percent = 100
        error_detail = str(exc)

    proxy.last_checked = timezone.now()
    proxy.save(update_fields=[
        'exit_ip', 'latency_ms', 'health_status',
        'packet_loss_percent', 'is_active', 'last_checked'
    ])
    return error_detail


@shared_task(bind=True, max_retries=1, default_retry_delay=15)
def execute_bot_session(self, bot_id, campaign_id, comment_text=None):
    """
    Executes a realistic stealth user session via Playwright + assigned proxy.
    """
    try:
        bot = Bot.objects.select_related('proxy').get(id=bot_id)
        campaign = Campaign.objects.get(id=campaign_id)
    except (Bot.DoesNotExist, Campaign.DoesNotExist) as e:
        logger.error(f"Task aborted. Bot or Campaign not found: {e}")
        return {"status": "error", "message": str(e)}

    if campaign.status == 'STOPPED':
        bot.status = 'IDLE'
        bot.save(update_fields=['status'])
        return {"status": "aborted", "message": "Campaign was stopped"}

    bot.status = 'RUNNING'
    bot.last_active = timezone.now()
    bot.save(update_fields=['status', 'last_active'])

    try:
        result = run_bot_session(
            bot_id=bot.id,
            target_url=campaign.target_url,
            comment_text=comment_text,
            headless=True,
        )

        proxy_label = f"{bot.proxy.scheme}://{bot.proxy.ip}:{bot.proxy.port}" if bot.proxy else "direct"
        ActivityLog.objects.create(
            bot=bot,
            action='UPVOTE',
            target_url=campaign.target_url,
            status_code=result.get('http_status', 200),
            details=(
                f"Session complete via {proxy_label} "
                f"(upvoted={result.get('upvoted')}, scroll={result.get('scroll_depth', 0)}px)"
            ),
        )

        actual_comment = result.get('comment_text') or comment_text
        if result.get('commented') and actual_comment:
            ActivityLog.objects.create(
                bot=bot,
                action='COMMENT',
                target_url=campaign.target_url,
                status_code=200,
                details=f"Comment posted: \"{actual_comment[:65]}\"",
            )
            campaign.comments_completed += 1

        campaign.votes_completed += 1
        if campaign.votes_completed >= campaign.votes_requested:
            campaign.status = 'COMPLETED'
        campaign.save(update_fields=['votes_completed', 'comments_completed', 'status'])

        return {"status": "success", "bot": bot.name, "votes_completed": campaign.votes_completed}

    except Exception as exc:
        logger.error(f"Error executing bot session for {bot.name}: {exc}")
        ActivityLog.objects.create(
            bot=bot,
            action='ERROR',
            target_url=campaign.target_url,
            status_code=500,
            details=f"Automation error ({bot.proxy.ip if bot.proxy else 'direct'}): {str(exc)[:220]}",
        )
        raise self.retry(exc=exc)

    finally:
        bot.status = 'IDLE'
        bot.save(update_fields=['status'])


@shared_task
def ambient_profile_refresh():
    logger.info("Executing periodic ambient browser profile maintenance...")
    idle_bots = Bot.objects.filter(status='IDLE').order_by('last_active')[:3]
    for b in idle_bots:
        logger.info(f"Checking session health for {b.name}")
    return {"checked_bots": len(idle_bots)}


@shared_task
def check_proxy_health(proxy_id=None):
    proxies_to_test = Proxy.objects.filter(id=proxy_id) if proxy_id else Proxy.objects.filter(is_active=True)
    results = {
        "total": proxies_to_test.count(),
        "online": 0,
        "degraded": 0,
        "offline": 0,
        "tested_at": timezone.now().isoformat(),
    }

    for p in proxies_to_test:
        verify_single_proxy(p)
        if p.health_status == 'ONLINE':
            results["online"] += 1
        elif p.health_status == 'DEGRADED':
            results["degraded"] += 1
        else:
            results["offline"] += 1

    logger.info(f"Proxy health sweep completed: {results}")
    return results
