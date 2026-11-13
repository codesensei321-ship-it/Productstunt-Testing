import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Terminal, RefreshCw, Radio, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function HistoryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/history/');
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : data.results || []);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Live Activity Logs | Productstunt Lab</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <span>Real-Time Celery Execution Logs</span>
            </h1>
            <p className="text-sm text-neutral-400 mt-0.5">
              Live audit stream of Playwright browser sessions, stealth upvotes, human comments, and proxy pings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-400">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Polling Active</span>
            </div>
            <button
              onClick={fetchLogs}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 font-mono text-xs max-h-[640px] overflow-y-auto space-y-2">
          {logs.length === 0 ? (
            <div className="text-neutral-500 py-8 text-center">No activity recorded yet. Launch a campaign to see live execution telemetry.</div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="p-2.5 rounded bg-neutral-900 border border-neutral-850 hover:border-neutral-700 transition-colors">
                <div className="flex items-center justify-between text-neutral-400 text-[11px] pb-1 border-b border-neutral-800/60">
                  <span className="text-neutral-500">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recent'}</span>
                  <span className="font-bold text-indigo-300">{log.bot_name || `Bot #${log.bot}`}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    log.action === 'UPVOTE' ? 'bg-emerald-950 text-emerald-400' :
                    log.action === 'COMMENT' ? 'bg-blue-950 text-blue-400' :
                    log.action === 'ERROR' ? 'bg-rose-950 text-rose-400' : 'bg-neutral-800 text-neutral-300'
                  }`}>
                    {log.action}
                  </span>
                </div>
                <div className="pt-1.5 text-neutral-200 text-xs break-all">
                  {log.details || `Executed ${log.action} against ${log.target_url}`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
