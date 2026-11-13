import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all registered Django apps
app.autodiscover_tasks()

# Celery Beat schedule for ambient browser profile maintenance
app.conf.beat_schedule = {
    'ambient-bot-profile-refresh-every-15-mins': {
        'task': 'control_plane.tasks.ambient_profile_refresh',
        'schedule': crontab(minute='*/15'),
    },
}

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
