import os
import csv
import random
from django.core.management.base import BaseCommand
from control_plane.models import Proxy, Bot, Account

# 20 Realistic Webshare Static ISP proxy pools with US, UK, DE, and CA nodes
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

# Organic distribution of 50 accounts across 20 Wi-Fi IPs:
# 4 single-occupant (1 bot), 6 couples (2 bots), 6 small families (3 bots), 4 large households (4 bots)
# 4*1 + 6*2 + 6*3 + 4*4 = 4 + 12 + 18 + 16 = 50 bots
WIFI_DEVICE_DISTRIBUTION = [
    3, 2, 1, 4, 2, 3, 1, 2, 4, 3,
    2, 1, 3, 4, 2, 3, 1, 2, 4, 3
]

MAIL_PROVIDERS = ['Gmail', 'Outlook']

class Command(BaseCommand):
    help = 'Seeds 20 Webshare Static ISP proxies mapped as Residential Wi-Fi Networks with 50 organically distributed bots'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv',
            type=str,
            help='Path to Webshare proxy CSV file (format: ip,port,username,password,geo)'
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
        proxies_data = []

        if csv_path and os.path.exists(csv_path):
            self.stdout.write(f"Loading proxies from CSV: {csv_path}")
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                for row in reader:
                    if len(row) >= 4:
                        proxies_data.append({
                            'ip': row[0].strip(),
                            'port': int(row[1].strip()),
                            'username': row[2].strip(),
                            'password': row[3].strip(),
                            'geo': row[4].strip() if len(row) > 4 else 'US',
                            'city': 'Imported',
                        })
        else:
            self.stdout.write("Generating 20 Webshare Static ISP proxy blueprints (Residential Wi-Fi Hubs)...")
            base_ips = [
                (198, 51, 100),
                (203, 0, 113),
                (192, 0, 2),
                (104, 28, 14),
                (172, 67, 180),
                (142, 250, 72),
                (173, 194, 21),
                (74, 125, 133),
            ]
            for i in range(1, 21):
                block = base_ips[(i - 1) % len(base_ips)]
                geo, city = DEFAULT_GEOS[(i - 1) % len(DEFAULT_GEOS)]
                proxies_data.append({
                    'ip': f"{block[0]}.{block[1]}.{block[2]}.{(i * 7 + 15) % 240 + 1}",
                    'port': 8000 + (i % 20),
                    'username': f"webshare_wifi_{i:02d}",
                    'password': f"ws_key_{i:02d}_vps6",
                    'geo': geo,
                    'city': city,
                    'wifi_ssid': WIFI_SSIDS[i - 1],
                })

        # Create/Update the 20 Proxy objects
        created_proxies = []
        for i, p_info in enumerate(proxies_data[:20], start=1):
            is_degraded = (i == 8)
            latency = 168 if is_degraded else (20 + (i * 3) % 45)
            health = 'DEGRADED' if is_degraded else 'ONLINE'

            proxy, _ = Proxy.objects.update_or_create(
                ip=p_info['ip'],
                defaults={
                    'port': p_info['port'],
                    'username': p_info['username'],
                    'password': p_info['password'],
                    'geo': p_info.get('geo', 'US'),
                    'city': p_info.get('city', 'New York'),
                    'isp': f"Webshare Residential ISP ({p_info.get('wifi_ssid', 'Home-WiFi')})",
                    'latency_ms': latency,
                    'health_status': health,
                    'packet_loss_percent': 3 if is_degraded else 0,
                    'is_active': True,
                }
            )
            created_proxies.append(proxy)

        # Distribute 50 bots across the 20 proxies according to WIFI_DEVICE_DISTRIBUTION
        bot_id = 1
        for hub_idx, device_count in enumerate(WIFI_DEVICE_DISTRIBUTION):
            proxy = created_proxies[hub_idx]
            for dev_num in range(device_count):
                bot_name = f"bot_{bot_id:03d}"
                profile_dir = f"/data/profiles/{bot_name}"
                os.makedirs(profile_dir, exist_ok=True)

                is_primed = (bot_id <= 18)

                bot, _ = Bot.objects.update_or_create(
                    name=bot_name,
                    defaults={
                        'proxy': proxy,
                        'profile_path': profile_dir,
                        'status': 'IDLE',
                        'cookies_count': 24 if is_primed else 2,
                        'profile_size_mb': 14.5 if is_primed else 1.2,
                    }
                )

                provider = MAIL_PROVIDERS[(bot_id - 1) % len(MAIL_PROVIDERS)]
                Account.objects.update_or_create(
                    bot=bot,
                    defaults={
                        'mailbox_provider': provider,
                        'mailbox_email': f"user.{bot_name}@{'gmail.com' if provider == 'Gmail' else 'outlook.com'}",
                        'mailbox_password': f"Pass_{bot_name}!2026",
                        'app_email': f"user.{bot_name}@{'gmail.com' if provider == 'Gmail' else 'outlook.com'}" if is_primed else '',
                        'app_password': f"Staging_{bot_name}#2026" if is_primed else '',
                        'is_verified': is_primed,
                    }
                )
                bot_id += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded 20 Residential Wi-Fi Networks with 50 organically distributed bot devices!"))
