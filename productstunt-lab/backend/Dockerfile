FROM mcr.microsoft.com/playwright/python:v1.42.0-jammy

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install Xvfb, x11vnc, noVNC, websockify, net-tools, and supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    net-tools \
    curl \
    supervisor \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

# Symlink noVNC index
RUN ln -s /usr/share/novnc/vnc.html /usr/share/novnc/index.html || true

# Copy requirements & install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Create profile directories
RUN mkdir -p /data/profiles && chmod 777 /data/profiles

# Copy source code
COPY . /app/
RUN chmod +x /app/automation/launch_vnc.sh || true

EXPOSE 8000 5900-6000 6080-6180

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
