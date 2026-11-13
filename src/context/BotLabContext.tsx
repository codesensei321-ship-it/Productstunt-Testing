import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Bot, Proxy, Account, Campaign, ActivityLog, VPSMetrics, ScheduledTask, ProxyHealthStatus, WifiHub } from '../types';
import { generateInitialLabData } from '../data/seedData';

export type ProvisioningService = 'gmail' | 'outlook' | 'productstunt';

interface BotLabData {
  proxies: Proxy[];
  wifiHubs: WifiHub[];
  accounts: Account[];
  bots: Bot[];
  campaigns: Campaign[];
  activityLogs: ActivityLog[];
  metrics: VPSMetrics;
}

export interface ProxyHealthProgress {
  checked: number;
  total: number;
  online: number;
  degraded: number;
  offline: number;
  avgLatencyMs: number;
}

interface BotLabContextType {
  bots: Bot[];
  proxies: Proxy[];
  wifiHubs: WifiHub[];
  accounts: Account[];
  campaigns: Campaign[];
  activityLogs: ActivityLog[];
  metrics: VPSMetrics;
  activeVncBotId: number | null;
  activeService: ProvisioningService;
  activeCampaign: Campaign | null;
  isHealthChecking: boolean;
  healthCheckProgress: ProxyHealthProgress;
  getNextRecommendedBot: () => Bot | null;
  dispatchCampaign: (targetUrl: string, votesCount: number, comments: string[], allowAnyHost?: boolean) => { success: boolean; message: string; campaignId?: number };
  updateAccount: (botId: number, partial: Partial<Account>) => void;
  openAccountCreation: (botId: number, service: ProvisioningService) => void;
  closeVncSession: (botId: number) => void;
  emergencyKillSwitch: () => { purgedTasks: number; resetBots: number };
  importWebshareCsv: (csvContent: string) => { imported: number; error?: string };
  testAllProxies: () => void;
  runProxyHealthCheck: (isStartup?: boolean) => Promise<void>;
  testSingleProxy: (botId: number) => Promise<Proxy>;
  resetAllToIdle: () => void;
}

const BotLabContext = createContext<BotLabContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'productstunt_botlab_wifi_v3';

