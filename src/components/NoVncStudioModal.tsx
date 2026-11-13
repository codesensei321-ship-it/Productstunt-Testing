import React, { useState, useEffect } from 'react';
import { useBotLab } from '../context/BotLabContext';
import { 
  Globe, ArrowLeft, ArrowRight, RotateCw, Shield, 
  Terminal, CheckCircle2, Lock, Smartphone, 
  Cookie, HardDrive, X, Wifi
} from 'lucide-react';

export const NoVncStudioModal: React.FC = () => {
  const { bots, activeVncBotId, activeService, closeVncSession, updateAccount } = useBotLab();

  if (activeVncBotId === null) return null;

  const bot = bots.find(b => b.id === activeVncBotId);
  if (!bot) return null;

  const [currentUrl, setCurrentUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'GMAIL' | 'OUTLOOK' | 'PRODUCTSTUNT'>('GMAIL');

  // Gmail flow state
  const [gFirstName, setGFirstName] = useState('Alex');
  const [gLastName, setGLastName] = useState(`Turner${bot.id}`);
  const [gEmail, setGEmail] = useState(bot.account.mailboxEmail.split('@')[0] || `alex.turner${bot.id}`);
  const [gPassword, setGPassword] = useState('StagingPass!2026');
  const [gStep, setGStep] = useState<'FORM' | 'SMS' | 'SUCCESS'>('FORM');
  const [smsCode, setSmsCode] = useState('482910');

  // Outlook flow state
  const [oEmail, setOEmail] = useState(`alex.turner${bot.id}`);
  const [oPassword, setOPassword] = useState('OutlookSecure!2026');
  const [oStep, setOStep] = useState<'FORM' | 'SUCCESS'>('FORM');

  // Staging Productstunt flow state
  const [pStep, setPStep] = useState<'SIGNUP' | 'LOGGED_IN'>(bot.account.isVerified ? 'LOGGED_IN' : 'SIGNUP');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeService === 'gmail') {
      setCurrentUrl('https://accounts.google.com/signup');
      setActiveTab('GMAIL');
    } else if (activeService === 'outlook') {
      setCurrentUrl('https://signup.live.com');
      setActiveTab('OUTLOOK');
    } else {
      setCurrentUrl('https://staging.productstunt.com/signup');
      setActiveTab('PRODUCTSTUNT');
    }
  }, [activeService]);

  const handleFinishGmail = () => {
    const fullEmail = `${gEmail}@gmail.com`;
    setGStep('SUCCESS');
    setToastMessage(`Account created successfully!`);

    updateAccount(bot.id, {
      mailboxProvider: 'Gmail',
      mailboxEmail: fullEmail,
      mailboxPassword: gPassword,
      appEmail: fullEmail,
      isVerified: true,
    });

    setTimeout(() => {
      setToastMessage(`Login saved successfully.`);
    }, 1200);
  };

  const handleFinishOutlook = () => {
    const fullEmail = `${oEmail}@outlook.com`;
    setOStep('SUCCESS');
    setToastMessage(`Outlook account created successfully!`);

    updateAccount(bot.id, {
      mailboxProvider: 'Outlook',
      mailboxEmail: fullEmail,
      mailboxPassword: oPassword,
      appEmail: fullEmail,
      isVerified: true,
    });

    setTimeout(() => {
      setToastMessage(`Login saved successfully.`);
    }, 1200);
  };

  const handleOAuthOnStaging = (providerName: string) => {
    setToastMessage(`Logging in with ${providerName}...`);
    setTimeout(() => {
      setPStep('LOGGED_IN');
      const email = bot.account.appEmail || bot.account.mailboxEmail || `alex.user${bot.id}@gmail.com`;
      updateAccount(bot.id, {
        appEmail: email,
        isVerified: true,
      });
      setToastMessage(`Logged in successfully!`);
    }, 1000);
  };

  const handleSaveAndClose = () => {
    updateAccount(bot.id, {
      isVerified: true,
    });
    closeVncSession(bot.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5">
      <div className="w-full max-w-5xl h-[90vh] bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
        {/* Top Session Control Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950 border-b border-neutral-800 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">Browser Session</span>
            </div>
            <span className="text-neutral-700">·</span>
            <span className="text-neutral-400">Account #{String(bot.id).padStart(2, '0')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAndClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save & Close</span>
            </button>
            <button
              onClick={() => closeVncSession(bot.id)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Notification Bar */}
        {toastMessage && (
          <div className="px-4 py-2 bg-indigo-950/80 border-b border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between font-mono animate-fadeIn">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <span className="text-emerald-400 font-semibold">Saved to Disk</span>
          </div>
        )}

        {/* Browser Chrome Header (Address Bar & Service Toggles) */}
        <div className="bg-neutral-900 border-b border-neutral-800 p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-neutral-400">
              <button className="p-1 hover:text-white rounded"><ArrowLeft className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:text-white rounded"><ArrowRight className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:text-white rounded"><RotateCw className="w-3.5 h-3.5" /></button>
            </div>

            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-xs font-mono text-neutral-200">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate flex-1">{currentUrl}</span>
            </div>

            {/* Direct Service Jump Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setActiveTab('GMAIL');
                  setCurrentUrl('https://accounts.google.com/signup');
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'GMAIL' ? 'bg-indigo-600 text-white font-semibold' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                Gmail Signup
              </button>
              <button
                onClick={() => {
                  setActiveTab('OUTLOOK');
                  setCurrentUrl('https://signup.live.com');
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'OUTLOOK' ? 'bg-indigo-600 text-white font-semibold' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                Outlook Signup
              </button>
              <button
                onClick={() => {
                  setActiveTab('PRODUCTSTUNT');
                  setCurrentUrl('https://staging.productstunt.com/signup');
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'PRODUCTSTUNT' ? 'bg-indigo-600 text-white font-semibold' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                Productstunt Staging
              </button>
            </div>
          </div>
        </div>

        {/* Browser Body Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Virtual Screen */}
          <div className="flex-1 bg-neutral-950 p-6 overflow-y-auto flex items-center justify-center">
            {/* GMAIL SIGNUP VIEW */}
            {activeTab === 'GMAIL' && (
              <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-7 space-y-5 shadow-xl text-left">
                <div className="flex items-center gap-3">
                  <svg className="w-7 h-7" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <div>
                    <h3 className="text-base font-bold text-white">Create a Google Account</h3>
                    <p className="text-xs text-neutral-400">Routed through {bot.proxy.ip} ({bot.proxy.city})</p>
                  </div>
                </div>

                {gStep === 'FORM' && (
                  <div className="space-y-4 text-xs font-mono">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-neutral-400">First Name</label>
                        <input
                          type="text"
                          value={gFirstName}
                          onChange={e => setGFirstName(e.target.value)}
                          className="w-full mt-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400">Last Name</label>
                        <input
                          type="text"
                          value={gLastName}
                          onChange={e => setGLastName(e.target.value)}
                          className="w-full mt-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-neutral-400">Gmail Address</label>
                      <div className="flex items-center mt-1">
                        <input
                          type="text"
                          value={gEmail}
                          onChange={e => setGEmail(e.target.value)}
                          className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-l-lg text-white"
                        />
                        <span className="px-3 py-2 bg-neutral-800 border border-l-0 border-neutral-700 rounded-r-lg text-neutral-400">
                          @gmail.com
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-neutral-400">Password</label>
                      <input
                        type="password"
                        value={gPassword}
                        onChange={e => setGPassword(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white"
                      />
                    </div>

                    <button
                      onClick={() => setGStep('SMS')}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold font-sans transition-colors"
                    >
                      Next: Verify Phone / CAPTCHA
                    </button>
                  </div>
                )}

                {gStep === 'SMS' && (
                  <div className="space-y-4 text-xs font-mono">
                    <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-indigo-400 shrink-0" />
                      <div className="text-neutral-300 font-sans">
                        Enter 6-digit verification code sent to recovery number.
                      </div>
                    </div>

                    <div>
                      <label className="text-neutral-400">G- Code</label>
                      <input
                        type="text"
                        value={smsCode}
                        onChange={e => setSmsCode(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-center tracking-widest text-base"
                      />
                    </div>

                    <button
                      onClick={handleFinishGmail}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold font-sans transition-colors"
                    >
                      Confirm & Commit to {bot.name}
                    </button>
                  </div>
                )}

                {gStep === 'SUCCESS' && (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Gmail Account Created & Saved!</span>
                    </div>
                    <div className="text-xs text-neutral-300 font-mono">
                      Email: {gEmail}@gmail.com
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Cookies and tokens are permanently stored in <code className="text-emerald-300 font-mono">{bot.profilePath}</code>.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* OUTLOOK SIGNUP VIEW */}
            {activeTab === 'OUTLOOK' && (
              <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-7 space-y-5 shadow-xl text-left">
                <div className="flex items-center gap-3">
                  <svg className="w-7 h-7" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  <div>
                    <h3 className="text-base font-bold text-white">Create an Outlook Account</h3>
                    <p className="text-xs text-neutral-400">Directly routed through {bot.proxy.ip}</p>
                  </div>
                </div>

                {oStep === 'FORM' && (
                  <div className="space-y-4 text-xs font-mono">
                    <div>
                      <label className="text-neutral-400">New Email</label>
                      <div className="flex items-center mt-1">
                        <input
                          type="text"
                          value={oEmail}
                          onChange={e => setOEmail(e.target.value)}
                          className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-l-lg text-white"
                        />
                        <span className="px-3 py-2 bg-neutral-800 border border-l-0 border-neutral-700 rounded-r-lg text-neutral-400">
                          @outlook.com
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-neutral-400">Create Password</label>
                      <input
                        type="password"
                        value={oPassword}
                        onChange={e => setOPassword(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white"
                      />
                    </div>

                    <button
                      onClick={handleFinishOutlook}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold font-sans transition-colors"
                    >
                      Create & Save to {bot.name}
                    </button>
                  </div>
                )}

                {oStep === 'SUCCESS' && (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Outlook Account Created & Saved!</span>
                    </div>
                    <div className="text-xs text-neutral-300 font-mono">
                      Email: {oEmail}@outlook.com
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PRODUCTSTUNT STAGING VIEW */}
            {activeTab === 'PRODUCTSTUNT' && (
              <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-7 space-y-5 shadow-xl text-center">
                <div className="space-y-1">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Productstunt Staging Signup</h3>
                  <p className="text-xs text-neutral-400">Use your saved identity on proxy {bot.proxy.ip}</p>
                </div>

                {pStep === 'LOGGED_IN' ? (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2 text-left">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Authenticated & Primed on Staging!</span>
                    </div>
                    <div className="text-xs font-mono text-neutral-200">
                      User: {bot.account.appEmail || bot.account.mailboxEmail}
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Ready for automated upvoting and commenting campaigns.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => handleOAuthOnStaging('Google')}
                      className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-xs transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Continue with Google</span>
                    </button>

                    <button
                      onClick={() => handleOAuthOnStaging('Microsoft')}
                      className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-neutral-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 23 23">
                        <path fill="#f35325" d="M1 1h10v10H1z" />
                        <path fill="#81bc06" d="M12 1h10v10H12z" />
                        <path fill="#05a6f0" d="M1 12h10v10H1z" />
                        <path fill="#ffba08" d="M12 12h10v10H12z" />
                      </svg>
                      <span>Continue with Microsoft</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Side Info Panel */}
          <div className="w-full md:w-72 bg-neutral-950 p-4 border-t md:border-t-0 md:border-l border-neutral-800 text-xs font-mono space-y-4">
            <div className="space-y-1">
              <div className="text-neutral-400 font-sans font-bold">Bot Session Lock</div>
              <div className="text-[11px] text-neutral-500 font-sans">
                Cookies created in this window will never be shared with other bots.
              </div>
            </div>

            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 space-y-2">
              <div className="flex justify-between text-neutral-400">
                <span>Proxy IP:</span>
                <span className="text-white font-bold">{bot.proxy.ip}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Location:</span>
                <span className="text-neutral-200">{bot.proxy.geo} ({bot.proxy.city})</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>ISP:</span>
                <span className="text-neutral-300 truncate max-w-[120px]">{bot.proxy.isp}</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-neutral-300 font-sans font-semibold">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                <span>Persistent Directory</span>
              </div>
              <div className="text-[11px] text-neutral-400 truncate" title={bot.profilePath}>
                {bot.profilePath}
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800">
                <span>Cookies Stored:</span>
                <span className="text-emerald-400 tabular-nums">{bot.cookiesCount || 18} keys</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
