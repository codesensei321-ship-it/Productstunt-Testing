import os
import logging
from playwright.sync_api import sync_playwright
from django.conf import settings
from control_plane.models import Bot
from automation.stealth import (
    get_bot_fingerprint,
    build_stealth_init_script,
    STEALTH_CHROMIUM_ARGS,
)
from automation.human_behavior import (
    action_delay,
    human_scroll_randomized,
    human_type,
    random_mouse_hover,
    human_move_and_click,
)

logger = logging.getLogger(__name__)


def _measure_profile_mb(profile_path):
    total_bytes = 0
    for root, _, files in os.walk(profile_path):
        for f in files:
            try:
                total_bytes += os.path.getsize(os.path.join(root, f))
            except OSError:
                pass
    return round(total_bytes / (1024 * 1024), 2)


def run_bot_session(bot_id, target_url, comment_text=None, headless=True):
    """
    Spawns an isolated Playwright Chromium instance backed by a persistent profile directory
    and routed through the assigned proxy (free HTTP/SOCKS5 or residential/ISP static IP).
    """
    bot = Bot.objects.select_related('proxy').get(id=bot_id)
    proxy = bot.proxy

    target_base = getattr(settings, 'TARGET_URL', getattr(settings, 'STAGING_URL', 'https://staging.productstunt.com'))
    allow_any = getattr(settings, 'ALLOW_ANY_HOST', True) or getattr(settings, 'ALLOW_TEST_DOMAINS', False)
    if not allow_any and not target_url.startswith(target_base):
        raise ValueError(
            f"Security Policy Violation: Target URL {target_url} does not match configured target {target_base}. "
            "Set ALLOW_ANY_HOST=True or TARGET_URL in .env to allow this domain."
        )

    proxy_cfg = proxy.to_playwright_dict() if (proxy and proxy.is_active) else None

    os.makedirs(bot.profile_path, exist_ok=True)
    # Remove stale Chromium SingletonLock if container crashed mid-run
    for lock_name in ('SingletonLock', 'SingletonCookie', 'SingletonSocket'):
        lock_file = os.path.join(bot.profile_path, lock_name)
        if os.path.exists(lock_file) or os.path.islink(lock_file):
            try:
                os.remove(lock_file)
            except OSError:
                pass

    fp = get_bot_fingerprint(bot.id, proxy=proxy)
    stealth_js = build_stealth_init_script(fp)
    goto_timeout = int(os.getenv('PAGE_GOTO_TIMEOUT_MS', '60000'))

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=bot.profile_path,
            headless=headless,
            viewport=fp['viewport'],
            user_agent=fp['user_agent'],
            locale=fp['locale'],
            timezone_id=fp['timezone_id'],
            proxy=proxy_cfg,
            ignore_default_args=["--enable-automation"],
            args=STEALTH_CHROMIUM_ARGS,
            extra_http_headers={
                "sec-ch-ua": fp["sec_ch_ua"],
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": fp["sec_ch_ua_platform"],
                "Accept-Language": f"{fp['locale']},en;q=0.9",
            },
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.add_init_script(stealth_js)

        proxy_label = f"{proxy.scheme}://{proxy.ip}:{proxy.port}" if proxy else "direct"
        logger.info(f"Bot {bot.name} launching stealth session to {target_url} via {proxy_label} ({fp['timezone_id']})")
        response = page.goto(target_url, wait_until="domcontentloaded", timeout=goto_timeout)

        # 1. Natural arrival dwell
        action_delay(0.8, 2.8)

        # 2. Exploratory mouse movement
        random_mouse_hover(page)

        # 3. Dynamic human scrolling with micro-reversals
        depth = human_scroll_randomized(page, max_depth=1600, speed_profile='dynamic')

        # 4. Action delay before upvote decision
        action_delay(0.6, 2.5)

        # 5. Locate and click upvote button
        upvote_selectors = [
            "button[data-test='vote-button']",
            "[data-test*='vote-button']",
            "[aria-label*='Vote']",
            "button[data-testid='upvote-btn']",
            "button.upvote-button",
            "button:has-text('Upvote')",
            "button:has-text('Vote')",
            "[aria-label='Upvote']",
        ]

        upvoted = False
        for sel in upvote_selectors:
            locator = page.locator(sel).first
            try:
                if locator.count() > 0 and locator.is_visible():
                    locator.scroll_into_view_if_needed()
                    action_delay(0.3, 0.8)
                    human_move_and_click(page, locator)
                    upvoted = True
                    logger.info(f"Bot {bot.name} upvote confirmed on {target_url}")
                    action_delay(0.6, 2.4)
                    break
            except Exception:
                continue

        # 6. Comment typing if scheduled
        commented = False
        if comment_text:
            action_delay(0.6, 2.2)
            c_locator = page.locator("textarea").first
            try:
                if c_locator.count() > 0 and c_locator.is_visible():
                    c_locator.scroll_into_view_if_needed()
                    action_delay(0.5, 1.4)
                    human_type(page, "textarea", comment_text)
                    action_delay(0.8, 2.2)

                    submit_btn = page.locator(
                        "button[type='submit']:has-text('Post'), button:has-text('Submit'), button:has-text('Comment'), button[type='submit']"
                    ).first
                    if submit_btn.count() > 0 and submit_btn.is_visible():
                        human_move_and_click(page, submit_btn)
                        commented = True
                        logger.info(f"Bot {bot.name} comment submitted: \"{comment_text[:40]}...\"")
                        action_delay(1.0, 2.8)
            except Exception as e:
                logger.warning(f"Bot {bot.name} comment step skipped: {e}")

        # 7. Final dwell and persist stats before closing context
        action_delay(0.6, 2.2)
        try:
            cookies = context.cookies()
            bot.cookies_count = len(cookies)
        except Exception:
            pass
        context.close()

        bot.profile_size_mb = _measure_profile_mb(bot.profile_path)
        bot.save(update_fields=['cookies_count', 'profile_size_mb'])

        return {
            "status": "success",
            "bot": bot.name,
            "upvoted": upvoted,
            "commented": commented,
            "comment_text": comment_text if commented else None,
            "scroll_depth": depth,
            "http_status": response.status if response else 200,
        }
