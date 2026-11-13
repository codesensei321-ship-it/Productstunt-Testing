import React, { useState } from 'react';
import { useBotLab } from '../context/BotLabContext';
import { Play, CheckCircle2, AlertCircle, Plus, X, Eye, EyeOff, Radio } from 'lucide-react';

const PRESET_URLS = [
  { name: 'Nexus Flow AI', url: 'https://staging.productstunt.com/products/nexus-flow-ai' },
  { name: 'Hyper Scale DB', url: 'https://staging.productstunt.com/products/hyper-scale-vector-db' },
  { name: 'Pulse DevOps', url: 'https://staging.productstunt.com/products/pulse-devops-copilot' },
];

const DEFAULT_COMMENTS = [
  'Congratulations on the launch! Really nice UI.',
  'Tested the demo, sub-second responses are very impressive.',
  'Does this offer webhook triggers for Slack and GitHub?',
];

export const CampaignLauncher: React.FC<{ onNavigateToHistory: () => void }> = ({ onNavigateToHistory }) => {
  const { bots, dispatchCampaign, activeCampaign } = useBotLab();

  const [targetUrl, setTargetUrl] = useState('https://staging.productstunt.com/products/nexus-flow-ai');
  const [votesCount, setVotesCount] = useState(15);
  const [comments, setComments] = useState<string[]>(DEFAULT_COMMENTS);
  const [commentInput, setCommentInput] = useState('');
  const [showLiveExecution, setShowLiveExecution] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const idleBots = bots.filter(b => b.status === 'IDLE');

  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    setComments(prev => [...prev, commentInput.trim()]);
    setCommentInput('');
  };

  const handleRemoveComment = (index: number) => {
    setComments(prev => prev.filter((_, i) => i !== index));
  };

  const handleLaunch = () => {
    setStatusMessage(null);
    const result = dispatchCampaign(targetUrl, votesCount, comments, true);
    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message });
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-2 sm:px-0">
      {/* Title */}
      <div className="border-b border-neutral-800 pb-5">
        <h1 className="text-xl font-semibold text-white tracking-tight">Launch Campaign</h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Send automated user engagement and upvotes to your target product page.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          {statusMessage.type === 'success' && (
            <button
              onClick={onNavigateToHistory}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              View Activity →
            </button>
          )}
        </div>
      )}

      {/* Active Campaign Bar */}
      {activeCampaign && (
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Campaign in progress</span>
            </span>
            <span className="text-neutral-400">
              {activeCampaign.votesCompleted} of {activeCampaign.votesRequested} completed
            </span>
          </div>
          <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (activeCampaign.votesCompleted / activeCampaign.votesRequested) * 100)}%`,
              }}
            />
          </div>

          {showLiveExecution && (
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-2 text-xs font-mono">
              <div className="text-neutral-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span>Live Browser Execution Stream</span>
                </span>
                <span className="text-emerald-400">Active Task Queue</span>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto text-[11px] text-neutral-300">
                {activeCampaign.scheduledTasks.slice(0, 3).map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-0.5 border-b border-neutral-900">
                    <span className="text-blue-400 font-medium">Account #{t.botId}</span>
                    <span className="text-neutral-400">Status: {t.status}</span>
                    <span className="text-neutral-500">{t.countdownSec}s delay</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5">
        {/* Target URL */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-300">Target Website URL</label>
          <input
            type="url"
            value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)}
            placeholder="https://staging.productstunt.com/products/slug"
            className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-neutral-700"
          />

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-neutral-500">Presets:</span>
            {PRESET_URLS.map(p => (
              <button
                key={p.name}
                type="button"
                onClick={() => setTargetUrl(p.url)}
                className="text-xs px-2.5 py-1 rounded-md bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Number of Accounts */}
        <div className="space-y-3 border-t border-neutral-800 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-300">Number of Accounts</label>
            <span className="text-sm font-semibold text-white">
              {votesCount} <span className="text-xs font-normal text-neutral-500">accounts</span>
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={Math.max(1, idleBots.length)}
            value={votesCount}
            onChange={e => setVotesCount(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <div className="flex flex-wrap items-center gap-2">
            {[5, 10, 20, 35, 50].map(cnt => (
              <button
                key={cnt}
                type="button"
                onClick={() => setVotesCount(Math.min(cnt, idleBots.length))}
                className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                  votesCount === cnt
                    ? 'bg-neutral-800 border-neutral-700 text-white font-medium'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {cnt}
              </button>
            ))}
          </div>
        </div>

        {/* Live Execution View Toggle */}
        <div className="border-t border-neutral-800 pt-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-neutral-300">Live Browser Execution View</div>
            <div className="text-[11px] text-neutral-500">Watch automated browsers execute tasks in real-time</div>
          </div>
          <button
            type="button"
            onClick={() => setShowLiveExecution(!showLiveExecution)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              showLiveExecution
                ? 'bg-blue-600/20 border-blue-500/30 text-blue-300'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400'
            }`}
          >
            {showLiveExecution ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showLiveExecution ? 'Showing Live' : 'Hidden'}</span>
          </button>
        </div>

        {/* Comments Pool */}
        <div className="space-y-3 border-t border-neutral-800 pt-4">
          <label className="text-xs font-medium text-neutral-300">
            Comments ({comments.length})
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              placeholder="Add a comment template..."
              className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-neutral-700"
            />
            <button
              type="button"
              onClick={handleAddComment}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium"
            >
              Add
            </button>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {comments.map((comment, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300"
              >
                <span className="truncate">{comment}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveComment(idx)}
                  className="text-neutral-500 hover:text-rose-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Launch CTA */}
        <div className="border-t border-neutral-800 pt-4">
          <button
            type="button"
            onClick={handleLaunch}
            disabled={idleBots.length < votesCount}
            className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              idleBots.length >= votesCount
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Campaign ({votesCount} Accounts)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
