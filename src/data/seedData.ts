import { Bot, Proxy, Account, ActivityLog, Campaign, VPSMetrics, WifiHub, HouseholdType } from '../types';

const GEO_LOCATIONS = [
  { geo: 'US', city: 'Ashburn, VA', isp: 'Comcast Business Static ISP', tz: 'America/New_York' },
  { geo: 'US', city: 'New York, NY', isp: 'Verizon Fios Static Enterprise', tz: 'America/New_York' },
  { geo: 'US', city: 'Los Angeles, CA', isp: 'AT&T Business Fiber ISP', tz: 'America/Los_Angeles' },
  { geo: 'US', city: 'Chicago, IL', isp: 'Charter Communications ISP', tz: 'America/Chicago' },
  { geo: 'US', city: 'Dallas, TX', isp: 'Lumen Technologies ISP', tz: 'America/Chicago' },
  { geo: 'GB', city: 'London, UK', isp: 'British Telecom Static ISP', tz: 'Europe/London' },
  { geo: 'DE', city: 'Frankfurt, DE', isp: 'Deutsche Telekom Business ISP', tz: 'Europe/Berlin' },
  { geo: 'CA', city: 'Toronto, ON', isp: 'Rogers Communications ISP', tz: 'America/Toronto' },
  { geo: 'US', city: 'Seattle, WA', isp: 'CenturyLink High-Speed Fiber', tz: 'America/Los_Angeles' },
  { geo: 'US', city: 'Atlanta, GA', isp: 'Cox Business Static ISP', tz: 'America/New_York' },
];

interface WifiHubSeedDef {
  id: number;
  ssid: string;
  householdType: HouseholdType;
  deviceSlots: number;
  recentCreatedHoursAgo?: number; // if present, puts hub in cooldown
}

const WIFI_HUB_DEFS: WifiHubSeedDef[] = [
  { id: 1, ssid: 'Apex-Family-5G', householdType: 'Family Household', deviceSlots: 3, recentCreatedHoursAgo: 5 },
  { id: 2, ssid: 'Orbi-Guest-Net', householdType: 'Apartment / Roommates', deviceSlots: 2 },
  { id: 3, ssid: 'Spectrum-Studio-Mesh', householdType: 'Single Resident', deviceSlots: 1 },
  { id: 4, ssid: 'Beacon-WiFi-Home', householdType: 'Power Tech Home', deviceSlots: 4, recentCreatedHoursAgo: 8 },
  { id: 5, ssid: 'Cascade-Private-Net', householdType: 'Apartment / Roommates', deviceSlots: 2 },
  { id: 6, ssid: 'Fios-Gigabit-Home', householdType: 'Family Household', deviceSlots: 3 },
  { id: 7, ssid: 'Netgear-Loft-WiFi', householdType: 'Single Resident', deviceSlots: 1 },
  { id: 8, ssid: 'Xfinity-Apt-3B', householdType: 'Apartment / Roommates', deviceSlots: 2, recentCreatedHoursAgo: 2 },
  { id: 9, ssid: 'Eero-Pro-Residence', householdType: 'Power Tech Home', deviceSlots: 4 },
  { id: 10, ssid: 'Linksys-Smart-WiFi', householdType: 'Family Household', deviceSlots: 3 },
  { id: 11, ssid: 'Google-Nest-Home', householdType: 'Apartment / Roommates', deviceSlots: 2 },
  { id: 12, ssid: 'Archer-AX6000-Net', householdType: 'Single Resident', deviceSlots: 1 },
  { id: 13, ssid: 'CenturyLink-Fiber-5G', householdType: 'Family Household', deviceSlots: 3 },
  { id: 14, ssid: 'Asus-Rog-Gaming-LAN', householdType: 'Power Tech Home', deviceSlots: 4, recentCreatedHoursAgo: 6 },
  { id: 15, ssid: 'Cox-Gigablast-WiFi', householdType: 'Apartment / Roommates', deviceSlots: 2 },
  { id: 16, ssid: 'Breeze-Home-Mesh', householdType: 'Family Household', deviceSlots: 3 },
  { id: 17, ssid: 'Att-Fiber-Private', householdType: 'Single Resident', deviceSlots: 1 },
  { id: 18, ssid: 'Verizon-Home-5G', householdType: 'Apartment / Roommates', deviceSlots: 2 },
  { id: 19, ssid: 'TP-Link-Deco-Mesh', householdType: 'Power Tech Home', deviceSlots: 4 },
  { id: 20, ssid: 'Frontier-Ultra-LAN', householdType: 'Family Household', deviceSlots: 3 },
];

