import time
import random
import math

# Predefined organic comment templates for stealth product testing simulations
COMMENT_TEMPLATES = [
    "Huge congratulations on the launch! Loving the clean and responsive UI.",
    "Just tried this out on staging and the performance is noticeably faster than existing tools. Upvoted!",
    "Excited to see where this goes! The onboarding flow was ridiculously smooth.",
    "Fantastic execution team! Bookmarking this for our engineering stack.",
    "Super crisp design and instant interactions. Definitely deserving the upvote!",
    "Kudos to the creators! This addresses a major pain point we've felt for months.",
    "Great project. Does this support automated webhooks or REST API rate-limit alerts?",
    "Very clean architecture. Are there benchmarks published comparing throughput under high load?",
    "Upvoted. Does this integrate cleanly with Docker, Kubernetes, and GitHub Actions CI/CD pipelines?",
    "Impressive response latency. Curious what caching layer is running under the hood (Redis/Varnish)?",
    "Looks promising. How does this handle edge cases with intermittent connectivity or data loss?",
    "Interesting approach. What does the pricing tier look like after the beta period?",
    "Read through the product overview and documentation. Really thoughtful implementation.",
    "Great write-up on the launch page. Upvoted for the attention to detail.",
    "Clean aesthetic and straightforward value proposition. Good luck with the launch!",
    "Simple, elegant, and directly solves the stated problem without unnecessary bloat.",
    "Congrats on launching on Productstunt! Upvoted.",
    "Very clean interface and slick interaction design.",
    "Super intuitive UX. Shared with my colleagues!",
    "Upvoted! Love seeing tools that streamline day-to-day developer workflows."
]

def action_delay(min_sec=0.5, max_sec=3.0):
    """
    Introduces a randomized pause between browser actions (clicks, hovers, navigation)
    to emulate human reaction latency and avoid robotic timing signatures.
    """
    delay = random.uniform(min_sec, max_sec)
    time.sleep(delay)
    return delay

def random_delay(min_sec=1.5, max_sec=4.0):
    """Sleep for randomized interval for larger phase transitions."""
    delay = random.uniform(min_sec, max_sec)
    time.sleep(delay)
    return delay

def get_random_comment(custom_templates=None):
    """
    Selects an organic random comment template from predefined stealth list or custom templates.
    """
    if custom_templates and len(custom_templates) > 0:
        return random.choice(custom_templates)
    return random.choice(COMMENT_TEMPLATES)

def human_scroll_randomized(page, max_depth=1600, speed_profile='dynamic'):
    """
    Simulates organic, non-linear human scrolling with randomized speeds,
    variable acceleration/deceleration steps, reading pauses, and occasional micro-reversals.

    Speed Profiles:
    - 'slow': Short steps (80-200px) with longer reading pauses (1.2-2.5s)
    - 'normal': Moderate steps (150-320px) with casual pauses (0.6-1.5s)
    - 'fast': Larger steps (250-480px) with brisk pauses (0.3-0.8s)
    - 'dynamic': Dynamically shifts between reading pauses and speed bursts
    """
    profiles = {
        'slow': {'step_min': 80, 'step_max': 200, 'pause_min': 1.0, 'pause_max': 2.4},
        'normal': {'step_min': 140, 'step_max': 340, 'pause_min': 0.5, 'pause_max': 1.6},
        'fast': {'step_min': 240, 'step_max': 480, 'pause_min': 0.3, 'pause_max': 0.9},
    }

    current_scroll = 0
    total_scrolled = 0

    while current_scroll < max_depth:
        # Determine current profile
        active_prof = speed_profile
        if active_prof == 'dynamic':
            active_prof = random.choices(['slow', 'normal', 'fast'], weights=[0.35, 0.45, 0.20])[0]

        cfg = profiles.get(active_prof, profiles['normal'])

        # Random step size with Gaussian variance
        step = random.randint(cfg['step_min'], cfg['step_max'])
        current_scroll += step

        # 20% chance of micro-reversal (user scrolling up slightly to re-read headline or inspect asset)
        if random.random() < 0.20 and current_scroll > 250:
            reversal = random.randint(50, 160)
            current_scroll -= reversal
            page.evaluate(f"window.scrollTo({{ top: {current_scroll}, behavior: 'smooth' }})")
            time.sleep(random.uniform(0.4, 1.0))
            current_scroll += int(reversal * 1.3)  # Resume downward scroll

        page.evaluate(f"window.scrollTo({{ top: {current_scroll}, behavior: 'smooth' }})")
        total_scrolled = current_scroll

        # Randomized dwell between scroll bursts
        pause = random.uniform(cfg['pause_min'], cfg['pause_max'])
        time.sleep(pause)

        # Invariant check: terminate if reached end of page document
        doc_height = page.evaluate("document.body.scrollHeight")
        if current_scroll >= doc_height - 150:
            break

    return total_scrolled

