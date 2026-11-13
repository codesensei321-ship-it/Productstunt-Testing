import os
import re
from urllib.parse import urlparse
from django.core.management.base import BaseCommand
from control_plane.models import Proxy, Bot, Account

DEFAULT_GEOS = [
    ('US', 'New York'), ('US', 'Los Angeles'), ('US', 'Chicago'),
    ('US', 'Ashburn'), ('US', 'Dallas'), ('GB', 'London'),
    ('DE', 'Frankfurt'), ('CA', 'Toronto'), ('US', 'Seattle'),
    ('US', 'Atlanta')
]

WIFI_SSIDS = [
    'Apex-Family-5G', 'Orbi-Guest-Net', 'Spectrum-Studio-Mesh', 'Beacon-WiFi-Home',
    'Cascade-Private-Net', 'Fios-Gigabit-Home', 'Netgear-Loft-WiFi', 'Xfinity-Apt-3B',
    'Eero-Pro-Residence', 'Linksys-Smart-WiFi', 'Google-Nest-Home', 'Archer-AX6000-Net',
    'CenturyLink-Fiber-5G', 'Asus-Rog-Gaming-LAN', 'Cox-Gigablast-WiFi', 'Breeze-Home-Mesh',
    'Att-Fiber-Private', 'Verizon-Home-5G', 'TP-Link-Deco-Mesh', 'Frontier-Ultra-LAN'
]

MAIL_PROVIDERS = ['Gmail', 'Outlook']


def parse_proxy_lines(raw_text):
    """
    Flexibly parses proxy entries in any common format:
    - ip,port,username,password[,geo]
    - ip,port
    - ip:port:username:password
    - ip:port
    - http(s)://username:password@ip:port
    - socks5://username:password@ip:port
    """
    parsed = []
    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or line.lower().startswith('ip,') or line.lower().startswith('ip:'):
            continue

        scheme = 'http'
        username = ''
        password = ''
        geo = 'US'
        city = 'Imported'

        if '://' in line:
            u = urlparse(line)
            if u.scheme in ('http', 'https', 'socks5'):
                scheme = u.scheme
            ip = u.hostname or ''
            port = u.port or 80
            username = u.username or ''
            password = u.password or ''
        elif ',' in line:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) < 2:
                continue
            ip = parts[0]
            port = int(parts[1]) if parts[1].isdigit() else 80
            username = parts[2] if len(parts) > 2 else ''
            password = parts[3] if len(parts) > 3 else ''
            geo = parts[4] if len(parts) > 4 and parts[4] else 'US'
        elif ':' in line:
            parts = [p.strip() for p in line.split(':')]
            if len(parts) < 2:
                continue
            ip = parts[0]
            port = int(parts[1]) if parts[1].isdigit() else 80
            username = parts[2] if len(parts) > 2 else ''
            password = parts[3] if len(parts) > 3 else ''
        else:
            continue

        if not ip or not re.match(r'^[\d\.]+$', ip):
            continue

        parsed.append({
            'scheme': scheme,
            'ip': ip,
            'port': port,
            'username': username,
            'password': password,
            'geo': geo[:50],
            'city': city,
        })
    return parsed


class Command(BaseCommand):
    help = 'Seeds proxies (from CSV/file or default placeholders) and creates 50 isolated bot profiles distributed across them'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv',
            type=str,
            help='Path to proxy list file (CSV or ip:port:user:pass lines)'
        )
        parser.add_argument(
            '--bots',
            type=int,
            default=50,
            help='Number of bot profiles to seed (default: 50)'
        )
        parser.add_argument(
            '--if-empty',
            action='store_true',
            help='Only seed if Bot table is currently empty'
        )

    def handle(self, *args, **options):
        if options['if_empty'] and Bot.objects.exists():
            self.stdout.write(self.style.SUCCESS("Bot database already populated, skipping seed."))
            return

        csv_path = options.get('csv')
        bot_count = max(1, min(100, options.get('bots', 50)))
        proxies_data = []

        if csv_path and os.path.exists(csv_path):
            self.stdout.write(f"Loading proxies from file: {csv_path}")
            with open(csv_path, 'r', encoding='utf-8') as f:
                proxies_data = parse_proxy_lines(f.read())
        else:
            self.stdout.write("Generating 20 default placeholder proxy slots (replace with your free or residential proxies)...")
            base_ips = [
                (198, 51, 100), (203, 0, 113), (192, 0, 2), (104, 28, 14),
                (172, 67, 180), (142, 250, 72), (173, 194, 21), (74, 125, 133),
            ]
            for i in range(1, 21):
                block = base_ips[(i - 1) % len(base_ips)]
                geo, city = DEFAULT_GEOS[(i - 1) % len(DEFAULT_GEOS)]
                proxies_data.append({
                    'scheme': 'http',
                    'ip': f"{block[0]}.{block[1]}.{block[2]}.{(i * 7 + 15) % 240 + 1}",
                    'port': 8000 + (i % 20),
                    'username': f"proxy_user_{i:02d}",
                    'password': f"proxy_pass_{i:02d}",
                    'geo': geo,
                    'city': city,
                    'wifi_ssid': WIFI_SSIDS[i - 1],
                })

        if not proxies_data:
            self.stderr.write(self.style.ERROR("No valid proxies found in input."))
            return

        created_proxies = []
        for idx, p_info in enumerate(proxies_data, start=1):
            proxy, _ = Proxy.objects.update_or_create(
                ip=p_info['ip'],
                port=p_info['port'],
                defaults={
                    'scheme': p_info.get('scheme', 'http'),
                    'proxy_type': 'FREE' if not csv_path else 'ISP',
                    'username': p_info.get('username', ''),
                    'password': p_info.get('password', ''),
                    'geo': p_info.get('geo', 'US'),
                    'city': p_info.get('city', 'New York'),
                    'isp': p_info.get('wifi_ssid', f"Proxy Node #{idx:02d}"),
                    'latency_ms': 40,
                    'health_status': 'ONLINE',
                    'packet_loss_percent': 0,
                    'is_active': True,
                }
            )
            created_proxies.append(proxy)

        profiles_root = os.getenv('DATA_PROFILES_DIR', '/data/profiles')
        for bot_id in range(1, bot_count + 1):
            proxy = created_proxies[(bot_id - 1) % len(created_proxies)]
            bot_name = f"bot_{bot_id:03d}"
            profile_dir = os.path.join(profiles_root, bot_name)
            os.makedirs(profile_dir, exist_ok=True)

            bot, _ = Bot.objects.update_or_create(
                name=bot_name,
                defaults={
                    'proxy': proxy,
                    'profile_path': profile_dir,
                    'status': 'IDLE',
                }
            )

            provider = MAIL_PROVIDERS[(bot_id - 1) % len(MAIL_PROVIDERS)]
            Account.objects.get_or_create(
                bot=bot,
                defaults={
                    'mailbox_provider': provider,
                    'mailbox_email': '',
                    'mailbox_password': '',
                    'app_email': '',
                    'app_password': '',
                    'is_verified': False,
                }
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(created_proxies)} proxies across {bot_count} isolated bot profiles!"
            )
        )
