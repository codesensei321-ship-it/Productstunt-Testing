# Productstunt Bot Testing Lab

A secure, single-VPS automated bot-testing lab to simulate realistic human traffic against `staging.productstunt.com`.
Built with 100 Webshare Static ISP proxies, persistent browser profiles, human-in-the-loop account creation via NoVNC, and an enterprise control plane.

## Infrastructure Specifications
- **Target Host**: 1x Contabo Cloud VPS 6 (6 vCPU, 12 GB RAM, NVMe)
- **Host OS**: Ubuntu 22.04 LTS / 24.04 LTS
- **Orchestration**: Docker Compose + Dokploy / Standalone Docker
- **Task Queue**: Celery 5.3 + Redis 7 (`concurrency=4`, `shm_size='2gb'`)
- **Database**: PostgreSQL 15 Alpine (`shared_buffers=512MB`, `max_connections=50`)
- **Browser Automation**: Playwright Python v1.42.0 with stealth evasion & persistent contexts
- **Interactive VNC**: Xvfb + x11vnc + noVNC + websockify

---

## 1. Contabo Server Preparation (One-Time Setup)

```bash
# 1. Update system
apt update && apt upgrade -y

# 2. Create 4GB Swap file (mandatory to handle Chromium RAM spikes during concurrent sessions)
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 3. Verify swap
free -h

# 4. Install Docker & Docker Compose plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 5. (Optional) Install Dokploy
curl -sSL https://dokploy.com/install.sh | sh
```

---

## 2. Environment Configuration

Clone or upload this repository into `/root/productstunt-lab`:

```bash
cd /root/productstunt-lab
cp .env.example .env
nano .env
```

Ensure the following variables are customized:
```ini
DEBUG=False
SECRET_KEY=generate_a_secure_50_character_secret_key_here
DATABASE_URL=postgres://admin:staging_password@db:5432/productstunt
REDIS_URL=redis://redis:6379/0
STAGING_URL=https://staging.productstunt.com
ALLOWED_HOSTS=localhost,127.0.0.1,backend,frontend,your-vps-ip
NEXT_PUBLIC_API_URL=http://your-vps-ip:8000/api
```

---

## 3. Webshare Proxy CSV Import Format

Place your Webshare proxy export in `data/webshare_proxies.csv`:
```csv
ip,port,username,password,geo
198.51.100.22,80,usr_isp_001,secret_pass_1,US - New York
198.51.100.24,80,usr_isp_002,secret_pass_2,US - Los Angeles
...
```
Then seed the database:
```bash
docker compose run --rm backend python manage.py seed_bots --csv=/app/../data/webshare_proxies.csv
```
If no CSV is provided, `python manage.py seed_bots` will automatically construct 100 deterministic Webshare Static ISP proxy definitions across 10 regions.

---

## 4. Starting the Cluster

```bash
docker compose up -d --build
```

Verify services status:
```bash
docker compose ps
docker stats
```

---

## 5. Human-in-the-Loop Account Creation Workflow

1. Navigate to the dashboard at `http://<your-vps-ip>:3000/accounts`.
2. Find the target bot (e.g. `bot_042`) with status `IDLE` and an unverified account.
3. Click **"Launch Browser"**.
4. The backend initializes Xvfb and websockify on a dedicated port (`6080 + bot_id`) and opens an embedded NoVNC canvas.
5. In the browser view:
   - Navigate to Gmail (`accounts.google.com`) or Outlook (`login.live.com`).
   - Sign up or log into the mailbox, solving SMS or CAPTCHA manually.
   - Navigate to `staging.productstunt.com/signup` and complete authentication.
6. The Playwright observer intercepts authentication tokens and cookies, saves the persistent profile to `/data/profiles/bot_042`, and records the verified email.
7. Click **"Save & Close Session"**. The bot is now permanently primed for automated campaign tasks.

---

## 6. Emergency Kill Switch

To immediately cancel all queued Celery tasks, kill running Chromium processes, and reset all 100 bots to `IDLE`:
- Press the **"EMERGENCY KILL SWITCH"** button in the dashboard, OR
- Run via terminal:
  ```bash
  curl -X POST http://localhost:8000/api/system/kill_switch/
  ```
