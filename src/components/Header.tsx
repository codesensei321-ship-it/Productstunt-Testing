import React, { useState } from 'react';
import { useBotLab } from '../context/BotLabContext';
import { Square, X, LogOut, User } from 'lucide-react';

export type ActiveTab = 'launcher' | 'accounts' | 'history';

interface HeaderProps {
  currentTab: ActiveTab;
  setCurrentTab: (tab: ActiveTab) => void;
  userEmail: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab, userEmail, onLogout }) => {
  const { emergencyKillSwitch, activeCampaign } = useBotLab();
  const [showStopModal, setShowStopModal] = useState(false);

  const handleStop = () => {
    emergencyKillSwitch();
    setShowStopModal(false);
  };

  return (
    <header className="border-b border-neutral-800 bg-[#0b0f17] px-4 sm:px-6 py-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
              P
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">Productstunt</span>
          </div>

          <button
            onClick={onLogout}
            className="sm:hidden flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-900 rounded-lg border border-neutral-800"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Clean Nav */}
        <nav className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-sm overflow-x-auto max-w-full">
          <button
            onClick={() => setCurrentTab('launcher')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              currentTab === 'launcher'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Campaign
          </button>
          <button
            onClick={() => setCurrentTab('accounts')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'accounts'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Accounts</span>
            <span className="text-xs text-neutral-500 font-mono">50</span>
          </button>
          <button
            onClick={() => setCurrentTab('history')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'history'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Activity</span>
            {activeCampaign && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </nav>

        {/* Right side controls */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono text-neutral-300 truncate max-w-[180px]">{userEmail}</span>
          </div>

          <button
            onClick={() => setShowStopModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-rose-400 border border-neutral-800 hover:border-rose-900 rounded-lg transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop All</span>
          </button>

          <button
            onClick={onLogout}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stop Modal */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Stop all running tasks?</h3>
              <button onClick={() => setShowStopModal(false)} className="text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              This will immediately cancel any ongoing campaigns and reset active accounts to idle.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowStopModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleStop}
                className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg"
              >
                Yes, Stop All
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
