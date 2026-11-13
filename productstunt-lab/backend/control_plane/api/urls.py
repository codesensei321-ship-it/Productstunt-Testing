from django.urls import path, include
from rest_framework.routers import DefaultRouter
from control_plane.api.views import (
    ProxyViewSet, CampaignViewSet, AccountViewSet, HistoryViewSet,
    launch_bot_vnc, stop_bot_vnc, emergency_kill_switch, system_metrics
)

router = DefaultRouter()
router.register(r'proxies', ProxyViewSet, basename='proxy')
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'history', HistoryViewSet, basename='history')

urlpatterns = [
    path('', include(router.urls)),
    path('bots/<int:bot_id>/launch/', launch_bot_vnc, name='bot-launch-vnc'),
    path('bots/<int:bot_id>/stop_vnc/', stop_bot_vnc, name='bot-stop-vnc'),
    path('system/kill_switch/', emergency_kill_switch, name='system-kill-switch'),
    path('system/metrics/', system_metrics, name='system-metrics'),
]
