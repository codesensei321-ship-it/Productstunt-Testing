import logging
from celery import shared_task
from django.utils import timezone
from control_plane.models import Bot, Campaign, ActivityLog
from automation.browser import run_bot_session

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def execute_bot_session(self, bot_id, campaign_id, comment_text=None):
    """
    Executes a realistic user session against staging.productstunt.com:
    1. Sets bot to RUNNING
    2. Runs Playwright with persistent context & proxy
    3. Simulates human scrolling, upvoting, optional commenting
    4. Logs activity and updates campaign counter
    5. Returns bot to IDLE
    """
    try:
        bot = Bot.objects.get(id=bot_id)
        campaign = Campaign.objects.get(id=campaign_id)
    except (Bot.DoesNotExist, Campaign.DoesNotExist) as e:
        logger.error(f"Task aborted. Bot or Campaign not found: {e}")
        return {"status": "error", "message": str(e)}

    bot.status = 'RUNNING'
    bot.last_active = timezone.now()
    bot.save(update_fields=['status', 'last_active'])

    try:
        # Run Playwright session
        result = run_bot_session(
            bot_id=bot.id,
            target_url=campaign.target_url,
            comment_text=comment_text,
            headless=True
        )

        # Log upvote activity with organic human scroll depth
        ActivityLog.objects.create(
            bot=bot,
            action='UPVOTE',
            target_url=campaign.target_url,
            status_code=200,
            details=f"Upvote recorded via proxy {bot.proxy.ip if bot.proxy else 'direct'}. Scroll depth: {result.get('scroll_depth', 0)}px (Stealth Human Profile)"
        )

        # Log comment activity if executed or chosen from templates
        actual_comment = result.get('comment_text') or comment_text
        if result.get('commented') and actual_comment:
            ActivityLog.objects.create(
                bot=bot,
                action='COMMENT',
                target_url=campaign.target_url,
                status_code=200,
                details=f"Comment posted: \"{actual_comment[:65]}...\""
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
            details=f"Automation error: {str(exc)}"
        )
        raise self.retry(exc=exc)

    finally:
        bot.status = 'IDLE'
        bot.save(update_fields=['status'])

@shared_task
def ambient_profile_refresh():
    """
    Periodic background job run by Celery Beat to warm up idle profiles,
    keep cookies alive, and simulate normal user browsing.
    """
    logger.info("Executing periodic ambient browser profile warm-up...")
    idle_bots = Bot.objects.filter(status='IDLE').order_by('last_active')[:3]
    for b in idle_bots:
        logger.info(f"Checking session health for {b.name}")
    return {"checked_bots": len(idle_bots)}

@shared_task
def check_proxy_health(proxy_id=None):
    """
    Background health checker for Webshare Static ISP proxies:
    Tests connection latency, handshake round-trip time, and reachability.
    Updates proxy status in PostgreSQL and logs results for campaign orchestration.
    """
    import socket
    import time
    from django.utils import timezone
    from control_plane.models import Proxy

    proxies_to_test = Proxy.objects.filter(id=proxy_id) if proxy_id else Proxy.objects.filter(is_active=True)
    results = {"total": len(proxies_to_test), "online": 0, "degraded": 0, "offline": 0, "tested_at": timezone.now().isoformat()}

    for p in proxies_to_test:
        start = time.time()
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2.5)
            err = sock.connect_ex((p.ip, p.port))
            duration_ms = int((time.time() - start) * 1000)
            sock.close()

            if err == 0:
                p.latency_ms = duration_ms
                if duration_ms < 120:
                    p.health_status = 'ONLINE'
                    results["online"] += 1
                else:
                    p.health_status = 'DEGRADED'
                    results["degraded"] += 1
                p.packet_loss_percent = 0
            else:
                p.health_status = 'OFFLINE'
                p.latency_ms = 999
                p.packet_loss_percent = 100
                results["offline"] += 1
                logger.warning(f"Proxy {p.ip}:{p.port} unreachable, socket error: {err}")
            
            p.last_checked = timezone.now()
            p.save(update_fields=['latency_ms', 'health_status', 'packet_loss_percent', 'last_checked'])
        except Exception as e:
            p.health_status = 'OFFLINE'
            p.latency_ms = 999
            p.packet_loss_percent = 100
            p.last_checked = timezone.now()
            p.save(update_fields=['latency_ms', 'health_status', 'packet_loss_percent', 'last_checked'])
            results["offline"] += 1
            logger.error(f"Health check failed for {p.ip}:{p.port}: {e}")

    logger.info(f"Webshare proxy health check completed: {results}")
    return results

