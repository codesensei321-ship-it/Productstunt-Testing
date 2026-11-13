import React, { useState } from 'react';
import { BotLabProvider } from './context/BotLabContext';
import { Header, ActiveTab } from './components/Header';
import { CampaignLauncher } from './components/CampaignLauncher';
import { AccountsManager } from './components/AccountsManager';
import { ActivityLogView } from './components/ActivityLogView';
import { NoVncStudioModal } from './components/NoVncStudioModal';
import { LoginView } from './components/LoginView';

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('productstunt_auth');
  });
  const [currentTab, setCurrentTab] = useState<ActiveTab>('launcher');

  if (!userEmail) {
    return (
      <LoginView
        onLoginSuccess={email => {
          setUserEmail(email);
        }}
      />
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('productstunt_auth');
    setUserEmail(null);
  };

  return (
    <BotLabProvider>
      <div className="min-h-screen bg-[#0b0f17] text-neutral-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-200">
        {/* Navigation Top Bar */}
        <Header
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          userEmail={userEmail}
          onLogout={handleLogout}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 px-4 sm:px-6 py-8 max-w-5xl w-full mx-auto">
          {currentTab === 'launcher' && (
            <CampaignLauncher onNavigateToHistory={() => setCurrentTab('history')} />
          )}

          {currentTab === 'accounts' && <AccountsManager />}

          {currentTab === 'history' && <ActivityLogView />}
        </main>

        {/* 1-Click Interactive Browser Account Creation Modal */}
        <NoVncStudioModal />

        {/* Clean Footer */}
        <footer className="border-t border-neutral-800/80 py-4 px-6 text-xs text-neutral-500 text-center max-w-5xl mx-auto w-full">
          Productstunt · 50 Account Testing Suite
        </footer>
      </div>
    </BotLabProvider>
  );
}