# Backwards compatibility alias
def human_scroll(page, max_depth=1200):
    return human_scroll_randomized(page, max_depth=max_depth, speed_profile='normal')

def human_type(page, selector, text, wpm_range=(48, 80)):
    """
    Types text into selector with authentic keystroke variance, rhythm pauses,
    and deliberate typo correction emulation.
    """
    page.click(selector)
    action_delay(0.3, 0.7)

    chars = list(text)
    i = 0
    while i < len(chars):
        char = chars[i]

        # 2% chance of deliberate typo followed by backspace correction
        if random.random() < 0.025 and i > 2 and char.isalnum():
            wrong_char = chr(ord(char) + 1 if char != 'z' else ord('a'))
            page.keyboard.type(wrong_char)
            time.sleep(random.uniform(0.12, 0.28))
            page.keyboard.press("Backspace")
            time.sleep(random.uniform(0.08, 0.20))

        page.keyboard.type(char)

        # Baseline delay calculated from WPM (5 chars per word)
        base_wpm = random.uniform(*wpm_range)
        char_delay = 60.0 / (base_wpm * 5)
        # Jitter variance
        jitter = random.gauss(0, char_delay * 0.25)
        time.sleep(max(0.035, char_delay + jitter))

        # Occasional thought pause at punctuation marks
        if char in ['.', ',', '!', '?'] and random.random() < 0.6:
            time.sleep(random.uniform(0.3, 0.8))

        i += 1

    action_delay(0.4, 1.0)

def human_mouse_jitter(page, start_x, start_y, end_x, end_y, steps=20):
    """
    Simulates authentic human mouse trajectories using quadratic/cubic Bézier curves
    with randomized control point displacement and micro-jitter velocity profiles.
    Eliminates robotic, perfectly straight-line pointer telemetry.
    """
    # Control point offset simulating hand/wrist arc
    cx = (start_x + end_x) / 2.0 + random.randint(-60, 60)
    cy = (start_y + end_y) / 2.0 + random.randint(-40, 40)

    for s in range(steps + 1):
        t = s / float(steps)
        # Quadratic Bezier formula: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        x = (1 - t)**2 * start_x + 2 * (1 - t) * t * cx + t**2 * end_x
        y = (1 - t)**2 * start_y + 2 * (1 - t) * t * cy + t**2 * end_y
        # Add micro tremor (sub-pixel human hand jitter)
        tremor_x = random.uniform(-1.5, 1.5)
        tremor_y = random.uniform(-1.5, 1.5)
        page.mouse.move(x + tremor_x, y + tremor_y)
        # Variable sleep emulating acceleration and deceleration
        time.sleep(random.uniform(0.008, 0.022))

def random_mouse_hover(page, candidate_selectors=None):
    """
    Simulates casual wandering mouse exploration over elements on the page
    before focusing on the intended target action.
    """
    if not candidate_selectors:
        candidate_selectors = [
            "header a", "nav a", "article", "h1", "h2", "img", "p", "button"
        ]

    for sel in candidate_selectors:
        elements = page.locator(sel)
        count = elements.count()
        if count > 0:
            idx = random.randint(0, min(count - 1, 3))
            elem = elements.nth(idx)
            if elem.is_visible():
                try:
                    box = elem.bounding_box()
                    if box:
                        target_x = box['x'] + box['width'] * random.uniform(0.3, 0.7)
                        target_y = box['y'] + box['height'] * random.uniform(0.3, 0.7)
                        # Current mouse origin or default mid-screen
                        human_mouse_jitter(page, random.randint(200, 600), random.randint(150, 400), target_x, target_y)
                        action_delay(0.4, 1.2)
                        break
                    else:
                        elem.hover(timeout=2000)
                        action_delay(0.3, 0.8)
                        break
                except Exception:
                    pass

def human_move_and_click(page, locator):
    """
    Moves pointer with curved Bézier trajectory to locator bounding box, dwells, and clicks.
    """
    try:
        box = locator.bounding_box(timeout=3000)
    except Exception:
        box = None

    if box and box.get('width', 0) > 0 and box.get('height', 0) > 0:
        target_x = box['x'] + box['width'] * random.uniform(0.25, 0.75)
        target_y = box['y'] + box['height'] * random.uniform(0.3, 0.7)
        human_mouse_jitter(page, random.randint(100, 800), random.randint(100, 600), target_x, target_y)
        action_delay(0.15, 0.45)
        page.mouse.click(target_x, target_y)
    else:
        locator.click()


