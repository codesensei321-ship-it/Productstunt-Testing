import random
import hashlib

# Realistic desktop browser profiles paired with matching platforms & WebGL renderers
DEVICE_PROFILES = [
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "platform": "Win32",
        "os_cpu": "Windows NT 10.0; Win64; x64",
        "sec_ch_ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "sec_ch_ua_platform": '"Windows"',
        "viewport": {"width": 1366, "height": 768},
        "cores": 8,
        "memory": 8,
        "webgl_vendor": "Google Inc. (NVIDIA)",
        "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    },
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "platform": "Win32",
        "os_cpu": "Windows NT 10.0; Win64; x64",
        "sec_ch_ua": '"Google Chrome";v="130", "Chromium";v="130", "Not_A Brand";v="99"',
        "sec_ch_ua_platform": '"Windows"',
        "viewport": {"width": 1536, "height": 864},
        "cores": 12,
        "memory": 16,
        "webgl_vendor": "Google Inc. (Intel)",
        "webgl_renderer": "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
    },
    {
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "platform": "MacIntel",
        "os_cpu": "Intel Mac OS X 10_15_7",
        "sec_ch_ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "sec_ch_ua_platform": '"macOS"',
        "viewport": {"width": 1440, "height": 900},
        "cores": 8,
        "memory": 16,
        "webgl_vendor": "Google Inc. (Apple)",
        "webgl_renderer": "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)",
    },
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        "platform": "Win32",
        "os_cpu": "Windows NT 10.0; Win64; x64",
        "sec_ch_ua": '"Google Chrome";v="129", "Chromium";v="129", "Not_A Brand";v="8"',
        "sec_ch_ua_platform": '"Windows"',
        "viewport": {"width": 1920, "height": 1080},
        "cores": 16,
        "memory": 32,
        "webgl_vendor": "Google Inc. (AMD)",
        "webgl_renderer": "ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
    },
    {
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "platform": "MacIntel",
        "os_cpu": "Intel Mac OS X 10_15_7",
        "sec_ch_ua": '"Google Chrome";v="130", "Chromium";v="130", "Not_A Brand";v="99"',
        "sec_ch_ua_platform": '"macOS"',
        "viewport": {"width": 1280, "height": 800},
        "cores": 10,
        "memory": 16,
        "webgl_vendor": "Google Inc. (Apple)",
        "webgl_renderer": "ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)",
    },
]

