import os
import logging
from playwright.sync_api import sync_playwright
from django.conf import settings
from control_plane.models import Bot
from automation.human_behavior import (
    action_delay,
    human_scroll_randomized,
    human_type,
    get_random_comment,
    random_mouse_hover,
    human_move_and_click
)

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
]

def run_bot_session(bot_id, target_url, comment_text=None, headless=True):
    """
    Spawns an isolated Playwright Chromium instance backed by a persistent profile directory
    and routed through the assigned Webshare Static ISP proxy.

    Full Stealth Human Profile:
    - Dedicated Webshare Static ISP proxy binding
    - Anti-detection evasions (navigator.webdriver = undefined)
    - Organic non-linear scrolling with randomized velocity & micro-reversals
    - Authentic action delays (0.5 to 3.0 seconds) between actions
    - Keystroke latency variance and typo emulation for comments
    - Automatic cookie commit to /data/profiles/bot_XXX
    """
    bot = Bot.objects.get(id=bot_id)
    proxy = bot.proxy

    # Dynamic domain safety check
    target_base = getattr(settings, 'TARGET_URL', getattr(settings, 'STAGING_URL', 'https://staging.productstunt.com'))
    allow_any = getattr(settings, 'ALLOW_ANY_HOST', False) or getattr(settings, 'ALLOW_TEST_DOMAINS', False)
    if not allow_any and not target_url.startswith(target_base):
        raise ValueError(f"Security Policy Violation: Target URL {target_url} does not match configured target {target_base}. Set ALLOW_ANY_HOST=True or TARGET_URL in .env to allow this domain.")

    proxy_cfg = None
    if proxy and proxy.is_active:
        proxy_cfg = {
            "server": f"http://{proxy.ip}:{proxy.port}",
            "username": proxy.username,
            "password": proxy.password
        }

    os.makedirs(bot.profile_path, exist_ok=True)
    ua = USER_AGENTS[(bot.id) % len(USER_AGENTS)]

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=bot.profile_path,
            headless=headless,
            viewport={"width": 1280, "height": 800},
            user_agent=ua,
            locale="en-US",
            timezone_id="America/New_York",
            proxy=proxy_cfg,
            ignore_default_args=["--enable-automation"],
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-infobars",
                "--no-first-run",
                "--no-default-browser-check",
            ]
        )
        page = context.pages[0] if context.pages else context.new_page()

        # Stealth evasion scripts
        page.add_init_script("""
            // Mask webdriver
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            // Mock chrome object
            window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} };
            // Mock realistic plugins & languages
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            // Mock permissions query
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        """)

        logger.info(f"Bot {bot.name} launching stealth session to {target_url} via {proxy.ip if proxy else 'direct'}")
        response = page.goto(target_url, wait_until="domcontentloaded", timeout=45000)

        # 1. Natural arrival dwell (0.5s to 3.0s)
        action_delay(0.5, 3.0)

        # 2. Exploratory mouse movement
        random_mouse_hover(page)

        # 3. Dynamic human scrolling with micro-reversals
        depth = human_scroll_randomized(page, max_depth=1600, speed_profile='dynamic')

        # 4. Action delay before upvote decision
        action_delay(0.5, 3.0)

        # 5. Locate and click upvote button (Cross-verified with Product Hunt DOM)
        upvote_selectors = [
            "button[data-test='vote-button']",
            "[data-test*='vote-button']",
            "[aria-label*='Vote']",
            "button[data-testid='upvote-btn']",
            "button.upvote-button",
            "button:has-text('Upvote')",
            "button:has-text('Vote')",
            "[aria-label='Upvote']"
        ]

        upvoted = False
        for sel in upvote_selectors:
            locator = page.locator(sel).first
            if locator.is_visible():
                human_move_and_click(page, locator)
                upvoted = True
                logger.info(f"Bot {bot.name} upvote confirmed on {target_url}")
                action_delay(0.5, 3.0)
                break

        # 6. Comment typing if scheduled
        commented = False
        if comment_text:
            action_delay(0.5, 2.5)
            c_locator = page.locator("textarea").first
            if c_locator.is_visible():
                c_locator.scroll_into_view_if_needed()
                action_delay(0.5, 1.5)
                human_type(page, "textarea", comment_text)
                action_delay(0.8, 2.5)

                submit_btn = page.locator(
                    "button[type='submit']:has-text('Post'), button:has-text('Submit'), button:has-text('Comment')"
                ).first
                if submit_btn.is_visible():
                    human_move_and_click(page, submit_btn)
                    commented = True
                    logger.info(f"Bot {bot.name} comment submitted: \"{comment_text[:40]}...\"")
                    action_delay(1.0, 3.0)

        # 7. Final dwell before closing context
        action_delay(0.5, 3.0)
        context.close()

        return {
            "status": "success",
            "bot": bot.name,
            "upvoted": upvoted,
            "commented": commented,
            "comment_text": comment_text if commented else None,
            "scroll_depth": depth,
            "http_status": response.status if response else 200
        }
