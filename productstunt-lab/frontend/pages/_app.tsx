import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import '../styles/globals.css';
import { Shield, Power, AlertTriangle, X } from 'lucide-react';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [showKillModal, setShowKillModal] = useState(false);
  const [killNotice, setKillNotice] = useState<string | null>(null);

  const handleKillSwitch = async () => {
    try {
      const res = await fetch('/api/system/kill_switch/', { method: 'POST' });
      const data = await res.json();
      setShowKillModal(false);
      setKillNotice(`Stopped queued tasks. ${data.reset_bots || 0} bots reset to IDLE.`);
      setTimeout(() => setKillNotice(null), 4000);
    } catch {
      setKillNotice('Emergency Kill Switch triggered.');
      setShowKillModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <Head>
        <title>Productstunt Testing Lab</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-neutral-900 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Shield className="w-4 h-4" />
          </div>
          <Link href="/" className="text-base font-bold text-white hover:text-indigo-200">
            Productstunt Lab
          </Link>
          <span className="text-xs text-neutral-500 font-mono hidden lg:inline">
            Playwright Stealth · Docker Cluster
          </span>
        </div>

        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            className={`py-1 border-b-2 ${
              router.pathname === '/' ? 'text-white border-indigo-500 font-semibold' : 'text-neutral-400 border-transparent hover:text-white'
            }`}
          >
            Launch Campaign
          </Link>
          <Link
            href="/accounts"
            className={`py-1 border-b-2 ${
              router.pathname === '/accounts' ? 'text-white border-indigo-500 font-semibold' : 'text-neutral-400 border-transparent hover:text-white'
            }`}
          >
            Accounts &amp; Proxies
          </Link>
          <Link
            href="/history"
            className={`py-1 border-b-2 ${
              router.pathname === '/history' ? 'text-white border-indigo-500 font-semibold' : 'text-neutral-400 border-transparent hover:text-white'
            }`}
          >
            Live Logs
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowKillModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-600/40 rounded-lg transition-colors"
          >
            <Power className="w-3.5 h-3.5 text-rose-400" />
            <span>Kill Switch</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 max-w-7xl w-full mx-auto">
        <Component {...pageProps} />
      </main>

      {showKillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowKillModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Engage Emergency Kill Switch?</h3>
                <p className="text-xs text-rose-300 font-mono">Purge Celery Tasks &amp; Stop Browsers</p>
              </div>
            </div>
            <p className="text-xs text-neutral-300">
              Immediately revokes running Playwright workers, closes active noVNC browsers, and resets all bots to IDLE.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowKillModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={handleKillSwitch}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-500 flex items-center gap-2"
              >
                <Power className="w-4 h-4" />
                <span>Confirm Abort</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {killNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-neutral-900 border border-amber-500/40 text-amber-200 text-xs font-mono rounded-xl shadow-2xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{killNotice}</span>
        </div>
      )}

      <footer className="border-t border-neutral-900 py-3.5 px-6 text-xs text-neutral-500 flex flex-wrap justify-between gap-2 max-w-7xl mx-auto w-full">
        <div>Productstunt Testing Lab · Stealth Playwright + Persistent Profiles</div>
        <div>Free &amp; Static Residential Proxy Ready</div>
      </footer>
    </div>
  );
}