GEO_TIMEZONE_MAP = {
    "US": ("en-US", ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"]),
    "GB": ("en-GB", ["Europe/London"]),
    "UK": ("en-GB", ["Europe/London"]),
    "DE": ("de-DE", ["Europe/Berlin"]),
    "CA": ("en-CA", ["America/Toronto", "America/Vancouver"]),
    "FR": ("fr-FR", ["Europe/Paris"]),
    "NL": ("nl-NL", ["Europe/Amsterdam"]),
    "IN": ("en-IN", ["Asia/Kolkata"]),
    "SG": ("en-SG", ["Asia/Singapore"]),
    "AU": ("en-AU", ["Australia/Sydney"]),
}

CITY_TIMEZONE_HINTS = {
    "los angeles": "America/Los_Angeles",
    "seattle": "America/Los_Angeles",
    "san jose": "America/Los_Angeles",
    "chicago": "America/Chicago",
    "dallas": "America/Chicago",
    "houston": "America/Chicago",
    "denver": "America/Denver",
    "phoenix": "America/Phoenix",
    "new york": "America/New_York",
    "ashburn": "America/New_York",
    "atlanta": "America/New_York",
    "miami": "America/New_York",
    "london": "Europe/London",
    "frankfurt": "Europe/Berlin",
    "toronto": "America/Toronto",
    "vancouver": "America/Vancouver",
}


def resolve_geo_locale(proxy):
    if not proxy:
        return "en-US", "America/New_York"

    geo_code = (proxy.geo or "US").strip().upper()[:2]
    city_lower = (proxy.city or "").strip().lower()

    locale, tz_list = GEO_TIMEZONE_MAP.get(geo_code, ("en-US", ["America/New_York"]))
    for city_key, tz in CITY_TIMEZONE_HINTS.items():
        if city_key in city_lower:
            return locale, tz

    rng = random.Random(proxy.id or 1)
    return locale, rng.choice(tz_list)


def get_bot_fingerprint(bot_id, proxy=None):
    """
    Produces a deterministic, persistent hardware & browser fingerprint per bot_id
    so every browser launch looks like the exact same physical machine across restarts.
    """
    profile = DEVICE_PROFILES[bot_id % len(DEVICE_PROFILES)]
    locale, timezone_id = resolve_geo_locale(proxy)

    seed_hex = hashlib.sha256(f"productstunt-bot-{bot_id}".encode()).hexdigest()
    canvas_noise = int(seed_hex[:4], 16) % 5 + 1
    audio_noise = ((int(seed_hex[4:8], 16) % 9) + 1) * 1e-7

    return {
        **profile,
        "locale": locale,
        "timezone_id": timezone_id,
        "canvas_noise": canvas_noise,
        "audio_noise": audio_noise,
        "languages": [locale, locale.split("-")[0]] if "-" in locale else [locale, "en"],
    }


def build_stealth_init_script(fp):
    """
    Returns hardened Playwright init JS tailored to the bot's deterministic fingerprint.
    """
    langs_js = repr(fp["languages"])
    w = fp["viewport"]["width"]
    h = fp["viewport"]["height"]

    return f"""
(() => {{
  // 1. Remove Playwright/Automation webdriver flags
  Object.defineProperty(navigator, 'webdriver', {{ get: () => undefined }});
  try {{
    delete Navigator.prototype.webdriver;
  }} catch (e) {{}}

  // 2. Consistent Hardware & Platform Properties
  Object.defineProperty(navigator, 'platform', {{ get: () => '{fp["platform"]}' }});
  Object.defineProperty(navigator, 'hardwareConcurrency', {{ get: () => {fp["cores"]} }});
  Object.defineProperty(navigator, 'deviceMemory', {{ get: () => {fp["memory"]} }});
  Object.defineProperty(navigator, 'maxTouchPoints', {{ get: () => 0 }});
  Object.defineProperty(navigator, 'languages', {{ get: () => {langs_js} }});

  // 3. Realistic window.chrome runtime stub
  if (!window.chrome) {{
    window.chrome = {{}};
  }}
  window.chrome.runtime = window.chrome.runtime || {{
    PlatformOs: {{ MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' }},
    PlatformArch: {{ ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' }},
    RequestUpdateCheckStatus: {{ THROTTLED: 'throttled', NO_UPDATE: 'no_update', UPDATE_AVAILABLE: 'update_available' }},
  }};
  window.chrome.loadTimes = window.chrome.loadTimes || (() => ({{}}));
  window.chrome.csi = window.chrome.csi || (() => ({{}}));

  // 4. Realistic Plugins & MimeTypes
  const pluginArray = [
    {{ name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }},
    {{ name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }},
    {{ name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }},
  ];
  Object.defineProperty(navigator, 'plugins', {{ get: () => pluginArray }});

  // 5. Permissions query normalization
  if (navigator.permissions && navigator.permissions.query) {{
    const origQuery = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (params) =>
      params && params.name === 'notifications'
        ? Promise.resolve({{ state: Notification.permission }})
        : origQuery(params);
  }}

  // 6. Screen geometry matching viewport
  try {{
    Object.defineProperty(screen, 'width', {{ get: () => {w} }});
    Object.defineProperty(screen, 'height', {{ get: () => {h} }});
    Object.defineProperty(screen, 'availWidth', {{ get: () => {w} }});
    Object.defineProperty(screen, 'availHeight', {{ get: () => {h - 40} }});
    Object.defineProperty(window, 'outerWidth', {{ get: () => {w} }});
    Object.defineProperty(window, 'outerHeight', {{ get: () => {h} }});
  }} catch (e) {{}}

  // 7. WebGL Vendor & Renderer fingerprint consistency
  const spoofWebGL = (proto) => {{
    if (!proto || !proto.getParameter) return;
    const origGetParam = proto.getParameter;
    proto.getParameter = function(param) {{
      if (param === 37445) return '{fp["webgl_vendor"]}';
      if (param === 37446) return '{fp["webgl_renderer"]}';
      return origGetParam.call(this, param);
    }};
  }};
  if (typeof WebGLRenderingContext !== 'undefined') spoofWebGL(WebGLRenderingContext.prototype);
  if (typeof WebGL2RenderingContext !== 'undefined') spoofWebGL(WebGL2RenderingContext.prototype);

  // 8. Subtle deterministic Canvas noise per bot profile
  const noise = {fp["canvas_noise"]};
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(...args) {{
    try {{
      const ctx = this.getContext('2d');
      if (ctx && this.width > 16 && this.height > 16) {{
        const img = ctx.getImageData(0, 0, 1, 1);
        img.data[0] = (img.data[0] + noise) % 255;
        ctx.putImageData(img, 0, 0);
      }}
    }} catch (e) {{}}
    return origToDataURL.apply(this, args);
  }};

  // 9. Subtle deterministic AudioContext noise
  const aNoise = {fp["audio_noise"]};
  if (typeof AudioBuffer !== 'undefined' && AudioBuffer.prototype.getChannelData) {{
    const origGetChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function(...args) {{
      const data = origGetChannelData.apply(this, args);
      if (data && data.length > 0 && !this.__stealthPatched) {{
        data[0] = data[0] + aNoise;
        this.__stealthPatched = true;
      }}
      return data;
    }};
  }}
}})();
"""


STEALTH_CHROMIUM_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-infobars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=IsolateOrigins,site-per-process,AutomationControlled",
    "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
    "--webrtc-ip-handling-policy=disable_non_proxied_udp",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
]
