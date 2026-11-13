import React, { useState } from 'react';
import { 
  Folder, FileCode, Copy, Check, Download, Terminal, 
  Layers, Database, Cpu, Shield, Globe 
} from 'lucide-react';

interface CodeFile {
  path: string;
  category: 'Infrastructure' | 'Backend' | 'Automation' | 'Frontend' | 'Documentation';
  language: string;
  description: string;
  content: string;
}

const PRODUCTION_FILES: CodeFile[] = [
  {
    path: 'docker-compose.yml',
    category: 'Infrastructure',
    language: 'yaml',
    description: 'Docker Compose definition for PostgreSQL 15, Redis 7, Django API, Celery Worker, Celery Beat, and Next.js frontend.',
    content: `version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: productstunt_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: staging_password
      POSTGRES_DB: productstunt
    command: -c shared_buffers=512MB -c max_connections=50 -c work_mem=16MB
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d productstunt"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - internal_network

  redis:
    image: redis:7-alpine
    container_name: productstunt_redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - ./data/redis:/data
    networks:
      - internal_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: productstunt_backend
    restart: unless-stopped
    command: >
      sh -c "python manage.py migrate --noinput &&
             python manage.py seed_bots --if-empty &&
             python manage.py runserver 0.0.0.0:8000"
    volumes:
      - ./backend:/app
      - ./data/profiles:/data/profiles
    env_file:
      - .env
    ports:
      - "127.0.0.1:8000:8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - internal_network

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: productstunt_worker
    restart: unless-stopped
    command: celery -A config worker --loglevel=info --concurrency=4 -n worker1@%h
    shm_size: '2gb'
    volumes:
      - ./backend:/app
      - ./data/profiles:/data/profiles
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - internal_network

  beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: productstunt_beat
    restart: unless-stopped
    command: celery -A config beat --loglevel=info
    volumes:
      - ./backend:/app
    env_file:
      - .env
    depends_on:
      redis:
        condition: service_started
    networks:
      - internal_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: productstunt_frontend
    restart: unless-stopped
    command: npm run start
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - backend
    networks:
      - internal_network

networks:
  internal_network:
    driver: bridge`,
  },
  {
    path: '.env',
    category: 'Infrastructure',
    language: 'ini',
    description: 'Environment variables for Django, PostgreSQL, Redis, and Staging URL.',
    content: `DEBUG=False
SECRET_KEY=django-insecure-productstunt-vps6-super-secret-key-prod-2026-993847
DATABASE_URL=postgres://admin:staging_password@db:5432/productstunt
REDIS_URL=redis://redis:6379/0
STAGING_URL=https://staging.productstunt.com
ALLOWED_HOSTS=localhost,127.0.0.1,backend,frontend,staging.productstunt.com
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
NEXT_PUBLIC_API_URL=http://backend:8000/api
NEXT_PUBLIC_NOVNC_HOST=localhost
CELERY_CONCURRENCY=4
CHROMIUM_SHM_SIZE=2gb
DATA_PROFILES_DIR=/data/profiles`,
  },
  {
    path: 'backend/automation/browser.py',
    category: 'Automation',
    language: 'python',
    description: 'Playwright automation with isolated persistent profiles, Webshare proxy injection, action_delay, and template randomizer.',
    content: `import os
import logging
from playwright.sync_api import sync_playwright
from django.conf import settings
from control_plane.models import Bot
from automation.human_behavior import (
    action_delay,
    random_delay,
    human_scroll_randomized,
    human_type,
    get_random_comment,
    random_mouse_hover
)

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]

def run_bot_session(bot_id, target_url, comment_text=None, headless=True, auto_comment_if_none=False):
    bot = Bot.objects.get(id=bot_id)
    proxy = bot.proxy

    if not target_url.startswith(settings.STAGING_URL) and not getattr(settings, 'ALLOW_TEST_DOMAINS', False):
        raise ValueError(f"Security Policy Violation: Target URL {target_url} does not belong to {settings.STAGING_URL}")

    proxy_cfg = None
    if proxy and proxy.is_active:
        proxy_cfg = {
            "server": f"http://{proxy.ip}:{proxy.port}",
            "username": proxy.username,
            "password": proxy.password
        }

    os.makedirs(bot.profile_path, exist_ok=True)
    ua = USER_AGENTS[(bot.id) % len(USER_AGENTS)]
    chosen_comment = comment_text
    if chosen_comment == 'auto':
        chosen_comment = get_random_comment()

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=bot.profile_path,
            headless=headless,
            viewport={"width": 1280, "height": 800},
            user_agent=ua,
            proxy=proxy_cfg,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-dev-shm-usage"]
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

        response = page.goto(target_url, wait_until="domcontentloaded", timeout=45000)

        # 1. Action delay upon arrival (0.5 to 3.0s)
        action_delay(0.5, 3.0)

        # 2. Exploratory mouse hovering
        random_mouse_hover(page)

        # 3. Dynamic human scroll with randomized micro-reversals
        depth = human_scroll_randomized(page, max_depth=1600, speed_profile='dynamic')

        # 4. Action delay before vote decision
        action_delay(0.5, 3.0)

        upvoted = False
        upvote_selectors = ["button[data-testid='upvote-btn']", "button.upvote-button", "button:has-text('Upvote')"]
        for sel in upvote_selectors:
            locator = page.locator(sel).first
            if locator.is_visible():
                locator.hover()
                action_delay(0.5, 2.0)
                locator.click()
                upvoted = True
                action_delay(0.5, 3.0)
                break

        commented = False
        if chosen_comment:
            action_delay(0.5, 2.5)
            c_locator = page.locator("textarea").first
            if c_locator.is_visible():
                c_locator.scroll_into_view_if_needed()
                action_delay(0.5, 1.5)
                human_type(page, "textarea", chosen_comment)
                action_delay(0.8, 2.5)
                submit_btn = page.locator("button[type='submit']:has-text('Post'), button:has-text('Submit')").first
                if submit_btn.is_visible():
                    submit_btn.hover()
                    action_delay(0.4, 1.2)
                    submit_btn.click()
                    commented = True
                    action_delay(1.0, 3.0)

        action_delay(0.5, 3.0)
        context.close()
        return {
            "status": "success",
            "bot": bot.name,
            "upvoted": upvoted,
            "commented": commented,
            "comment_text": chosen_comment if commented else None,
            "scroll_depth": depth,
            "http_status": response.status if response else 200
        }`,
  },
  {
    path: 'backend/automation/human_behavior.py',
    category: 'Automation',
    language: 'python',
    description: 'Human emulation helpers: randomized scroll speeds, action delays (0.5-3.0s), and comment templates.',
    content: `import time
import random

COMMENT_TEMPLATES = [
    "Huge congratulations on the launch! Loving the clean and responsive UI.",
    "Just tried this out on staging and the performance is noticeably faster. Upvoted!",
    "Excited to see where this goes! The onboarding flow was ridiculously smooth.",
    "Great project. Does this support automated webhooks or REST API rate-limit alerts?",
    "Very clean architecture. Are there benchmarks comparing throughput under high load?",
    "Looks promising. How does this handle edge cases with intermittent connectivity?",
    "Read through the product overview and documentation. Really thoughtful implementation.",
    "Clean aesthetic and straightforward value proposition. Good luck with the launch!",
    "Congrats on launching on Productstunt! Upvoted.",
    "Very clean interface and slick interaction design.",
]

def action_delay(min_sec=0.5, max_sec=3.0):
    """Randomized pause between browser actions to emulate human latency."""
    delay = random.uniform(min_sec, max_sec)
    time.sleep(delay)
    return delay

def get_random_comment(custom_templates=None):
    """Selects an authentic random comment from stealth templates or custom pool."""
    if custom_templates and len(custom_templates) > 0:
        return random.choice(custom_templates)
    return random.choice(COMMENT_TEMPLATES)

def human_scroll_randomized(page, max_depth=1600, speed_profile='dynamic'):
    """Simulates non-linear human scrolling with randomized speeds and pauses."""
    profiles = {
        'slow': {'step_min': 80, 'step_max': 200, 'pause_min': 1.0, 'pause_max': 2.4},
        'normal': {'step_min': 140, 'step_max': 340, 'pause_min': 0.5, 'pause_max': 1.6},
        'fast': {'step_min': 240, 'step_max': 480, 'pause_min': 0.3, 'pause_max': 0.9},
    }
    current_scroll = 0
    total_scrolled = 0
    while current_scroll < max_depth:
        active = speed_profile if speed_profile != 'dynamic' else random.choice(['slow', 'normal', 'fast'])
        cfg = profiles.get(active, profiles['normal'])
        step = random.randint(cfg['step_min'], cfg['step_max'])
        current_scroll += step
        if random.random() < 0.20 and current_scroll > 250:
            current_scroll -= random.randint(50, 160)
            page.evaluate(f"window.scrollTo({{ top: {current_scroll}, behavior: 'smooth' }})")
            time.sleep(random.uniform(0.4, 1.0))
        page.evaluate(f"window.scrollTo({{ top: {current_scroll}, behavior: 'smooth' }})")
        total_scrolled = current_scroll
        time.sleep(random.uniform(cfg['pause_min'], cfg['pause_max']))
        doc_height = page.evaluate("document.body.scrollHeight")
        if current_scroll >= doc_height - 150:
            break
    return total_scrolled

def human_type(page, selector, text, wpm_range=(48, 80)):
    page.click(selector)
    action_delay(0.3, 0.7)
    for i, char in enumerate(text):
        if random.random() < 0.025 and i > 2 and char.isalnum():
            page.keyboard.type(chr(ord(char) + 1 if char != 'z' else ord('a')))
            time.sleep(random.uniform(0.12, 0.28))
            page.keyboard.press("Backspace")
            time.sleep(random.uniform(0.08, 0.20))
        page.keyboard.type(char)
        base_wpm = random.uniform(*wpm_range)
        char_delay = 60.0 / (base_wpm * 5)
        time.sleep(max(0.035, char_delay + random.gauss(0, char_delay * 0.25)))
        if char in ['.', ',', '!', '?'] and random.random() < 0.6:
            time.sleep(random.uniform(0.3, 0.8))
    action_delay(0.4, 1.0)`,
  },
  {
    path: 'backend/control_plane/tasks.py',
    category: 'Backend',
    language: 'python',
    description: 'Celery worker task handling staggered campaign execution, Playwright context, and DB logging.',
    content: `import logging
from celery import shared_task
from django.utils import timezone
from control_plane.models import Bot, Campaign, ActivityLog
from automation.browser import run_bot_session

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def execute_bot_session(self, bot_id, campaign_id, comment_text=None):
    try:
        bot = Bot.objects.get(id=bot_id)
        campaign = Campaign.objects.get(id=campaign_id)
    except (Bot.DoesNotExist, Campaign.DoesNotExist) as e:
        return {"status": "error", "message": str(e)}

    bot.status = 'RUNNING'
    bot.last_active = timezone.now()
    bot.save(update_fields=['status', 'last_active'])

    try:
        result = run_bot_session(
            bot_id=bot.id,
            target_url=campaign.target_url,
            comment_text=comment_text,
            headless=True
        )

        ActivityLog.objects.create(
            bot=bot,
            action='UPVOTE',
            target_url=campaign.target_url,
            status_code=200,
            details=f"Upvote recorded via proxy {bot.proxy.ip if bot.proxy else 'direct'}. Scroll depth: {result.get('scroll_depth', 0)}px"
        )

        if comment_text:
            ActivityLog.objects.create(
                bot=bot,
                action='COMMENT',
                target_url=campaign.target_url,
                status_code=200,
                details=f"Comment posted: \\"{comment_text[:60]}...\\""
            )
            campaign.comments_completed += 1

        campaign.votes_completed += 1
        if campaign.votes_completed >= campaign.votes_requested:
            campaign.status = 'COMPLETED'
        campaign.save(update_fields=['votes_completed', 'comments_completed', 'status'])

        return {"status": "success", "bot": bot.name}
    except Exception as exc:
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
def check_proxy_health(proxy_id=None):
    """Background health checker for Webshare Static ISP proxies."""
    import socket, time
    from control_plane.models import Proxy
    proxies = Proxy.objects.filter(id=proxy_id) if proxy_id else Proxy.objects.filter(is_active=True)
    results = {"total": len(proxies), "online": 0, "degraded": 0, "offline": 0}
    for p in proxies:
        start = time.time()
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2.5)
            err = sock.connect_ex((p.ip, p.port))
            duration = int((time.time() - start) * 1000)
            sock.close()
            if err == 0:
                results["online" if duration < 120 else "degraded"] += 1
            else:
                results["offline"] += 1
        except Exception:
            results["offline"] += 1
    return results`,
  },
  {
    path: 'backend/control_plane/models.py',
    category: 'Backend',
    language: 'python',
    description: 'PostgreSQL Django models for Proxy, Bot, Account, Campaign, and ActivityLog.',
    content: `from django.db import models

class Proxy(models.Model):
    HEALTH_CHOICES = [
        ('ONLINE', 'ONLINE'),
        ('DEGRADED', 'DEGRADED'),
        ('OFFLINE', 'OFFLINE'),
        ('CHECKING', 'CHECKING'),
    ]

    ip = models.GenericIPAddressField()
    port = models.IntegerField(default=80)
    username = models.CharField(max_length=100)
    password = models.CharField(max_length=100)
    geo = models.CharField(max_length=50, blank=True, default='US')
    city = models.CharField(max_length=100, blank=True, default='New York')
    isp = models.CharField(max_length=100, blank=True, default='Webshare Static ISP')
    latency_ms = models.IntegerField(default=35)
    health_status = models.CharField(max_length=20, choices=HEALTH_CHOICES, default='ONLINE')
    packet_loss_percent = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    last_checked = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Proxies'
        ordering = ['id']

    def __str__(self):
        return f"{self.ip}:{self.port} [{self.health_status}] ({self.geo} - {self.city})"

class Bot(models.Model):
    STATUS_CHOICES = [
        ('IDLE', 'IDLE'),
        ('RUNNING', 'RUNNING'),
        ('ASSIGNED', 'ASSIGNED'),
        ('ERROR', 'ERROR'),
    ]

    name = models.CharField(max_length=50, unique=True)
    proxy = models.OneToOneField(Proxy, on_delete=models.SET_NULL, null=True, blank=True, related_name='bot')
    profile_path = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IDLE')
    vnc_port = models.IntegerField(null=True, blank=True)
    last_active = models.DateTimeField(null=True, blank=True)
    cookies_count = models.IntegerField(default=24)
    profile_size_mb = models.FloatField(default=16.4)

class Account(models.Model):
    bot = models.OneToOneField(Bot, on_delete=models.CASCADE, related_name='account')
    mailbox_provider = models.CharField(max_length=50, default='Gmail')
    mailbox_email = models.EmailField(blank=True)
    mailbox_password = models.CharField(max_length=255, blank=True)
    app_email = models.EmailField(blank=True)
    app_password = models.CharField(max_length=255, blank=True)
    is_verified = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

class Campaign(models.Model):
    target_url = models.URLField()
    votes_requested = models.IntegerField(default=1)
    votes_completed = models.IntegerField(default=0)
    comments = models.JSONField(default=list)
    comments_completed = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

class ActivityLog(models.Model):
    bot = models.ForeignKey(Bot, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=50)
    target_url = models.URLField()
    timestamp = models.DateTimeField(auto_now_add=True)
    status_code = models.IntegerField(default=200)
    details = models.TextField(blank=True)`,
  },
  {
    path: 'backend/automation/launch_vnc.sh',
    category: 'Automation',
    language: 'bash',
    description: 'Shell supervisor to spawn Xvfb, x11vnc, websockify and headed Chromium bound to bot profile & proxy.',
    content: `#!/usr/bin/env bash
set -e

BOT_ID=\${1:-1}
DISPLAY_NUM=\${2:-101}
VNC_PORT=\${3:-5901}
WS_PORT=\${4:-6081}
PROFILE_PATH=\${5:-"/data/profiles/bot_001"}
START_URL=\${6:-"https://staging.productstunt.com/signup"}
PROXY_SERVER=\${7:-""}

export DISPLAY=":\${DISPLAY_NUM}"
Xvfb ":\${DISPLAY_NUM}" -screen 0 1280x800x24 -ac &
XVFB_PID=$!
sleep 1

x11vnc -display ":\${DISPLAY_NUM}" -rfbport "\${VNC_PORT}" -forever -shared -nopw -quiet &
X11VNC_PID=$!
sleep 1

websockify --web=/usr/share/novnc "\${WS_PORT}" "localhost:\${VNC_PORT}" &
WEBSOCKIFY_PID=$!
sleep 1

python -c "
from playwright.sync_api import sync_playwright
proxy_dict = {'server': '\${PROXY_SERVER}'} if '\${PROXY_SERVER}' else None
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        user_data_dir='\${PROFILE_PATH}',
        headless=False,
        viewport={'width': 1280, 'height': 800},
        proxy=proxy_dict,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
    )
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto('\${START_URL}')
    try: page.wait_for_timeout(3600000)
    except: pass
" &
BROWSER_PID=$!

wait $BROWSER_PID
kill $WEBSOCKIFY_PID $X11VNC_PID $XVFB_PID 2>/dev/null || true`,
  },
  {
    path: 'README.md',
    category: 'Documentation',
    language: 'markdown',
    description: 'Complete server setup guide for Contabo Cloud VPS 6, swap creation, Dokploy, and NoVNC.',
    content: `# Productstunt Bot Testing Lab Setup

## 1. Contabo Server Preparation
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

## 2. Deploy Cluster
docker compose up -d --build

## 3. Seed 100 Webshare Proxies
docker compose run --rm backend python manage.py seed_bots`,
  },
];

