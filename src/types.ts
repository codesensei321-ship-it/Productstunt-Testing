export type BotStatus = 'IDLE' | 'RUNNING' | 'ASSIGNED' | 'ERROR';
export type MailboxProvider = 'Gmail' | 'Outlook' | 'Productstunt';
export type ActionType = 'UPVOTE' | 'COMMENT' | 'NAVIGATION' | 'LOGIN' | 'CAPTCHA_SOLVE' | 'PROFILE_SYNC' | 'LAUNCH_BROWSER' | 'STOP_BROWSER' | 'LAUNCH_VNC' | 'STOP_VNC' | 'ERROR' | 'PROXY_HEALTH_CHECK';
export type ProxyHealthStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'CHECKING';

export type HouseholdType = 'Single Resident' | 'Apartment / Roommates' | 'Family Household' | 'Power Tech Home';

export interface Proxy {
  id: number;
  ip: string;
  port: number;
  username: string;
  password?: string;
  geo: string;
  city: string;
  isp: string;
  latencyMs: number;
  isActive: boolean;
  lastChecked: string;
  healthStatus: ProxyHealthStatus;
  packetLossPercent?: number;
  wifiSsid?: string;
}

export interface WifiHub {
  id: number;
  ssid: string;
  proxyId: number;
  proxy: Proxy;
  householdType: HouseholdType;
  deviceIds: number[];
  devicesCount: number;
  lastAccountCreatedAt: string | null;
  cooldownHours: number;
  isCooldownActive: boolean;
  cooldownRemainingHours: number;
}

export interface ProxyDiagnosticsResult {
  total: number;
  online: number;
  degraded: number;
  offline: number;
  avgLatencyMs: number;
  testedAt: string;
}

export interface Account {
  id: number;
  botId: number;
  mailboxProvider: MailboxProvider;
  mailboxEmail: string;
  mailboxPassword?: string;
  appEmail: string;
  appPassword?: string;
  isVerified: boolean;
  updatedAt: string;
}

export interface Bot {
  id: number;
  name: string;
  deviceName: string;
  wifiHubId: number;
  wifiSsid: string;
  proxyId: number;
  proxy: Proxy;
  profilePath: string;
  status: BotStatus;
  vncPort: number;
  lastActive?: string;
  cookiesCount: number;
  profileSizeMb: number;
  account: Account;
  fingerprint: {
    resolution: string;
    os: string;
    timezone: string;
  };
}

export interface ScheduledTask {
  botId: number;
  botName: string;
  countdownSec: number;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  commentText?: string;
  proxyIp: string;
}

export interface Campaign {
  id: number;
  targetUrl: string;
  votesRequested: number;
  votesCompleted: number;
  comments: string[];
  commentsCompleted: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'STOPPED';
  createdAt: string;
  scheduledTasks: ScheduledTask[];
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  botId: number;
  botName: string;
  action: ActionType;
  targetUrl: string;
  statusCode: number;
  proxyIp: string;
  details: string;
}

export interface VPSMetrics {
  cpuUsagePercent: number;
  ramUsedMb: number;
  ramTotalMb: number;
  swapUsedMb: number;
  swapTotalMb: number;
  celeryConcurrency: number;
  activeWorkerSlots: number;
  redisQueueDepth: number;
  dockerServices?: { name: string; image: string; status: string; ramMb: number }[];
}