const DEVICE_NAMES_POOL = [
  "Alex's MacBook Air M2", "Jordan's ThinkPad X1", "Living Room iMac 24", "Taylor's Dell XPS 15",
  "Office Mac Studio", "Personal iPad Pro 12.9", "Family Desktop Rig", "Dev Linux Box",
  "Morgan's Surface Pro 9", "Casey's MacBook Pro 14", "Home Office ThinkCentre", "Sam's HP Spectre x360",
  "Studio Mac Mini M2", "Gaming Desktop PC", "Kitchen Smart Terminal", "Workstation Precision 5570",
  "Riley's Lenovo Yoga 9i", "Personal ASUS Zenbook", "Guest MacBook Air", "Lab Intel NUC",
  "Avery's Framework Laptop", "Desk Dell OptiPlex", "Robin's MacBook Pro 16", "Family Media PC",
  "Quinn's ThinkPad T14", "Studio Surface Studio", "Jamie's MacBook Air 15", "Office Latitude 7420",
  "Dana's Razer Blade 14", "Spare HP Envy 16", "Chris's MacBook Pro M3", "Home Theater PC",
  "Pat's Dell XPS 13 Plus", "Main Workstation Dual", "Terry's ThinkPad Nano", "Creative iMac Pro",
  "Jesse's Surface Laptop 5", "Lab Ubuntu Desktop", "Dev MacBook Pro 14", "Media Room Mac Mini",
  "Drew's Lenovo Legion 7", "Office Dell Precision", "Harper's MacBook Air M1", "Home Server Desktop",
  "Rowan's ASUS ROG Zephyrus", "Workstation ThinkStation", "Finley's Surface Book 3", "Den Desktop Rig",
  "Skyler's MacBook Pro M2", "Primary Work Rig",
];