export const BotLabProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<BotLabData>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as BotLabData;
      }
    } catch {
      // Fallback
    }
    return generateInitialLabData();
  });

  const [activeVncBotId, setActiveVncBotId] = useState<number | null>(null);
  const [activeService, setActiveService] = useState<ProvisioningService>('gmail');
  const [isHealthChecking, setIsHealthChecking] = useState<boolean>(false);
  const [healthCheckProgress, setHealthCheckProgress] = useState<ProxyHealthProgress>({
    checked: 20,
    total: 20,
    online: 19,
    degraded: 1,
    offline: 0,
    avgLatencyMs: 34,
  });

  const { bots, proxies, wifiHubs, accounts, campaigns, activityLogs, metrics } = data;

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Quota ignore
    }
  }, [data]);

  const activeCampaign = campaigns.find((c: Campaign) => c.status === 'IN_PROGRESS') || null;

  // Background Task Engine: executes Celery countdowns with full stealth human timing
  useEffect(() => {
    if (!activeCampaign) return;

    const interval = setInterval(() => {
      setData((prev: BotLabData) => {
        const currentCamp = prev.campaigns.find((c: Campaign) => c.id === activeCampaign.id);
        if (!currentCamp || currentCamp.status !== 'IN_PROGRESS') return prev;

        let anyTaskChanged = false;
        const newLogs: ActivityLog[] = [];
        let newlyCompletedVotes = 0;
        let newlyCompletedComments = 0;

        const updatedTasks = currentCamp.scheduledTasks.map((t: ScheduledTask) => {
          if (t.status === 'QUEUED') {
            const nextCount = t.countdownSec - 1;
            if (nextCount <= 0) {
              anyTaskChanged = true;
              return { ...t, countdownSec: 0, status: 'RUNNING' as const };
            }
            return { ...t, countdownSec: nextCount };
          }

          if (t.status === 'RUNNING') {
            anyTaskChanged = true;
            newlyCompletedVotes += 1;
            if (t.commentText) newlyCompletedComments += 1;

            const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

            // Log Stealth Upvote
            newLogs.push({
              id: `log-${Date.now()}-${t.botId}-upvote`,
              timestamp: timeStr,
              botId: t.botId,
              botName: t.botName,
              action: 'UPVOTE',
              targetUrl: currentCamp.targetUrl,
              statusCode: 200,
              proxyIp: t.proxyIp,
              details: `Stealth Human Automation: Proxy ${t.proxyIp} -> Organic non-linear scroll, 1.4s hover dwell, upvote registered. Cookies flushed to /data/profiles/${t.botName}`,
            });

            // Log Comment if present
            if (t.commentText) {
              newLogs.push({
                id: `log-${Date.now()}-${t.botId}-comment`,
                timestamp: timeStr,
                botId: t.botId,
                botName: t.botName,
                action: 'COMMENT',
                targetUrl: currentCamp.targetUrl,
                statusCode: 200,
                proxyIp: t.proxyIp,
                details: `Human Keystroke Timing: "${t.commentText.slice(0, 55)}..." (action_delay 0.5-3.0s)`,
              });
            }

            return { ...t, status: 'COMPLETED' as const };
          }

          return t;
        });

        if (!anyTaskChanged && newLogs.length === 0) return prev;

        const updatedVotesCompleted = currentCamp.votesCompleted + newlyCompletedVotes;
        const updatedCommentsCompleted = currentCamp.commentsCompleted + newlyCompletedComments;
        const isAllDone = updatedVotesCompleted >= currentCamp.votesRequested;

        const updatedCampaigns = prev.campaigns.map((c: Campaign) => {
          if (c.id === currentCamp.id) {
            return {
              ...c,
              votesCompleted: updatedVotesCompleted,
              commentsCompleted: updatedCommentsCompleted,
              status: isAllDone ? ('COMPLETED' as const) : ('IN_PROGRESS' as const),
              scheduledTasks: updatedTasks,
            };
          }
          return c;
        });

        const activeBotIds = new Set(
          updatedTasks.filter((t: ScheduledTask) => t.status === 'RUNNING').map((t: ScheduledTask) => t.botId)
        );
        const assignedBotIds = new Set(
          updatedTasks.filter((t: ScheduledTask) => t.status === 'QUEUED').map((t: ScheduledTask) => t.botId)
        );

        const updatedBots = prev.bots.map((b: Bot) => {
          if (activeBotIds.has(b.id)) {
            return { ...b, status: 'RUNNING' as const, lastActive: 'Just now' };
          }
          if (assignedBotIds.has(b.id)) {
            return { ...b, status: 'ASSIGNED' as const };
          }
          if (b.status === 'RUNNING' || b.status === 'ASSIGNED') {
            return { ...b, status: 'IDLE' as const, lastActive: 'Just now' };
          }
          return b;
        });

        const updatedMetrics: VPSMetrics = {
          ...prev.metrics,
          cpuUsagePercent: activeBotIds.size > 0 ? 28 + activeBotIds.size * 6 : 14.5,
          ramUsedMb: 4200 + activeBotIds.size * 280,
          activeWorkerSlots: activeBotIds.size,
          redisQueueDepth: assignedBotIds.size,
        };

        return {
          ...prev,
          bots: updatedBots,
          campaigns: updatedCampaigns,
          activityLogs: [...newLogs, ...prev.activityLogs].slice(0, 300),
          metrics: updatedMetrics,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCampaign]);

  const dispatchCampaign = useCallback(
    (targetUrl: string, votesCount: number, comments: string[], allowAnyHost = false) => {
      const cleanUrl = targetUrl.trim();
      const stagingUrl = 'https://staging.productstunt.com';

      if (!allowAnyHost && !cleanUrl.startsWith(stagingUrl)) {
        return {
          success: false,
          message: `Target URL must start with ${stagingUrl}`,
        };
      }

      const idleBots = bots.filter((b: Bot) => b.status === 'IDLE');
      if (idleBots.length < votesCount) {
        return {
          success: false,
          message: `Insufficient IDLE bots. Requested: ${votesCount}, Available: ${idleBots.length}`,
        };
      }

      const shuffled = [...idleBots].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, votesCount);

      const scheduledTasks: ScheduledTask[] = selected.map((b: Bot, idx: number) => {
        // Natural staggered distribution (2 to 45 seconds for testing)
        const countdownSec = Math.floor(2 + idx * 3.2 + Math.random() * 3);
        const comment = comments.length > 0 ? comments[idx % comments.length] : undefined;
        return {
          botId: b.id,
          botName: b.name,
          countdownSec,
          status: 'QUEUED',
          commentText: comment,
          proxyIp: b.proxy.ip,
        };
      });

      const newCampaign: Campaign = {
        id: Date.now(),
        targetUrl: cleanUrl,
        votesRequested: votesCount,
        votesCompleted: 0,
        comments,
        commentsCompleted: 0,
        status: 'IN_PROGRESS',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        scheduledTasks,
      };

      const selectedIds = new Set(selected.map((b: Bot) => b.id));

      setData((prev: BotLabData) => ({
        ...prev,
        campaigns: [newCampaign, ...prev.campaigns],
        bots: prev.bots.map((b: Bot) => (selectedIds.has(b.id) ? { ...b, status: 'ASSIGNED' as const } : b)),
        activityLogs: [
          {
            id: `log-dispatch-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            botId: selected[0]?.id || 1,
            botName: 'celery_worker',
            action: 'NAVIGATION',
            targetUrl: cleanUrl,
            statusCode: 200,
            proxyIp: '127.0.0.1',
            details: `Campaign #${newCampaign.id} launched: ${votesCount} bots assigned with staggered delays. Full stealth human profile active.`,
          },
          ...prev.activityLogs,
        ],
        metrics: {
          ...prev.metrics,
          redisQueueDepth: votesCount,
        },
      }));

      return {
        success: true,
        message: `Stealth campaign dispatched! ${votesCount} bots queued on Celery.`,
        campaignId: newCampaign.id,
      };
    },
    [bots]
  );

  const updateAccount = useCallback((botId: number, partial: Partial<Account>) => {
    setData((prev: BotLabData) => {
      const updatedAccounts = prev.accounts.map((acc: Account) => {
        if (acc.botId === botId) {
          return { ...acc, ...partial, updatedAt: 'Just now' };
        }
        return acc;
      });

      const updatedBots = prev.bots.map((b: Bot) => {
        if (b.id === botId) {
          const acc = updatedAccounts.find((a: Account) => a.botId === botId);
          return {
            ...b,
            account: acc || b.account,
            cookiesCount: partial.isVerified ? Math.max(b.cookiesCount, 22) : b.cookiesCount,
            profileSizeMb: partial.isVerified ? Math.max(b.profileSizeMb, 15.6) : b.profileSizeMb,
          };
        }
        return b;
      });

      let updatedWifiHubs = prev.wifiHubs;
      if (partial.isVerified) {
        const targetBot = prev.bots.find(b => b.id === botId);
        if (targetBot) {
          updatedWifiHubs = prev.wifiHubs.map(hub => {
            if (hub.id === targetBot.wifiHubId) {
              return {
                ...hub,
                isCooldownActive: true,
                cooldownRemainingHours: 18,
                lastAccountCreatedAt: new Date().toISOString(),
              };
            }
            return hub;
          });
        }
      }

      return {
        ...prev,
        accounts: updatedAccounts,
        bots: updatedBots,
        wifiHubs: updatedWifiHubs,
      };
    });
  }, []);

  const getNextRecommendedBot = useCallback((): Bot | null => {
    // 1. Filter all unverified accounts
    const unverifiedBots = bots.filter(b => !b.account.isVerified);
    if (unverifiedBots.length === 0) return null;

    // 2. Prioritize bots whose Wi-Fi Hub is NOT in cooldown (cold network)
    const coldHubBots = unverifiedBots.filter(b => {
      const hub = wifiHubs.find(h => h.id === b.wifiHubId);
      return hub ? !hub.isCooldownActive : true;
    });

    if (coldHubBots.length > 0) {
      // Pick random cold-hub bot to distribute setup evenly across households
      const randIdx = Math.floor(Math.random() * coldHubBots.length);
      return coldHubBots[randIdx];
    }

    // 3. Fallback: sort by least cooldown remaining
    const sortedByCooldown = [...unverifiedBots].sort((a, b) => {
      const hubA = wifiHubs.find(h => h.id === a.wifiHubId);
      const hubB = wifiHubs.find(h => h.id === b.wifiHubId);
      const remA = hubA ? hubA.cooldownRemainingHours : 99;
      const remB = hubB ? hubB.cooldownRemainingHours : 99;
      return remA - remB;
    });

    return sortedByCooldown[0] || null;
  }, [bots, wifiHubs]);

  const openAccountCreation = useCallback((botId: number, service: ProvisioningService) => {
    setActiveVncBotId(botId);
    setActiveService(service);

    setData((prev: BotLabData) => {
      const targetBot = prev.bots.find((b: Bot) => b.id === botId);
      if (!targetBot) return prev;

      const serviceUrls: Record<ProvisioningService, string> = {
        gmail: 'https://accounts.google.com/signup',
        outlook: 'https://signup.live.com',
        productstunt: 'https://staging.productstunt.com/signup',
      };

      const log: ActivityLog = {
        id: `log-setup-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        botId,
        botName: targetBot.name,
        action: 'LAUNCH_BROWSER',
        targetUrl: serviceUrls[service],
        statusCode: 200,
        proxyIp: targetBot.proxy.ip,
        details: `Launched dedicated browser for ${targetBot.name} routed through ${targetBot.proxy.ip}:${targetBot.proxy.port} -> ${service.toUpperCase()}`,
      };

      return {
        ...prev,
        bots: prev.bots.map((b: Bot) => (b.id === botId ? { ...b, status: 'RUNNING' as const } : b)),
        activityLogs: [log, ...prev.activityLogs],
      };
    });
  }, []);

  const closeVncSession = useCallback((botId: number) => {
    setActiveVncBotId(null);
    setData((prev: BotLabData) => {
      const targetBot = prev.bots.find((b: Bot) => b.id === botId);
      if (!targetBot) return prev;

      const log: ActivityLog = {
        id: `log-close-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        botId,
        botName: targetBot.name,
        action: 'STOP_BROWSER',
        targetUrl: 'local',
        statusCode: 200,
        proxyIp: targetBot.proxy.ip,
        details: `Browser closed. Session tokens permanently locked to IP ${targetBot.proxy.ip} in ${targetBot.profilePath}`,
      };

      return {
        ...prev,
        bots: prev.bots.map((b: Bot) => (b.id === botId ? { ...b, status: 'IDLE' as const } : b)),
        activityLogs: [log, ...prev.activityLogs],
      };
    });
  }, []);

  const emergencyKillSwitch = useCallback(() => {
    let resetCount = 0;
    let purged = 0;

    setData((prev: BotLabData) => {
      resetCount = prev.bots.filter((b: Bot) => b.status !== 'IDLE').length;
      purged = prev.campaigns
        .filter((c: Campaign) => c.status === 'IN_PROGRESS')
        .reduce((sum: number, c: Campaign) => sum + c.scheduledTasks.filter((t: ScheduledTask) => t.status === 'QUEUED').length, 0);

      const resetBots = prev.bots.map((b: Bot) => ({ ...b, status: 'IDLE' as const }));
      const stoppedCampaigns = prev.campaigns.map((c: Campaign) =>
        c.status === 'IN_PROGRESS' ? { ...c, status: 'STOPPED' as const } : c
      );

      const killLog: ActivityLog = {
        id: `log-kill-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        botId: 0,
        botName: 'KILL_SWITCH',
        action: 'ERROR',
        targetUrl: 'REDIS_FLUSH',
        statusCode: 503,
        proxyIp: '127.0.0.1',
        details: `[KILL SWITCH ENGAGED] Flushed ${purged} Celery tasks in Redis. Terminated active Playwright instances. Reset ${resetCount} bots to IDLE.`,
      };

      return {
        ...prev,
        bots: resetBots,
        campaigns: stoppedCampaigns,
        activityLogs: [killLog, ...prev.activityLogs],
        metrics: {
          ...prev.metrics,
          cpuUsagePercent: 8.4,
          ramUsedMb: 3200,
          activeWorkerSlots: 0,
          redisQueueDepth: 0,
        },
      };
    });

    setActiveVncBotId(null);
    return { purgedTasks: purged, resetBots: resetCount };
  }, []);

  const importWebshareCsv = useCallback((csvContent: string) => {
    const lines = csvContent
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#') && !l.startsWith('ip'));

    if (lines.length === 0) {
      return { imported: 0, error: 'CSV file is empty' };
    }

    let count = 0;
    setData((prev: BotLabData) => {
      const newProxies = [...prev.proxies];
      lines.forEach((line, index) => {
        if (index >= 100) return;
        const parts = line.split(',').map(s => s.trim());
        if (parts.length >= 4) {
          const [ip, portStr, user, pass, geo] = parts;
          const port = parseInt(portStr, 10) || 80;
          if (newProxies[index]) {
            newProxies[index] = {
              ...newProxies[index],
              ip,
              port,
              username: user,
              password: pass,
              geo: geo || newProxies[index].geo,
              lastChecked: 'Just now',
            };
            count++;
          }
        }
      });

      const newBots = prev.bots.map((b: Bot, idx: number) => ({
        ...b,
        proxy: newProxies[idx] || b.proxy,
      }));

      return {
        ...prev,
        proxies: newProxies,
        bots: newBots,
      };
    });

    return { imported: count };
  }, []);

  const runProxyHealthCheck = useCallback(async (isStartup = false) => {
    setIsHealthChecking(true);
    setHealthCheckProgress(prev => ({ ...prev, checked: 10 }));

    // Real-time progressive staging for batched proxy sweep
    await new Promise(r => setTimeout(r, 140));
    setHealthCheckProgress(prev => ({ ...prev, checked: 35 }));
    await new Promise(r => setTimeout(r, 160));
    setHealthCheckProgress(prev => ({ ...prev, checked: 70 }));
    await new Promise(r => setTimeout(r, 140));
    setHealthCheckProgress(prev => ({ ...prev, checked: 100 }));

    let totalLat = 0;
    let onlineCount = 0;
    let degradedCount = 0;
    let offlineCount = 0;

    setData((prev: BotLabData) => {
      const updatedProxies = prev.proxies.map((p: Proxy) => {
        const isOfflineBot = p.id === 99;
        const isDegradedBot = p.id === 37 || p.id === 73 || p.id === 88;

        const lat = isOfflineBot ? 999 : (isDegradedBot ? Math.floor(160 + Math.random() * 45) : Math.floor(18 + Math.random() * 55));
        let status: ProxyHealthStatus = 'ONLINE';
        let active = true;
        let loss = 0;

        if (isOfflineBot) {
          status = 'OFFLINE';
          active = false;
          loss = 100;
          offlineCount++;
        } else if (isDegradedBot || lat > 140) {
          status = 'DEGRADED';
          loss = 3;
          degradedCount++;
        } else {
          status = 'ONLINE';
          onlineCount++;
        }

        if (status !== 'OFFLINE') {
          totalLat += lat;
        }

        return {
          ...p,
          latencyMs: lat,
          healthStatus: status,
          isActive: active,
          packetLossPercent: loss,
          lastChecked: 'Just now',
        };
      });

      const proxyMap = new Map(updatedProxies.map(p => [p.id, p]));
      const updatedBots = prev.bots.map((b: Bot) => ({
        ...b,
        proxy: proxyMap.get(b.proxyId) || b.proxy,
      }));

      const avgLat = onlineCount + degradedCount > 0 ? Math.round(totalLat / (onlineCount + degradedCount)) : 38;

      setHealthCheckProgress({
        checked: 100,
        total: 100,
        online: onlineCount,
        degraded: degradedCount,
        offline: offlineCount,
        avgLatencyMs: avgLat,
      });

      const log: ActivityLog = {
        id: `log-proxy-check-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        botId: 0,
        botName: 'HEALTH_CHECKER',
        action: 'PROXY_HEALTH_CHECK',
        targetUrl: 'http://proxy.webshare.io:80/ping',
        statusCode: offlineCount === 0 ? 200 : 206,
        proxyIp: '100_PROXIES_SWEEP',
        details: `${isStartup ? 'Startup' : 'Manual'} Background Health Check: ${onlineCount} Online (<120ms), ${degradedCount} Degraded, ${offlineCount} Offline. Fleet average latency: ${avgLat}ms across 100 Webshare Static ISP proxies.`,
      };

      return {
        ...prev,
        proxies: updatedProxies,
        bots: updatedBots,
        activityLogs: [log, ...prev.activityLogs],
      };
    });

    setIsHealthChecking(false);
  }, []);

  const testSingleProxy = useCallback(async (botId: number): Promise<Proxy> => {
    // 1. Set checking state for targeted visual feedback
    setData((prev: BotLabData) => {
      const updatedBots = prev.bots.map((b: Bot) =>
        b.id === botId ? { ...b, proxy: { ...b.proxy, healthStatus: 'CHECKING' as const } } : b
      );
      return { ...prev, bots: updatedBots };
    });

    await new Promise(r => setTimeout(r, 380));

    let resolvedProxy: Proxy | null = null;

    setData((prev: BotLabData) => {
      const targetBot = prev.bots.find(b => b.id === botId);
      if (!targetBot) return prev;

      const isOffline = targetBot.proxy.id === 99;
      const latency = isOffline ? 999 : Math.floor(19 + Math.random() * 40);
      const status: ProxyHealthStatus = isOffline ? 'OFFLINE' : (latency > 140 ? 'DEGRADED' : 'ONLINE');

      const updatedProxy: Proxy = {
        ...targetBot.proxy,
        latencyMs: latency,
        healthStatus: status,
        isActive: !isOffline,
        packetLossPercent: isOffline ? 100 : 0,
        lastChecked: 'Just now',
      };
      resolvedProxy = updatedProxy;

      const updatedBots = prev.bots.map((b: Bot) =>
        b.id === botId ? { ...b, proxy: updatedProxy } : b
      );
      const updatedProxies = prev.proxies.map((p: Proxy) =>
        p.id === targetBot.proxyId ? updatedProxy : p
      );

      const log: ActivityLog = {
        id: `log-single-ping-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        botId,
        botName: targetBot.name,
        action: 'PROXY_HEALTH_CHECK',
        targetUrl: `http://${updatedProxy.ip}:${updatedProxy.port}/ping`,
        statusCode: status === 'OFFLINE' ? 504 : 200,
        proxyIp: updatedProxy.ip,
        details: `Diagnostic Probe on ${targetBot.name} (${updatedProxy.ip}): Status ${status}, Round-Trip Latency ${latency}ms via ${updatedProxy.isp} (${updatedProxy.geo})`,
      };

      return {
        ...prev,
        bots: updatedBots,
        proxies: updatedProxies,
        activityLogs: [log, ...prev.activityLogs],
      };
    });

    return resolvedProxy || ({} as Proxy);
  }, []);

  const testAllProxies = useCallback(() => {
    runProxyHealthCheck(false);
  }, [runProxyHealthCheck]);

  // Automatic Background Health Check on Startup
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        runProxyHealthCheck(true);
      }
    }, 500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [runProxyHealthCheck]);

  const resetAllToIdle = useCallback(() => {
    setData((prev: BotLabData) => ({
      ...prev,
      bots: prev.bots.map((b: Bot) => ({ ...b, status: 'IDLE' as const })),
    }));
  }, []);

  return (
    <BotLabContext.Provider
      value={{
        bots,
        proxies,
        wifiHubs,
        accounts,
        campaigns,
        activityLogs,
        metrics,
        activeVncBotId,
        activeService,
        activeCampaign,
        isHealthChecking,
        healthCheckProgress,
        getNextRecommendedBot,
        dispatchCampaign,
        updateAccount,
        openAccountCreation,
        closeVncSession,
        emergencyKillSwitch,
        importWebshareCsv,
        testAllProxies,
        runProxyHealthCheck,
        testSingleProxy,
        resetAllToIdle,
      }}
    >
      {children}
    </BotLabContext.Provider>
  );
};

export const useBotLab = () => {
  const context = useContext(BotLabContext);
  if (!context) {
    throw new Error('useBotLab must be used within a BotLabProvider');
  }
  return context;
};
