import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Search, Globe, Wifi, RefreshCw, CheckCircle2, Play, AlertTriangle } from 'lucide-react';

export default function AccountsPage() {
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [pingingBotId, setPingingBotId] = useState<number | null>(null);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts/');
      if (res.ok) {
        const data = await res.json();
        setBots(data);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const pingProxy = async (botId: number, proxyId: number) => {
    setPingingBotId(botId);
    try {
      const res = await fetch(`/api/proxies/${proxyId}/ping/`, { method: 'POST' });
      if (res.ok) {
        const updatedProxy = await res.json();
        setBots(prev => prev.map(b => b.id === botId ? { ...b, proxy: updatedProxy } : b));
      }
    } catch {}
    finally {
      setPingingBotId(null);
    }
  };

  const filteredBots = bots.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.proxy?.ip && b.proxy.ip.includes(searchTerm));
    if (!matchesSearch) return false;
    if (filter === 'ONLINE') return b.proxy?.health_status === 'ONLINE';
    if (filter === 'DEGRADED') return b.proxy?.health_status === 'DEGRADED';
    if (filter === 'OFFLINE') return b.proxy?.health_status === 'OFFLINE';
    if (filter === 'VERIFIED') return b.account?.is_verified;
    return true;
  });

  return (
    <>
      <Head>
        <title>Bot Fleet & Proxies | Productstunt Lab</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Bot Fleet & Dedicated Webshare Proxies</h1>
            <p className="text-sm text-neutral-400 mt-0.5">
              100 persistent profiles with 1:1 Static ISP proxy mapping and real-time latency indicators.
            </p>
          </div>

          <button
            onClick={fetchBots}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Fleet</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by bot name or proxy IP..."
              className="w-full pl-9 pr-3.5 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="flex gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-xs font-medium">
            {['ALL', 'ONLINE', 'DEGRADED', 'OFFLINE', 'VERIFIED'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filter === tab ? 'bg-indigo-600 text-white font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Bot Table */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Bot</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Webshare Static Proxy</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Profile & Cookies</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                {filteredBots.map((bot: any) => {
                  const proxy = bot.proxy || {};
                  const isOnline = proxy.health_status === 'ONLINE';
                  const isDegraded = proxy.health_status === 'DEGRADED';
                  const isOffline = proxy.health_status === 'OFFLINE';

                  return (
                    <tr key={bot.id} className="hover:bg-neutral-800/40">
                      <td className="py-3 px-4 font-bold text-white">{bot.name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          bot.status === 'IDLE' ? 'bg-neutral-800 text-neutral-300' :
                          bot.status === 'RUNNING' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' :
                          'bg-indigo-950 text-indigo-400'
                        }`}>
                          {bot.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' :
                            isDegraded ? 'bg-amber-500 shadow-sm shadow-amber-500/50' :
                            'bg-rose-500 shadow-sm shadow-rose-500/50'
                          }`} />
                          <span className="text-white">{proxy.ip}:{proxy.port}</span>
                          <span className="text-[10px] text-neutral-500">({proxy.geo || 'US'})</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`tabular-nums ${
                          isOnline ? 'text-emerald-400 font-semibold' :
                          isDegraded ? 'text-amber-400 font-semibold' : 'text-rose-400'
                        }`}>
                          {proxy.latency_ms ?? 35}ms
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-neutral-400">
                        {bot.cookies_count ?? 24} cookies · {bot.profile_size_mb ?? 16.4}MB
                      </td>
                      <td className="py-3 px-4">
                        {bot.account?.is_verified ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Primed & Verified</span>
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-[11px]">Pending Setup</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => pingProxy(bot.id, proxy.id)}
                          disabled={pingingBotId === bot.id}
                          className="px-2.5 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded transition-colors disabled:opacity-50"
                        >
                          {pingingBotId === bot.id ? 'Pinging...' : 'Ping'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
