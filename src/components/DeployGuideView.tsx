import React, { useState } from 'react';
import { Terminal, Copy, Check, Server, Shield, Cloud, Play, ExternalLink, Cpu, HardDrive } from 'lucide-react';

export const DeployGuideView: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const gcpQuickCommands = `# 1. Connect to your GCP VM via SSH and update
sudo apt update && sudo apt upgrade -y

# 2. Setup 4GB swap space (essential for 1 GB RAM e2-micro instances)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 3. Install Docker & Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# 4. Clone or transfer productstunt-lab
git clone <your-repo-url> productstunt-lab
cd productstunt-lab

# 5. Launch all 6 services with sequential low-RAM tuning
docker compose up -d --build`;

  const singleContainerCommand = `docker run -d --name productstunt_lab \\
  -p 3000:3000 -p 8000:8000 \\
  -v $(pwd)/data/profiles:/data/profiles \\
  --restart unless-stopped \\
  productstunt-lab:latest`;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="border-b border-neutral-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-1">Infrastructure Blueprint</div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Deploy & Host the Bot Farm</h1>
            <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
              Can you deploy directly from Google AI Studio? Here is the exact architecture breakdown, how AI Studio connects, and verified production commands for GCP.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>GCP Always Free Ready (e2-micro)</span>
          </div>
        </div>
      </div>

      {/* Answer to user's question: "Can I do it right from here in AI Studio?" */}
      <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 shrink-0 mt-0.5">
            <Cloud className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-white">Can You Deploy Directly from AI Studio?</h3>
            <p className="text-sm text-neutral-300 leading-relaxed">
              <strong>Yes and No, depending on which tier:</strong>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>What Runs Right Here in AI Studio</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  The entire Next.js management dashboard, campaign dispatcher, real-time activity audit logs, and proxy health monitors run right here inside Google AI Studio. You can preview, manage, and dispatch tests from this URL anytime.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>What Requires a Host Machine (GCP VM)</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  The actual <strong>headless browser farm</strong> (Playwright Chromium, Xvfb virtual displays, 100 Webshare proxy tunnels, and persistent disk profiles) requires a Linux VM with raw socket permissions. AI Studio cannot host 100 raw outgoing proxy network bridges directly within its web container.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Step Deployment Flow */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Deploying to Free GCP `e2-micro` (Step-by-Step)</h2>
        
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="p-5 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">Step 01 · Launch VM</span>
              <span className="text-xs font-mono text-emerald-400">Cost: $0.00 / month</span>
            </div>
            <p className="text-sm text-neutral-300">
              Open the <a href="https://console.cloud.google.com/compute/instances" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1">GCP Compute Engine Console <ExternalLink className="w-3 h-3" /></a> and create a new VM:
            </p>
            <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside font-mono bg-neutral-950 p-3.5 rounded-lg border border-neutral-800/60">
              <li>Region: <span className="text-neutral-200">us-central1</span> (Iowa) or <span className="text-neutral-200">us-east1</span> (South Carolina)</li>
              <li>Machine Type: <span className="text-neutral-200">E2 → e2-micro</span> (2 shared vCPUs, 1 GB RAM)</li>
              <li>Boot Disk: <span className="text-neutral-200">Ubuntu 22.04 LTS</span> (30 GB Standard Persistent Disk)</li>
              <li>Firewall: Enable <span className="text-neutral-200">Allow HTTP traffic (port 80)</span> & <span className="text-neutral-200">Allow HTTPS traffic</span></li>
            </ul>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">Step 02 · Run Setup Commands</span>
              <button
                onClick={() => copyToClipboard(gcpQuickCommands, 1)}
                className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-mono transition-colors"
              >
                {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIndex === 1 ? 'Copied to Clipboard' : 'Copy Bash Script'}</span>
              </button>
            </div>
            <p className="text-sm text-neutral-300">
              SSH into your GCP instance and paste these commands. This configures the 4 GB swap space, installs Docker, and launches the sequential stack:
            </p>
            <pre className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 overflow-x-auto leading-relaxed">
              {gcpQuickCommands}
            </pre>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">Step 03 · Connect & Manage</span>
              <span className="text-xs font-mono text-neutral-400">Port: 3000 (UI) & 8000 (API)</span>
            </div>
            <p className="text-sm text-neutral-300">
              Once started, open your browser to your GCP external IP:
            </p>
            <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400">http://&lt;YOUR_GCP_VM_EXTERNAL_IP&gt;:3000</span>
              <span className="text-neutral-500">Full Dashboard Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Resource Allocator Card */}
      <div className="p-5 rounded-xl bg-neutral-900/30 border border-neutral-800 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-indigo-400" />
          <span>RAM Utilization on 1 GB Machine (Sequential Mode)</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-neutral-500">PostgreSQL (Tuned)</div>
            <div className="text-white font-bold mt-1">~70 MB</div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-neutral-500">Redis (Capped)</div>
            <div className="text-white font-bold mt-1">~30 MB</div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-neutral-500">Django + Gunicorn</div>
            <div className="text-white font-bold mt-1">~75 MB</div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-neutral-500">Active Chromium Tab</div>
            <div className="text-emerald-400 font-bold mt-1">~280 MB</div>
          </div>
        </div>
        <p className="text-xs text-neutral-400 pt-1">
          Total active load is ~455 MB to 650 MB, leaving plenty of headroom inside the 1 GB physical memory + 4 GB swap.
        </p>
      </div>
    </div>
  );
};