export function generateInitialLabData(): {
  proxies: Proxy[];
  wifiHubs: WifiHub[];
  accounts: Account[];
  bots: Bot[];
  campaigns: Campaign[];
  activityLogs: ActivityLog[];
  metrics: VPSMetrics;
} {
  const proxies: Proxy[] = [];
  const wifiHubs: WifiHub[] = [];
  const accounts: Account[] = [];
  const bots: Bot[] = [];

  const baseBlocks = [
    [198, 51, 100],
    [203, 0, 113],
    [192, 0, 2],
    [104, 28, 14],
    [172, 67, 180],
    [142, 250, 72],
    [173, 194, 21],
    [74, 125, 133],
  ];

  let currentBotGlobalId = 1;

  WIFI_HUB_DEFS.forEach((hubDef, idx) => {
    const loc = GEO_LOCATIONS[idx % GEO_LOCATIONS.length];
    const block = baseBlocks[idx % baseBlocks.length];
    const ip = `${block[0]}.${block[1]}.${block[2]}.${((idx * 11 + 19) % 240) + 1}`;
    const port = 8000 + (idx % 20);

    let latency = 21 + ((idx * 6) % 45);
    let health: 'ONLINE' | 'DEGRADED' | 'OFFLINE' = 'ONLINE';
    let active = true;

    if (idx === 7) {
      latency = 168;
      health = 'DEGRADED';
    }

    const proxy: Proxy = {
      id: hubDef.id,
      ip,
      port,
      username: `webshare_wifi_${String(hubDef.id).padStart(2, '0')}`,
      password: `ws_pass_${String(hubDef.id).padStart(2, '0')}_vps`,
      geo: loc.geo,
      city: loc.city,
      isp: loc.isp,
      latencyMs: latency,
      isActive: active,
      lastChecked: 'Just now',
      healthStatus: health,
      packetLossPercent: 0,
      wifiSsid: hubDef.ssid,
    };
    proxies.push(proxy);

    // Calculate Cooldown (18 hours threshold)
    const isCooldown = Boolean(hubDef.recentCreatedHoursAgo !== undefined && hubDef.recentCreatedHoursAgo < 18);
    const cooldownRemainingHours = isCooldown ? 18 - (hubDef.recentCreatedHoursAgo || 0) : 0;
    const lastCreatedAt = hubDef.recentCreatedHoursAgo !== undefined
      ? new Date(Date.now() - (hubDef.recentCreatedHoursAgo * 3600 * 1000)).toISOString()
      : null;

    const deviceIdsForThisHub: number[] = [];

    for (let slot = 0; slot < hubDef.deviceSlots; slot++) {
      const botId = currentBotGlobalId;
      deviceIdsForThisHub.push(botId);

      const deviceName = DEVICE_NAMES_POOL[(botId - 1) % DEVICE_NAMES_POOL.length];
      const isGmail = botId % 2 !== 0;
      const provider = isGmail ? 'Gmail' : 'Outlook';
      const emailPrefix = `alex.user${botId}`;
      const emailDomain = isGmail ? 'gmail.com' : 'outlook.com';

      // 18 primed, 32 ready for signup
      const isVerified = botId <= 18;

      const account: Account = {
        id: botId,
        botId,
        mailboxProvider: provider,
        mailboxEmail: `${emailPrefix}@${emailDomain}`,
        mailboxPassword: `WifiPass!${String(botId).padStart(3, '0')}`,
        appEmail: isVerified ? `${emailPrefix}@${emailDomain}` : '',
        appPassword: isVerified ? `Staging2026!${botId}` : '',
        isVerified,
        updatedAt: '2026-11-04 10:15:00',
      };
      accounts.push(account);

      const bot: Bot = {
        id: botId,
        name: `bot_${String(botId).padStart(3, '0')}`,
        deviceName,
        wifiHubId: hubDef.id,
        wifiSsid: hubDef.ssid,
        proxyId: hubDef.id,
        proxy,
        profilePath: `/data/profiles/bot_${String(botId).padStart(3, '0')}`,
        status: 'IDLE',
        vncPort: 6080 + (botId % 50),
        lastActive: isVerified ? '2026-11-04 10:20:00' : undefined,
        cookiesCount: isVerified ? 14 + (botId % 10) : 0,
        profileSizeMb: isVerified ? parseFloat((11.2 + botId * 0.12).toFixed(1)) : 1.2,
        account,
        fingerprint: {
          resolution: botId % 3 === 0 ? '1440x900' : botId % 2 === 0 ? '1920x1080' : '1536x864',
          os: botId % 2 === 0 ? 'macOS Sonoma' : 'Windows 11 x64',
          timezone: loc.tz,
        },
      };
      bots.push(bot);

      currentBotGlobalId++;
    }

    const wifiHub: WifiHub = {
      id: hubDef.id,
      ssid: hubDef.ssid,
      proxyId: hubDef.id,
      proxy,
      householdType: hubDef.householdType,
      deviceIds: deviceIdsForThisHub,
      devicesCount: hubDef.deviceSlots,
      lastAccountCreatedAt: lastCreatedAt,
      cooldownHours: 18,
      isCooldownActive: isCooldown,
      cooldownRemainingHours,
    };
    wifiHubs.push(wifiHub);
  });

  const activityLogs: ActivityLog[] = [
    {
      id: 'log-001',
      timestamp: '2026-11-04 13:58:12',
      botId: 14,
      botName: 'bot_014',
      action: 'UPVOTE',
      targetUrl: 'https://staging.productstunt.com/products/nexus-flow-ai',
      statusCode: 200,
      proxyIp: proxies[13].ip,
      details: 'Stealth Playwright via Asus-Rog-Gaming-LAN: 1,420px scroll, human dwell 1.8s, upvote clicked',
    },
    {
      id: 'log-002',
      timestamp: '2026-11-04 13:55:04',
      botId: 3,
      botName: 'bot_003',
      action: 'COMMENT',
      targetUrl: 'https://staging.productstunt.com/products/nexus-flow-ai',
      statusCode: 200,
      proxyIp: proxies[2].ip,
      details: 'Keystroke jitter via Spectrum-Studio-Mesh: "Sub-second response times are super impressive!"',
    },
    {
      id: 'log-003',
      timestamp: '2026-11-04 13:48:22',
      botId: 1,
      botName: 'bot_001',
      action: 'LOGIN',
      targetUrl: 'https://staging.productstunt.com/signup',
      statusCode: 200,
      proxyIp: proxies[0].ip,
      details: 'Google OAuth token captured via NoVNC. Cookies locked into /data/profiles/bot_001',
    },
  ];

  const campaigns: Campaign[] = [
    {
      id: 101,
      targetUrl: 'https://staging.productstunt.com/products/nexus-flow-ai',
      votesRequested: 15,
      votesCompleted: 15,
      comments: [
        'Huge congrats on the launch! Testing the demo now.',
        'Clean design and very intuitive onboarding.',
        'Does this offer API rate-limit alerts?',
      ],
      commentsCompleted: 3,
      status: 'COMPLETED',
      createdAt: '2026-11-04 12:00:00',
      scheduledTasks: [],
    },
  ];

  const metrics: VPSMetrics = {
    cpuUsagePercent: 14.2,
    ramUsedMb: 3600,
    ramTotalMb: 12288,
    swapUsedMb: 380,
    swapTotalMb: 4096,
    celeryConcurrency: 1,
    activeWorkerSlots: 0,
    redisQueueDepth: 0,
  };

  return { proxies, wifiHubs, accounts, bots, campaigns, activityLogs, metrics };
}
