import React, { useState, useMemo } from 'react';
import { useBotLab, ProvisioningService } from '../context/BotLabContext';
import { Bot } from '../types';
import { Search, CheckCircle2, Circle, Play, Shuffle, X, Edit2, Globe, Laptop, Monitor } from 'lucide-react';

export const AccountsManager: React.FC = () => {
  const { bots, openAccountCreation, updateAccount, getNextRecommendedBot } = useBotLab();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PRIMED' | 'UNCREATED'>('ALL');
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [shuffleTick, setShuffleTick] = useState(0);

  // Edit modal state
  const [editEmail, setEditEmail] = useState('');
  const [editVerified, setEditVerified] = useState(false);

  // Next random account to create
  const nextAccount = useMemo(() => {
    return getNextRecommendedBot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getNextRecommendedBot, shuffleTick, bots]);

  const primedCount = bots.filter(b => b.account.isVerified).length;
  const readyToCreateCount = bots.length - primedCount;

  const filteredBots = useMemo(() => {
    return bots.filter(bot => {
      const label = `Account #${String(bot.id).padStart(2, '0')}`;
      const email = bot.account.appEmail || bot.account.mailboxEmail || '';
      const matchesSearch =
        label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'PRIMED' && bot.account.isVerified) ||
        (filter === 'UNCREATED' && !bot.account.isVerified);

      return matchesSearch && matchesFilter;
    });
  }, [bots, searchTerm, filter]);

  const handleOpenEdit = (bot: Bot) => {
    setEditingBot(bot);
    setEditEmail(bot.account.appEmail || bot.account.mailboxEmail || '');
    setEditVerified(bot.account.isVerified);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBot) return;

    updateAccount(editingBot.id, {
      mailboxEmail: editEmail,
      appEmail: editEmail,
      isVerified: editVerified,
    });
    setEditingBot(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-2 sm:px-0">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Accounts & Browsers</h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            Manage your 50 test accounts. Open any browser manually to inspect or register.
          </p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 text-sm">
          <div>
            <span className="text-neutral-500">Total:</span>{' '}
            <strong className="text-white font-medium">{bots.length}</strong>
          </div>
          <div>
            <span className="text-neutral-500">Ready:</span>{' '}
            <strong className="text-emerald-400 font-medium">{primedCount}</strong>
          </div>
          <div>
            <span className="text-neutral-500">To create:</span>{' '}
            <strong className="text-neutral-300 font-medium">{readyToCreateCount}</strong>
          </div>
        </div>
      </div>

      {/* Randomized Quick Creator Card */}
      {nextAccount && (
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-semibold text-xs shrink-0">
              #{String(nextAccount.id).padStart(2, '0')}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-neutral-400">Next Account to Setup (Randomized)</div>
              <div className="text-sm font-semibold text-white mt-0.5 truncate">
                Account #{String(nextAccount.id).padStart(2, '0')} · {nextAccount.deviceName}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShuffleTick(t => t + 1)}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs transition-colors"
              title="Pick another random account"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={() => openAccountCreation(nextAccount.id, 'gmail')}
              className="px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Gmail Signup</span>
            </button>
            <button
              onClick={() => openAccountCreation(nextAccount.id, 'outlook')}
              className="px-3 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
            >
              Outlook Signup
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-xs w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              filter === 'ALL' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            All (50)
          </button>
          <button
            onClick={() => setFilter('PRIMED')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              filter === 'PRIMED' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Ready ({primedCount})
          </button>
          <button
            onClick={() => setFilter('UNCREATED')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              filter === 'UNCREATED' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Needs Setup ({readyToCreateCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search accounts..."
            className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
          />
        </div>
      </div>

      {/* 50 Accounts Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredBots.map(bot => {
          const isPrimed = bot.account.isVerified;
          const email = bot.account.appEmail || bot.account.mailboxEmail || '';

          return (
            <div
              key={bot.id}
              className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between gap-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Account #{String(bot.id).padStart(2, '0')}
                  </span>
                  {isPrimed ? (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <Circle className="w-2.5 h-2.5" />
                      <span>Not created</span>
                    </span>
                  )}
                </div>

                <div className="text-xs text-neutral-400 font-mono truncate">
                  {email ? email : `Unlinked Account`}
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {bot.deviceName}
                </div>
              </div>

              {/* Action Buttons for Browser & Registration */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-800/80">
                <button
                  onClick={() => openAccountCreation(bot.id, 'gmail')}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors"
                >
                  Gmail
                </button>
                <button
                  onClick={() => openAccountCreation(bot.id, 'outlook')}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                >
                  Outlook
                </button>
                <button
                  onClick={() => openAccountCreation(bot.id, 'productstunt')}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center gap-1"
                  title="Open full interactive browser with all normal functionalities"
                >
                  <Globe className="w-3 h-3" />
                  <span>Browser</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(bot)}
                  className="ml-auto p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                  title="Edit details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">
                Account #{String(editingBot.id).padStart(2, '0')}
              </h3>
              <button onClick={() => setEditingBot(null)} className="text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400">Account Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full mt-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-neutral-700 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isVerified"
                  checked={editVerified}
                  onChange={e => setEditVerified(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-800 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                />
                <label htmlFor="isVerified" className="text-xs text-neutral-300 cursor-pointer">
                  Account is created and ready
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBot(null)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
