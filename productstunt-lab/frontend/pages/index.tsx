import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Play, CheckCircle2, AlertTriangle, Plus, X, Zap, Square } from 'lucide-react';

const PRESET_URLS = [
  'https://staging.productstunt.com/products/nexus-flow-ai',
  'https://staging.productstunt.com/products/hyper-scale-vector-db',
  'https://staging.productstunt.com/products/pulse-devops-copilot',
];

const DEFAULT_COMMENTS = [
  'Huge congratulations on the launch! Loving the clean and responsive UI.',
  'Just tested the demo. Sub-second response times are super impressive. Upvoted!',
  'Does this offer automated webhook triggers for Slack and GitHub Actions?',
  'Been waiting for an alternative to this for months. Solid execution!',
];

export default function IndexPage() {
  const [targetUrl, setTargetUrl] = useState('https://staging.productstunt.com/products/nexus-flow-ai');
  const [votesCount, setVotesCount] = useState(3);
  const [comments, setComments] = useState<string[]>(DEFAULT_COMMENTS);
  const [commentInput, setCommentInput] = useState('');
  const [allowAnyHost, setAllowAnyHost] = useState(true);
  const [executionMode, setExecutionMode] = useState<'fast' | 'balanced' | 'organic'>('fast');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    fetchMetrics();
    fetchCampaigns();
    const timer = setInterval(() => {
      fetchMetrics();
      fetchCampaigns();
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/system/metrics/');
      if (res.ok) {
        setMetrics(await res.json());
      }
    } catch {}
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns/');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(Array.isArray(data) ? data : data.results || []);
      }
    } catch {}
  };

  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    setComments(prev => [...prev, commentInput.trim()]);
    setCommentInput('');
  };

  const handleRemoveComment = (index: number) => {
    setComments(prev => prev.filter((_, i) => i !== index));
  };

  const handleLaunch = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/campaigns/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_url: targetUrl,
          votes_requested: votesCount,
          comments,
          allow_any_host: allowAnyHost,
          execution_mode: executionMode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: `Campaign #${data.id} dispatched (${executionMode} mode) across ${votesCount} bots!`,
        });
        fetchMetrics();
        fetchCampaigns();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to dispatch campaign' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStopCampaign = async (id: number) => {
    try {
      await fetch(`/api/campaigns/${id}/stop/`, { method: 'POST' });
      fetchCampaigns();
      fetchMetrics();
    } catch {}
  };

  const maxBots = Math.max(1, metrics?.bot_pool?.idle ?? 50);

  return (
    <>
      <Head>
        <title>Launch Campaign | Productstunt Lab</title>
      </Head>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Launch Stealth Automation Campaign</h1>
            <p className="text-sm text-neutral-400 mt-0.5">
              Run real Playwright Chromium sessions with persistent profiles, stealth fingerprints, and assigned proxies.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Idle Bots: <strong className="text-white tabular-nums">{metrics?.bot_pool?.idle ?? '—'}</strong></span>
            </div>
            <div className="text-neutral-400">
              Verified: <strong className="text-emerald-400 tabular-nums">{metrics?.bot_pool?.verified ?? 0}</strong>
            </div>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          </div>
        )}

        <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-300 font-mono uppercase tracking-wider">
              Target Product URL
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
              placeholder="https://staging.productstunt.com/products/..."
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_URLS.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTargetUrl(url)}
                  className="text-[11px] font-mono px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors truncate max-w-xs"
                >
                  {url.replace('https://staging.productstunt.com/products/', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-300 font-mono uppercase tracking-wider">
                  Bots to Deploy: <span className="text-indigo-400 font-bold">{votesCount}</span>
                </label>
              </div>
              <input
                type="range"
                min={1}
                max={Math.min(50, maxBots)}
                value={Math.min(votesCount, Math.min(50, maxBots))}
                onChange={e => setVotesCount(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Execution Timing</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
                {[
                  { id: 'fast', label: 'Fast Test (3-15s)' },
                  { id: 'balanced', label: 'Medium (15-90s)' },
                  { id: 'organic', label: 'Organic (2h)' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setExecutionMode(opt.id as any)}
                    className={`py-1.5 px-2 rounded-md font-medium transition-colors ${
                      executionMode === opt.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-300 font-mono uppercase tracking-wider">
              Comments Pool ({comments.length})
            </label>
            <div className="space-y-2">
              {comments.map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-2.5 rounded bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">
                  <span className="truncate">{c}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveComment(i)}
                    className="p-1 text-neutral-500 hover:text-rose-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddComment())}
                placeholder="Add custom comment..."
                className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddComment}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold rounded-lg text-neutral-200 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-800">
            <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
              <input
                type="checkbox"
                checked={allowAnyHost}
                onChange={e => setAllowAnyHost(e.target.checked)}
                className="rounded accent-indigo-500"
              />
              <span>Allow any URL (for local / staging / custom testing)</span>
            </label>

            <button
              onClick={handleLaunch}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-lg disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{loading ? 'Queueing Tasks...' : `Dispatch Campaign (${votesCount} Bots)`}</span>
            </button>
          </div>
        </div>

        {/* Live Campaigns */}
        {campaigns.length > 0 && (
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
            <h2 className="text-sm font-bold text-white">Recent Campaigns</h2>
            <div className="space-y-2">
              {campaigns.slice(0, 6).map((c: any) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-white truncate">
                      #{c.id} · {c.target_url}
                    </div>
                    <div className="text-neutral-400 mt-0.5">
                      Votes: <strong className="text-white">{c.votes_completed}/{c.votes_requested}</strong> · Comments: <strong className="text-white">{c.comments_completed}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold ${
                        c.status === 'COMPLETED'
                          ? 'bg-emerald-950 text-emerald-400'
                          : c.status === 'IN_PROGRESS'
                          ? 'bg-indigo-950 text-indigo-300'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {c.status}
                    </span>
                    {c.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleStopCampaign(c.id)}
                        className="px-2 py-1 rounded bg-rose-950 text-rose-300 hover:bg-rose-900 flex items-center gap-1"
                      >
                        <Square className="w-3 h-3" />
                        <span>Stop</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
