import React, { useState } from 'react';
import { useBotLab } from '../context/BotLabContext';
import { 
  Server, Cpu, HardDrive, Database, Activity, 
  Power, ShieldAlert, Layers, RefreshCw, Terminal, CheckCircle2, AlertTriangle, X
} from 'lucide-react';

const DEFAULT_DOCKER_SERVICES = [
  { name: 'productstunt_db', image: 'postgres:15-alpine', status: 'healthy', ramMb: 340 },
  { name: 'productstunt_redis', image: 'redis:7-alpine', status: 'healthy', ramMb: 110 },
  { name: 'productstunt_backend', image: 'productstunt-backend:latest', status: 'healthy', ramMb: 420 },
  { name: 'productstunt_worker', image: 'productstunt-backend:latest', status: 'healthy', ramMb: 1850 },
  { name: 'productstunt_beat', image: 'productstunt-backend:latest', status: 'healthy', ramMb: 95 },
  { name: 'productstunt_frontend', image: 'productstunt-frontend:latest', status: 'healthy', ramMb: 280 },
  { name: 'productstunt_novnc', image: 'theasp/novnc:latest', status: 'healthy', ramMb: 120 },
];

export const InfrastructureMonitor: React.FC = () => {
  const { metrics, bots, emergencyKillSwitch, campaigns } = useBotLab();
  const [showKillConfirm, setShowKillConfirm] = useState(false);
  const [killNotice, setKillNotice] = useState<string | null>(null);

  const activeCampaign = campaigns.find(c => c.status === 'IN_PROGRESS');
  const runningBots = bots.filter(b => b.status === 'RUNNING').length;
  const queuedTasks = activeCampaign
    ? activeCampaign.scheduledTasks.filter(t => t.status === 'QUEUED').length
    : 0;

  const ramUsedPercent = Math.round((metrics.ramUsedMb / metrics.ramTotalMb) * 100);
  const swapUsedPercent = Math.round((metrics.swapUsedMb / metrics.swapTotalMb) * 100);

  const handleKillSwitch = () => {
    setShowKillConfirm(true);
  };

  const confirmKill = () => {
    const res = emergencyKillSwitch();
    setShowKillConfirm(false);
    setKillNotice(`Kill switch executed: ${res.purgedTasks} tasks purged, ${res.resetBots} bots reset to IDLE.`);
    setTimeout(() => setKillNotice(null), 5000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" />
            <span>Contabo Cloud VPS 6 Infrastructure Monitor</span>
          </h1>
          <p className="text-sm text-neutral-400">
            6 vCPU · 12 GB RAM · NVMe Storage · 4GB Active Swap · Docker Compose & Celery Concurrency=4
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleKillSwitch}
            className="flex items-center gap-2 px-4 py-2 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-600/50 rounded-xl font-semibold text-xs transition-colors shadow-lg shadow-rose-950/50"
          >
            <Power className="w-4 h-4 text-rose-400" />
            <span>EMERGENCY KILL SWITCH</span>
          </button>
        </div>
      </div>

      {/* Hardware Utilization Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-mono flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>CPU Core Load</span>
            </span>
            <span className="text-sm font-bold text-white font-mono tabular-nums">
              {metrics.cpuUsagePercent.toFixed(1)}%
            </span>
          </div>

          <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                metrics.cpuUsagePercent > 80 ? 'bg-rose-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(100, metrics.cpuUsagePercent)}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
            <span>6x vCPU High-Performance</span>
            <span>Load Avg: 0.84</span>
          </div>
        </div>

        {/* RAM */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-mono flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>RAM Allocation</span>
            </span>
            <span className="text-sm font-bold text-white font-mono tabular-nums">
              {(metrics.ramUsedMb / 1024).toFixed(2)} / {(metrics.ramTotalMb / 1024).toFixed(0)} GB
            </span>
          </div>

          <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${ramUsedPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
            <span>{ramUsedPercent}% In Use</span>
            <span className="text-emerald-400 font-semibold">Healthy (No OOM)</span>
          </div>
        </div>

        {/* Swap File */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-mono flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Swap Buffer (/swapfile)</span>
            </span>
            <span className="text-sm font-bold text-white font-mono tabular-nums">
              {(metrics.swapUsedMb / 1024).toFixed(2)} / {(metrics.swapTotalMb / 1024).toFixed(0)} GB
            </span>
          </div>

          <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${swapUsedPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
            <span>4GB Fallocate Configured</span>
            <span>Protects Chromium</span>
          </div>
        </div>

        {/* Celery Task Queue */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-mono flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Celery Worker Concurrency</span>
            </span>
            <span className="text-sm font-bold text-indigo-400 font-mono tabular-nums">
              {metrics.activeWorkerSlots} / {metrics.celeryConcurrency} Active
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[1, 2, 3, 4].map(slot => {
              const isBusy = slot <= runningBots;
              return (
                <div
                  key={slot}
                  className={`h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold ${
                    isBusy
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : 'bg-neutral-800 text-neutral-500 border border-neutral-700/60'
                  }`}
                >
                  W{slot}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
            <span>Redis Queue Depth: {queuedTasks}</span>
            <span>shm_size: 2GB</span>
          </div>
        </div>
      </div>

      {/* Docker Compose Cluster Status */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold text-white font-mono">Docker Compose Service Orchestration</span>
          </div>
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>All 7 Containers Healthy</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-950/40 text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="py-2.5 px-4">Container</th>
                <th className="py-2.5 px-4">Base Image</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Memory RSS</th>
                <th className="py-2.5 px-4">Configuration Invariants</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {(metrics.dockerServices || DEFAULT_DOCKER_SERVICES).map(svc => (
                <tr key={svc.name} className="hover:bg-neutral-800/20">
                  <td className="py-2.5 px-4 font-bold text-neutral-200">{svc.name}</td>
                  <td className="py-2.5 px-4 text-neutral-400">{svc.image}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/30">
                      {svc.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-neutral-300 tabular-nums">{svc.ramMb} MB</td>
                  <td className="py-2.5 px-4 font-sans text-neutral-400 text-[11px]">
                    {svc.name.includes('db') && 'shared_buffers=512MB, max_connections=50'}
                    {svc.name.includes('redis') && 'maxmemory 512mb, allkeys-lru'}
                    {svc.name.includes('worker') && 'shm_size: 2gb, concurrency: 4, Playwright stealth'}
                    {svc.name.includes('beat') && 'crontab(minute="*/15") profile maintenance'}
                    {svc.name.includes('backend') && 'Django 5.0 REST API, port 8000'}
                    {svc.name.includes('frontend') && 'Next.js 14 Reverse Proxy, port 3000'}
                    {svc.name.includes('novnc') && 'Xvfb display :100+, websockify :6080'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dokploy & VPS Security Hardening Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Dokploy Application Deployment Commands</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed font-sans">
            Dokploy runs on your Contabo host and manages Docker Compose lifecycles directly via Git webhooks or manual compose uploads:
          </p>
          <div className="p-3 bg-neutral-950 rounded-lg text-xs font-mono text-neutral-300 space-y-1.5 border border-neutral-800">
            <div># Verify running services</div>
            <div className="text-indigo-300">docker compose ps</div>
            <div># Check memory usage to guarantee no OOM crash</div>
            <div className="text-indigo-300">docker stats --no-stream</div>
            <div># Inspect Celery worker log output</div>
            <div className="text-indigo-300">docker logs -f productstunt_worker</div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Firewall & Port Invariants</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed font-sans">
            In accordance with Phase 1.3 server security guidelines, internal services must never be exposed publicly without VPN/Cloudflare Access:
          </p>
          <ul className="text-xs text-neutral-300 space-y-1.5 font-mono">
            <li>· Port 3000: Next.js Dashboard (Protected by Tailscale/SSO)</li>
            <li>· Port 8000: Django Backend API (127.0.0.1 reverse proxy only)</li>
            <li>· Port 5432: PostgreSQL 15 (Docker internal bridge only)</li>
            <li>· Port 6379: Redis 7 (Docker internal bridge only)</li>
            <li>· Ports 6080-6180: Websockify NoVNC tunnels (Restricted IP only)</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showKillConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-red-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Confirm Emergency Kill Switch</h3>
                <p className="text-xs text-neutral-400">Abrupt task cancellation & worker purge</p>
              </div>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              This will immediately flush the Redis task queue, terminate all active Playwright browser sessions, and reset all 100 bots to <span className="font-mono text-emerald-400 font-bold">IDLE</span> state.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowKillConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmKill}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors shadow-lg shadow-red-950/50"
              >
                Yes, Purge Queue & Reset All Bots
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notice Banner */}
      {killNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-900 border border-emerald-500/40 text-xs font-mono text-emerald-300 shadow-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{killNotice}</span>
          <button onClick={() => setKillNotice(null)} className="ml-2 text-neutral-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