export const ExportCodebaseView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(PRODUCTION_FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadInstallScript = () => {
    const script = `#!/bin/bash
# Productstunt Bot Testing Lab VPS Setup Script for Contabo VPS 6
set -e
echo "Setting up Contabo VPS 6 for Productstunt Lab..."

# 4GB Swap
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Create directory tree
mkdir -p productstunt-lab/backend/config productstunt-lab/backend/control_plane/api productstunt-lab/backend/automation productstunt-lab/frontend/pages/api productstunt-lab/data/profiles

echo "Environment initialized. Run 'docker compose up -d' inside productstunt-lab/"
`;
    const blob = new Blob([script], { type: 'text/x-sh' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'setup_contabo_vps6.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <span>Master Deployment Codebase Inspector</span>
          </h1>
          <p className="text-sm text-neutral-400">
            Inspect, copy, or export the entire <code className="text-indigo-300 font-mono">productstunt-lab/</code> architecture tree configured for Contabo VPS 6 & Dokploy.
          </p>
        </div>

        <button
          onClick={handleDownloadInstallScript}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Download VPS Setup Script (.sh)</span>
        </button>
      </div>

      {/* Main Split Grid: File Explorer Tree & Code Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: File Tree */}
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="text-xs font-bold text-neutral-400 font-mono uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-neutral-800">
            <Folder className="w-3.5 h-3.5 text-indigo-400" />
            <span>productstunt-lab/ Tree</span>
          </div>

          <div className="space-y-1">
            {PRODUCTION_FILES.map(file => {
              const isSelected = selectedFile.path === file.path;

              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-mono transition-colors text-left ${
                    isSelected
                      ? 'bg-indigo-950 text-indigo-200 border border-indigo-600/40'
                      : 'hover:bg-neutral-800/40 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-neutral-500'}`} />
                    <span className="truncate">{file.path}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-sans shrink-0">
                    {file.category}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80 text-[11px] text-neutral-400 space-y-1 font-sans">
            <div className="font-semibold text-neutral-300">Target VPS:</div>
            <div>Contabo Cloud VPS 6 (Ubuntu 22/24 LTS)</div>
            <div>Dokploy + Docker Compose</div>
            <div>Playwright Stealth + Xvfb / noVNC</div>
          </div>
        </div>

        {/* Right Column: Code Viewer */}
        <div className="lg:col-span-2 rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-neutral-950 border-b border-neutral-800">
            <div className="space-y-0.5">
              <div className="text-xs font-bold font-mono text-white flex items-center gap-2">
                <span>{selectedFile.path}</span>
                <span className="text-[11px] text-neutral-500">({selectedFile.language})</span>
              </div>
              <div className="text-[11px] text-neutral-400 font-sans">
                {selectedFile.description}
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy File</span>
                </>
              )}
            </button>
          </div>

          {/* Code Viewer Body */}
          <div className="p-4 bg-neutral-950 overflow-x-auto flex-1 max-h-[580px]">
            <pre className="font-mono text-xs text-neutral-300 leading-relaxed">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
