import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  Search, RefreshCw, CheckCircle2, Play, Upload, Activity,
  X, ExternalLink, Save, Square, Globe
} from 'lucide-react';

export default function AccountsPage() {
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [pingingBotId, setPingingBotId] = useState<number | null>(null);
  const [testingAll, setTestingAll] = useState(false);

  // Proxy Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [proxyType, setProxyType] = useState<'FREE' | 'ISP' | 'RESIDENTIAL'>('FREE');
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // noVNC Browser Studio Modal
  const [vncSession, setVncSession] = useState<{
    bot: any;
    novncUrl: string;
    service: string;
    proxy: string;
  } | null>(null);
  const [launchingBotId, setLaunchingBotId] = useState<number | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts/');
      if (res.ok) {
        setBots(await res.json());
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const pingProxy = async (botId: number, proxyId: number) => {
    if (!proxyId) return;
    setPingingBotId(botId);
    try {
      const res = await fetch(`/api/proxies/${proxyId}/ping/`, { method: 'POST' });
      if (res.ok) {
        const updatedProxy = await res.json();
        setBots(prev =>
          prev.map(b => (b.proxy?.id === proxyId ? { ...b, proxy: updatedProxy } : b))
        );
      }
    } catch {}
    finally {
      setPingingBotId(null);
    }
  };

  const testAllProxies = async () => {
    setTestingAll(true);
    setImportNotice(null);
    try {
      const res = await fetch('/api/proxies/health_check/', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setImportNotice(
          `Tested ${data.total} proxies: ${data.online} Online, ${data.degraded} Slow, ${data.offline} Offline.`
        );
        await fetchBots();
      }
    } catch {}
    finally {
      setTestingAll(false);
    }
  };

  const handleImportProxies = async () => {
    setImportNotice(null);
    try {
      const res = await fetch('/api/proxies/import_csv/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_data: csvText,
          proxy_type: proxyType,
          replace_all: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowImportModal(false);
        setCsvText('');
        setImportNotice(
          `Imported ${data.count} ${data.proxy_type} proxies and assigned across ${data.reassigned_bots} bots.`
        );
        await fetchBots();
      } else {
        setImportNotice(data.error || 'Import failed');
      }
    } catch (e: any) {
      setImportNotice(e.message || 'Import error');
    }
  };

  const launchVnc = async (bot: any, service: 'gmail' | 'outlook' | 'productstunt' | 'ipcheck') => {
    setLaunchingBotId(bot.id);
    try {
      const res = await fetch(`/api/bots/${bot.id}/launch/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccountEmail(bot.account?.mailbox_email || '');
        setAccountPassword('');
        setIsVerified(Boolean(bot.account?.is_verified));
        setVncSession({
          bot,
          novncUrl: data.novnc_url,
          service,
          proxy: data.proxy,
        });
        fetchBots();
      }
    } catch {}
    finally {
      setLaunchingBotId(null);
    }
  };

  const stopAndSaveVnc = async (saveDetails: boolean) => {
    if (!vncSession) return;
    setSavingAccount(true);
    try {
      if (saveDetails && vncSession.bot.account?.id) {
        const payload: any = { is_verified: isVerified };
        if (accountEmail.trim()) {
          payload.mailbox_email = accountEmail.trim();
          payload.app_email = accountEmail.trim();
        }
        if (accountPassword.trim()) {
          payload.mailbox_password = accountPassword.trim();
          payload.app_password = accountPassword.trim();
        }
        await fetch(`/api/accounts/${vncSession.bot.account.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      await fetch(`/api/bots/${vncSession.bot.id}/stop_vnc/`, { method: 'POST' });
      setVncSession(null);
      await fetchBots();
    } catch {}
    finally {
      setSavingAccount(false);
    }
  };

  const filteredBots = bots.filter(b => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.proxy?.ip && b.proxy.ip.includes(searchTerm)) ||
      (b.account?.mailbox_email && b.account.mailbox_email.toLowerCase().includes(searchTerm.toLowerCase()));
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
        <title>Accounts &amp; Proxies | Productstunt Lab</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Accounts, Profiles &amp; Proxies</h1>
            <p className="text-sm text-neutral-400 mt-0.5">
              Import free or residential proxies, test real exit IPs, and launch stealth noVNC browsers for manual setup.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Proxies</span>
            </button>

            <button
              onClick={testAllProxies}
              disabled={testingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-lg transition-colors disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 ${testingAll ? 'animate-pulse' : ''}`} />
              <span>{testingAll ? 'Testing Proxies...' : 'Test All Proxies'}</span>
            </button>

            <button
              onClick={fetchBots}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {importNotice && (
          <div className="p-3.5 rounded-xl bg-neutral-900 border border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between">
            <span>{importNotice}</span>
            <button onClick={() => setImportNotice(null)} className="text-neutral-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by bot, email, or proxy IP..."
              className="w-full pl-9 pr-3.5 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="flex gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-xs font-medium overflow-x-auto">
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
                  <th className="py-3 px-4">Assigned Proxy &amp; Exit IP</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4 text-right">Launch Browser / Test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                {filteredBots.map((bot: any) => {
                  const proxy = bot.proxy || {};
                  const isOnline = proxy.health_status === 'ONLINE';
                  const isDegraded = proxy.health_status === 'DEGRADED';

                  return (
                    <tr key={bot.id} className="hover:bg-neutral-800/40">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{bot.name}</div>
                        <div className="text-[10px] text-neutral-500">
                          {bot.cookies_count ?? 0} cookies · {bot.profile_size_mb ?? 0}MB
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            bot.status === 'IDLE'
                              ? 'bg-neutral-800 text-neutral-300'
                              : bot.status === 'RUNNING'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : 'bg-indigo-950 text-indigo-400'
                          }`}
                        >
                          {bot.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {proxy.ip ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isOnline
                                    ? 'bg-emerald-500'
                                    : isDegraded
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                              />
                              <span className="text-white">
                                {proxy.scheme || 'http'}://{proxy.ip}:{proxy.port}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                                {proxy.proxy_type || 'ISP'}
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-500 pl-4 mt-0.5">
                              {proxy.exit_ip ? `Exit: ${proxy.exit_ip}` : 'Not pinged yet'} · {proxy.has_auth ? 'Auth OK' : 'No Auth'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-500">Direct (No Proxy)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`tabular-nums ${
                            isOnline
                              ? 'text-emerald-400 font-semibold'
                              : isDegraded
                              ? 'text-amber-400 font-semibold'
                              : 'text-rose-400'
                          }`}
                        >
                          {proxy.latency_ms ? `${proxy.latency_ms}ms` : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {bot.account?.is_verified ? (
                          <div className="text-emerald-400 text-[11px]">
                            <div className="flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verified</span>
                            </div>
                            {bot.account.mailbox_email && (
                              <div className="text-[10px] text-neutral-400 truncate max-w-[160px]">
                                {bot.account.mailbox_email}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-500 text-[11px]">
                            {bot.account?.mailbox_email || 'Pending Setup'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            onClick={() => launchVnc(bot, 'gmail')}
                            disabled={launchingBotId === bot.id}
                            className="px-2 py-1 text-[11px] bg-neutral-800 hover:bg-indigo-600 text-neutral-200 rounded transition-colors disabled:opacity-50"
                          >
                            Gmail
                          </button>
                          <button
                            onClick={() => launchVnc(bot, 'outlook')}
                            disabled={launchingBotId === bot.id}
                            className="px-2 py-1 text-[11px] bg-neutral-800 hover:bg-indigo-600 text-neutral-200 rounded transition-colors disabled:opacity-50"
                          >
                            Outlook
                          </button>
                          <button
                            onClick={() => launchVnc(bot, 'productstunt')}
                            disabled={launchingBotId === bot.id}
                            className="px-2 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <Play className="w-3 h-3" />
                            <span>Productstunt</span>
                          </button>
                          <button
                            onClick={() => launchVnc(bot, 'ipcheck')}
                            disabled={launchingBotId === bot.id}
                            title="Open browserleaks.com/ip inside noVNC to verify stealth & proxy IP"
                            className="px-2 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            <span>IP</span>
                          </button>
                          {proxy.id && (
                            <button
                              onClick={() => pingProxy(bot.id, proxy.id)}
                              disabled={pingingBotId === bot.id}
                              className="px-2 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors disabled:opacity-50"
                            >
                              {pingingBotId === bot.id ? '...' : 'Ping'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Import Proxies Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Import Free or Residential Proxies</h3>
              <button onClick={() => setShowImportModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 block">Proxy Tier</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'FREE', label: 'Free / Shared' },
                  { id: 'ISP', label: 'Static ISP' },
                  { id: 'RESIDENTIAL', label: 'Residential Static' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setProxyType(t.id as any)}
                    className={`py-2 px-3 rounded-lg border font-medium ${
                      proxyType === t.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 block">
                Paste Proxies (supports <code className="text-indigo-300">ip,port,user,pass</code>,{' '}
                <code className="text-indigo-300">ip:port:user:pass</code>, <code className="text-indigo-300">socks5://user:pass@ip:port</code>, or <code className="text-indigo-300">ip:port</code>)
              </label>
              <textarea
                rows={7}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder={'198.51.100.10,8080,myuser,mypass\n198.51.100.11:8080:myuser:mypass\nsocks5://user:pass@203.0.113.5:1080'}
                className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={handleImportProxies}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Import &amp; Assign to Bots
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded noVNC Interactive Browser Modal */}
      {vncSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-5">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-neutral-950 border-b border-neutral-800">
              <div className="text-xs font-mono">
                <span className="font-bold text-white">{vncSession.bot.name}</span>
                <span className="text-neutral-500 mx-2">·</span>
                <span className="text-indigo-300 uppercase">{vncSession.service}</span>
                <span className="text-neutral-500 mx-2">·</span>
                <span className="text-emerald-400">Proxy: {vncSession.proxy}</span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={vncSession.novncUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Tab</span>
                </a>
                <button
                  onClick={() => stopAndSaveVnc(false)}
                  disabled={savingAccount}
                  className="px-2.5 py-1.5 text-xs bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-500/30 rounded-lg flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>
              </div>
            </div>

            <div className="flex-1 bg-black relative">
              <iframe
                src={vncSession.novncUrl}
                className="w-full h-full border-0"
                title={`noVNC-${vncSession.bot.name}`}
              />
            </div>

            <div className="p-3.5 bg-neutral-950 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <input
                  type="email"
                  value={accountEmail}
                  onChange={e => setAccountEmail(e.target.value)}
                  placeholder="Account email created (e.g. test01@gmail.com)"
                  className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white w-64 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="password"
                  value={accountPassword}
                  onChange={e => setAccountPassword(e.target.value)}
                  placeholder="Password (optional)"
                  className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white w-44 focus:outline-none focus:border-indigo-500"
                />
                <label className="flex items-center gap-1.5 text-xs text-neutral-300 cursor-pointer px-2">
                  <input
                    type="checkbox"
                    checked={isVerified}
                    onChange={e => setIsVerified(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>Mark Account Verified</span>
                </label>
              </div>

              <button
                onClick={() => stopAndSaveVnc(true)}
                disabled={savingAccount}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingAccount ? 'Saving...' : 'Save Profile & Close'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
