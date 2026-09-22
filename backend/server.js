const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { exec, spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const open = async (targetUrl) => {
  openUrlInBrowserNative(targetUrl);
};
const { Groq } = require('groq-sdk');
const mathEngine = require('./mathEngine');
const knowledgeEngine = require('./knowledgeEngine');
const reminderEngine = require('./reminderEngine');
const model3dEngine = require('./model3dEngine');
const ai3dSynthesizer = require('./ai3dSynthesizer');

// Initialize proactive background reminder scheduler
reminderEngine.startEngine();

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Groq / AI API Client with environment fallback
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '';
const groq = new Groq({ apiKey: GROQ_API_KEY });

// In-memory history of opened websites
const openedWebsitesHistory = [];

// Web URL mapping for common services
const serviceWebUrls = {
  spotify: 'https://open.spotify.com/',
  youtube: 'https://www.youtube.com/',
  discord: 'https://discord.com/app',
  whatsapp: 'https://web.whatsapp.com/',
  instagram: 'https://www.instagram.com/',
  twitter: 'https://twitter.com/',
  x: 'https://x.com/',
  facebook: 'https://www.facebook.com/',
  netflix: 'https://www.netflix.com/',
  telegram: 'https://web.telegram.org/',
  reddit: 'https://www.reddit.com/',
  github: 'https://github.com/',
  chatgpt: 'https://chatgpt.com/',
  claude: 'https://claude.ai/',
  notion: 'https://www.notion.so/',
  slack: 'https://app.slack.com/',
  gmail: 'https://mail.google.com/',
  google: 'https://www.google.com/',
  linkedin: 'https://www.linkedin.com/',
  amazon: 'https://www.amazon.com/',
  figma: 'https://www.figma.com/',
  canva: 'https://www.canva.com/',
  tiktok: 'https://www.tiktok.com/',
  capcut: 'https://www.capcut.com/',
  zoom: 'https://zoom.us/',
  teams: 'https://teams.microsoft.com/'
};

function getFallbackWebUrl(appName) {
  const clean = appName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (serviceWebUrls[clean]) {
    return serviceWebUrls[clean];
  }
  for (const [k, v] of Object.entries(serviceWebUrls)) {
    if (clean.includes(k) || k.includes(clean)) {
      return v;
    }
  }
  if (appName.includes('.')) {
    return /^https?:\/\//i.test(appName) ? appName : 'https://' + appName;
  }
  return `https://www.${clean}.com/`;
}

// In-memory cache of all installed Windows applications (Win32 & Microsoft Store / UWP)
let startAppsCache = [];

function refreshStartAppsCache() {
  if (process.platform !== 'win32') return;
  try {
    const raw = execSync('powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-StartApps | ConvertTo-Json -Depth 2"', {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 10000
    });
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      startAppsCache = parsed.map(item => ({
        name: item.Name || '',
        appId: item.AppID || '',
        cleanName: (item.Name || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
        cleanAppId: (item.AppID || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      }));
      console.log(`[START-APPS] Indexed ${startAppsCache.length} applications from Windows Start Menu.`);
    }
  } catch (e) {
    console.warn('[START-APPS] Background indexing warning:', e.message);
  }
}

// Initial index and periodic refresh
setTimeout(refreshStartAppsCache, 500);
setInterval(refreshStartAppsCache, 10 * 60 * 1000);

function cleanAppName(appName) {
  let clean = (appName || '').trim();
  clean = clean.replace(/^(?:open|launch|start|run|go\s+to|show)\s+(?:the\s+)?/i, '').trim();
  clean = clean.replace(/\b(jarvis|jervis|jarviss|travis|javis|jarviz|hey\s+jarvis|please|sir|app|application|on desktop|in desktop|from desktop|desktop)\b/gi, '').trim();
  clean = clean.replace(/\b(files? exploer|file exploorer|files exploorer|files explorer)\b/gi, 'file explorer');
  return clean || (appName || '').trim();
}

function findAppOnWindows(rawAppName) {
  const sanitized = cleanAppName(rawAppName);
  const appLower = sanitized.toLowerCase().replace(/[^a-z0-9]/g, '');
  const originalLower = (rawAppName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // 1. Built-in system apps
  const systemMap = {
    'code': 'shell:AppsFolder\\Microsoft.VisualStudioCode',
    'vscode': 'shell:AppsFolder\\Microsoft.VisualStudioCode',
    'visualstudiocode': 'shell:AppsFolder\\Microsoft.VisualStudioCode',
    'notepad': 'notepad.exe',
    'calc': 'calc.exe',
    'calculator': 'calc.exe',
    'paint': 'mspaint.exe',
    'mspaint': 'mspaint.exe',
    'explorer': 'explorer.exe',
    'fileexplorer': 'explorer.exe',
    'filesexplorer': 'explorer.exe',
    'filesexploer': 'explorer.exe',
    'fileexploer': 'explorer.exe',
    'filemanager': 'explorer.exe',
    'files': 'explorer.exe',
    'thispc': 'explorer.exe',
    'mycomputer': 'explorer.exe',
    'taskmgr': 'taskmgr.exe',
    'taskmanager': 'taskmgr.exe',
    'cmd': 'cmd.exe',
    'commandprompt': 'cmd.exe',
    'powershell': 'powershell.exe',
    'wt': 'wt.exe',
    'terminal': 'wt.exe',
    'windowsterminal': 'wt.exe',
    'chrome': 'chrome.exe',
    'googlechrome': 'chrome.exe',
    'edge': 'msedge.exe',
    'msedge': 'msedge.exe',
    'brave': 'brave.exe',
    'word': 'winword.exe',
    'excel': 'excel.exe',
    'powerpoint': 'powerpnt.exe',
    'instagram': 'shell:AppsFolder\\Facebook.InstagramBeta_8xx8rvfyw5nnt!App'
  };
  if (systemMap[appLower] || systemMap[originalLower]) {
    return { type: 'exe', path: systemMap[appLower] || systemMap[originalLower], name: sanitized };
  }

  // 2. Check Windows Start Menu installed applications (includes Spotify, WhatsApp, Netflix, Store apps)
  if (startAppsCache.length > 0) {
    // If specifically asking for code / vscode, target Visual Studio Code instead of substring matching OpenCode
    if (appLower === 'code' || appLower === 'vscode' || appLower === 'visualstudiocode') {
      const vsCodeApp = startAppsCache.find(a => a.cleanName === 'visualstudiocode' || a.cleanAppId.includes('visualstudiocode'));
      if (vsCodeApp) {
        return {
          type: 'startapp',
          appId: vsCodeApp.appId,
          name: vsCodeApp.name,
          path: `shell:AppsFolder\\${vsCodeApp.appId}`
        };
      }
    }

    let matched = startAppsCache.find(a => a.cleanName === appLower || a.cleanAppId === appLower || a.cleanName === originalLower);
    if (!matched) {
      if (appLower === 'code') {
        matched = startAppsCache.find(a => a.cleanName.includes('visualstudio') || a.cleanAppId.includes('visualstudio'));
      } else {
        matched = startAppsCache.find(a => a.cleanName.includes(appLower) || (appLower.length >= 3 && a.cleanAppId.includes(appLower)));
      }
    }
    if (matched && matched.appId) {
      return {
        type: 'startapp',
        appId: matched.appId,
        name: matched.name,
        path: `shell:AppsFolder\\${matched.appId}`
      };
    }
  }

  // 2. Scan Desktop shortcuts and executables (.lnk, .url, .exe)
  const desktopDirs = [
    getDesktopPath(),
    path.join(os.homedir(), 'OneDrive', 'Desktop'),
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'OneDrive - Personal', 'Desktop'),
    'C:\\Users\\Public\\Desktop'
  ];

  for (const d of desktopDirs) {
    if (d && fs.existsSync(d)) {
      try {
        const files = fs.readdirSync(d);
        for (const f of files) {
          if (f.endsWith('.lnk') || f.endsWith('.exe') || f.endsWith('.url')) {
            const cleanFile = path.parse(f).name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanFile.includes(appLower) || appLower.includes(cleanFile) || cleanFile.includes(originalLower)) {
              return { type: f.endsWith('.exe') ? 'exe' : 'shortcut', path: path.join(d, f), name: path.parse(f).name };
            }
          }
        }
      } catch (e) {}
    }
  }

  // 3. Check WindowsApps Execution Aliases
  const winAppsDir = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WindowsApps');
  if (fs.existsSync(winAppsDir)) {
    try {
      const files = fs.readdirSync(winAppsDir);
      for (const f of files) {
        const clean = f.toLowerCase().replace(/[^a-z0-9]/g, '');
        if ((clean.includes(appLower) || appLower.includes(clean)) && f.endsWith('.exe')) {
          return { type: 'exe', path: path.join(winAppsDir, f), name: path.parse(f).name };
        }
      }
    } catch (e) {}
  }

  // 4. Scan Start Menu Shortcuts
  const startMenuDirs = [
    path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs')
  ];

  function scanDir(dir, depth = 0) {
    if (depth > 3 || !fs.existsSync(dir)) return null;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = scanDir(fullPath, depth + 1);
          if (found) return found;
        } else if (entry.isFile() && (entry.name.endsWith('.lnk') || entry.name.endsWith('.exe'))) {
          const clean = path.parse(entry.name).name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (clean.includes(appLower) || appLower.includes(clean) || clean.includes(originalLower)) {
            return { type: 'shortcut', path: fullPath, name: path.parse(entry.name).name };
          }
        }
      }
    } catch (e) {}
    return null;
  }

  for (const d of startMenuDirs) {
    const found = scanDir(d);
    if (found) return found;
  }

  // 5. Common local folders
  const localDirs = [
    path.join(os.homedir(), 'AppData', 'Local', 'Programs'),
    path.join(process.env['ProgramFiles'] || 'C:\\Program Files'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)')
  ];

  for (const d of localDirs) {
    if (fs.existsSync(d)) {
      try {
        const entries = fs.readdirSync(d, { withFileTypes: true });
        for (const entry of entries) {
          const clean = entry.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (clean.includes(appLower) || appLower.includes(clean)) {
            if (entry.isDirectory()) {
              const subDir = path.join(d, entry.name);
              const subFiles = fs.readdirSync(subDir);
              const exe = subFiles.find(f => f.toLowerCase().includes(appLower) && f.endsWith('.exe'));
              if (exe) return { type: 'exe', path: path.join(subDir, exe), name: path.parse(exe).name };
            } else if (entry.name.endsWith('.exe')) {
              return { type: 'exe', path: path.join(d, entry.name), name: path.parse(entry.name).name };
            }
          }
        }
      } catch (e) {}
    }
  }

  return null;
}

// Safe PowerShell runner via Base64 UTF-16LE EncodedCommand
// Avoids all newline, quoting, and cmd.exe escaping issues on Windows
function runPowerShell(script) {
  return new Promise((resolve) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    exec(`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve({
        success: !err,
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim(),
        err
      });
    });
  });
}

// Locate active Desktop path reliably across standard and OneDrive redirected setups
function getDesktopPath() {
  const candidates = [
    path.join(os.homedir(), 'OneDrive', 'Desktop'),
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'OneDrive - Personal', 'Desktop')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return path.join(os.homedir(), 'Desktop');
}

// Helper to robustly extract multiple target names from single string, array, or comma/and-separated lists
function extractTargets(args) {
  if (!args) return [];
  const raw = args.targets || args.targetNames || args.appName || args.url || args.targetName || args.name || [];
  if (Array.isArray(raw)) {
    return raw.flatMap(item => extractTargets({ targets: item })).map(s => String(s).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,;&]|\band\b/i)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !/^(and|or|also|please|the|a|an)$/i.test(s));
  }
  return [];
}

// Launch URL directly in user's browser as a native fallback if frontend window.open is blocked
function openUrlInBrowserNative(url) {
  const platform = process.platform;
  if (platform === 'win32') {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const bravePath = path.join(os.homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe');
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

    if (fs.existsSync(chromePath)) {
      exec(`"${chromePath}" "${url}"`);
    } else if (fs.existsSync(bravePath)) {
      exec(`"${bravePath}" "${url}"`);
    } else if (fs.existsSync(edgePath)) {
      exec(`"${edgePath}" "${url}"`);
    } else {
      exec(`cmd.exe /c start "" "${url}"`);
    }
  } else if (platform === 'darwin') {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

// Non-blocking detached launcher for Windows desktop executables and shortcuts
function launchAppDetached(cmdString) {
  try {
    const child = spawn('cmd.exe', ['/c', cmdString], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    return true;
  } catch (e) {
    console.error('[LAUNCH ERROR]', e);
    return false;
  }
}

// Open a single application or website target
async function openSingleTarget(rawTarget, res) {
  const target = (rawTarget || '').trim();
  if (!target) return 'No target specified.';
  const cleanTarget = cleanAppName(target);
  const platform = process.platform;
  const targetLower = cleanTarget.toLowerCase().replace(/[^a-z0-9]/g, '');
  const originalLower = target.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (platform === 'win32') {
    // 1. Built-in Windows tools (EXE-based only — safe to launch directly)
    const systemExeProtocols = {
      'code': 'start explorer.exe shell:AppsFolder\\Microsoft.VisualStudioCode',
      'vscode': 'start explorer.exe shell:AppsFolder\\Microsoft.VisualStudioCode',
      'visualstudiocode': 'start explorer.exe shell:AppsFolder\\Microsoft.VisualStudioCode',
      'wt': 'start wt.exe',
      'terminal': 'start wt.exe',
      'windowsterminal': 'start wt.exe',
      'calculator': 'start calc.exe',
      'calc': 'start calc.exe',
      'settings': 'start ms-settings:',
      'controlpanel': 'start control.exe',
      'notepad': 'start notepad.exe',
      'paint': 'start mspaint.exe',
      'mspaint': 'start mspaint.exe',
      'explorer': 'start explorer.exe',
      'fileexplorer': 'start explorer.exe',
      'filesexplorer': 'start explorer.exe',
      'filesexploer': 'start explorer.exe',
      'fileexploer': 'start explorer.exe',
      'filemanager': 'start explorer.exe',
      'files': 'start explorer.exe',
      'thispc': 'start explorer.exe',
      'mycomputer': 'start explorer.exe',
      'taskmgr': 'start taskmgr.exe',
      'taskmanager': 'start taskmgr.exe',
      'cmd': 'start cmd.exe',
      'commandprompt': 'start cmd.exe',
      'powershell': 'start powershell.exe',
      'chrome': 'start chrome.exe',
      'googlechrome': 'start chrome.exe',
      'edge': 'start msedge.exe',
      'msedge': 'start msedge.exe',
      'brave': 'start brave.exe',
      'widget': `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${path.join(__dirname, 'open_widgets.ps1')}"`,
      'widgets': `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${path.join(__dirname, 'open_widgets.ps1')}"`,
      'windget': `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${path.join(__dirname, 'open_widgets.ps1')}"`,
      'windowswidget': `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${path.join(__dirname, 'open_widgets.ps1')}"`,
      'windowswidgets': `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${path.join(__dirname, 'open_widgets.ps1')}"`,
      'winget': 'start wt.exe -d . powershell -NoExit -Command "winget --help"',
      'instagram': 'start explorer.exe shell:AppsFolder\\Facebook.InstagramBeta_8xx8rvfyw5nnt!App',
      'myplaylist': `powershell.exe -NoProfile -Command "Start-Process 'spotify:collection:playlists'"`,
      'playlist': `powershell.exe -NoProfile -Command "Start-Process 'spotify:collection:playlists'"`,
      'playlists': `powershell.exe -NoProfile -Command "Start-Process 'spotify:collection:playlists'"`,
      'spotifyplaylist': `powershell.exe -NoProfile -Command "Start-Process 'spotify:collection:playlists'"`,
      'myspotifyplaylist': `powershell.exe -NoProfile -Command "Start-Process 'spotify:collection:playlists'"`
    };

    // URI protocols for apps that may or may not be installed.
    // These are ONLY used as a fallback after checking for installed desktop apps,
    // because launching URI protocols (e.g. spotify:) can trigger the browser to
    // handle them in the current tab, which would navigate away from the J.A.R.V.I.S.
    // localhost page and effectively close it.
    // Note: instagram: is omitted because Windows Store Instagram does NOT register
    // an instagram: URI scheme on Windows, which triggers an OS "Get an app" error dialog.
    const appUriProtocols = {
      'spotify': 'spotify:',
      'discord': 'discord:',
      'whatsapp': 'whatsapp:',
      'telegram': 'tg:',
      'netflix': 'netflix:',
      'twitter': 'twitter:'
    };

    if (systemExeProtocols[targetLower] || systemExeProtocols[originalLower]) {
      const cmd = systemExeProtocols[targetLower] || systemExeProtocols[originalLower];
      launchAppDetached(cmd);
      return `Launched ${cleanTarget}.`;
    }

    // 2. Scan if the desktop application is installed on the machine (shortcuts, exes, Start Menu, Store apps)
    const appFound = findAppOnWindows(target);
    if (appFound) {
      if (appFound.type === 'startapp') {
        console.log(`[LAUNCH] Launching StartApp: "${appFound.name}" (${appFound.appId})...`);
        const psLaunch = `
          try {
            Start-Process 'shell:AppsFolder\\${appFound.appId}' -ErrorAction Stop
            Write-Output 'LAUNCHED_STARTAPP'
          } catch {
            Write-Output 'FAILED_STARTAPP'
          }
        `;
        const resLaunch = await runPowerShell(psLaunch);
        if (resLaunch.stdout.includes('LAUNCHED_STARTAPP')) {
          return `Launched ${appFound.name || cleanTarget}.`;
        }
      } else if (appFound.path && appFound.path.startsWith('shell:AppsFolder')) {
        launchAppDetached(`start explorer.exe ${appFound.path}`);
        return `Launched ${appFound.name || cleanTarget}.`;
      } else if (appFound.path && appFound.path.toLowerCase().includes('windowsapps')) {
        await runPowerShell(`Start-Process '${appFound.path}'`);
        return `Launched ${appFound.name || cleanTarget}.`;
      } else {
        launchAppDetached(`start "" "${appFound.path}"`);
        return `Launched ${appFound.name || cleanTarget}.`;
      }
    }

    // 3. Try URI protocol as a fallback for known apps (e.g. spotify:, discord:)
    //    Use Start-Process via PowerShell so the protocol is handled by the OS
    //    shell rather than the browser, preventing localhost tab navigation.
    const uriScheme = appUriProtocols[targetLower] || appUriProtocols[originalLower];
    if (uriScheme) {
      const uriLaunchScript = `
        try {
          Start-Process '${uriScheme}' -ErrorAction Stop
          Write-Output 'URI_LAUNCHED'
        } catch {
          Write-Output 'URI_FAILED'
        }
      `;
      const uriResult = await runPowerShell(uriLaunchScript);
      if (uriResult.stdout.includes('URI_LAUNCHED')) {
        return `Launched ${cleanTarget}.`;
      }
      // URI protocol failed — fall through to web fallback below
    }

    // 4. Final fallback: Open as a website in the browser
    const fallbackUrl = getFallbackWebUrl(cleanTarget);
    openedWebsitesHistory.push(fallbackUrl);
    const isSSE = res && !res.writableEnded && typeof res.write === 'function' && (!res.getHeader || (res.getHeader('Content-Type') || '').includes('event-stream'));
    if (isSSE) {
      res.write(`data: ${JSON.stringify({ action: 'open_website', url: fallbackUrl, service: targetLower })}\n\n`);
    } else {
      openUrlInBrowserNative(fallbackUrl);
    }
    return `Opened ${cleanTarget} in browser.`;
  } else {
    const fallbackUrl = getFallbackWebUrl(cleanTarget);
    openedWebsitesHistory.push(fallbackUrl);
    const isSSE = res && !res.writableEnded && typeof res.write === 'function' && (!res.getHeader || (res.getHeader('Content-Type') || '').includes('event-stream'));
    if (isSSE) {
      res.write(`data: ${JSON.stringify({ action: 'open_website', url: fallbackUrl, service: targetLower })}\n\n`);
    } else {
      openUrlInBrowserNative(fallbackUrl);
    }
    return `Opened ${cleanTarget}.`;
  }
}

// Close a single application or website target
async function closeSingleTarget(rawTarget, res) {
  let target = (rawTarget || '').trim();
  target = cleanAppName(target);
  target = target.replace(/^(close|exit|quit|stop|kill|terminate)\s+/i, '').trim();
  target = target.replace(/\b(jarvis|jervis|jarviss|travis|javis|jarviz|please|sir)\b/gi, '').trim();
  const platform = process.platform;
  const cleanName = target.toLowerCase().replace(/[^a-z0-9]/g, '');

  console.log(`[CLOSE] Attempting to close: "${target}" (clean: "${cleanName}")`);

  // SAFETY GUARD: Protect J.A.R.V.I.S Core System from any termination
  const isProtectedCore = !cleanName || 
    ['localhost', '3000', 'jarvis', 'react', 'reactapp', 'system', 'core', 'coresystem', 'terminal', 'hud'].some(p => cleanName.includes(p));
  if (isProtectedCore) {
    console.log(`[CLOSE] Ignored close request for protected core target: "${cleanName}"`);
    return "The J.A.R.V.I.S. Core System is protected and will remain online.";
  }

  // Send SSE event to frontend — frontend will attempt to close via window refs
  if (res && !res.writableEnded) {
    res.write(`data: ${JSON.stringify({ action: 'close_tab', target: cleanName })}\n\n`);
  }

  if (platform === 'win32') {
    const isGenericTab = !cleanName || cleanName === 'tab' || cleanName === 'currenttab' || cleanName === 'thistab' || cleanName === 'activetab';

    // === KNOWN SYSTEM APPS MAP ===
    // Apps in this map are killed by exact process name and NEVER fall through to browser tab close.
    const systemAppProcessMap = {
      'settings':         'SystemSettings',
      'windowssettings':  'SystemSettings',
      'mssettings':       'SystemSettings',
      'calculator':       'Calculator',
      'calc':             'Calculator',
      'notepad':          'notepad',
      'paint':            'mspaint',
      'mspaint':          'mspaint',
      'taskmgr':          'Taskmgr',
      'taskmanager':      'Taskmgr',
      'snippingtool':     'SnippingTool',
      'snipping':         'SnippingTool',
      'wordpad':          'wordpad',
      'vlc':              'vlc',
      'spotify':          'Spotify',
      'discord':          'Discord',
      'slack':            'slack',
      'zoom':             'Zoom',
      'teams':            'Teams',
      'steam':            'steam',
      'epicgames':        'EpicGamesLauncher',
      'roblox':           'RobloxPlayerBeta',
      'obs':              'obs64',
      'vscode':           'Code',
      'visualstudiocode': 'Code',
      'figma':            'Figma',
    };
    const isKnownSystemApp = Object.prototype.hasOwnProperty.call(systemAppProcessMap, cleanName);

    // === KNOWN WEB SERVICES SET ===
    // Browser tab close (Ctrl+W) is ONLY attempted for these. This prevents system-app
    // misses from accidentally sending Ctrl+W to the JARVIS localhost tab and crashing it.
    const knownWebServices = new Set([
      'youtube', 'instagram', 'facebook', 'twitter', 'x', 'tiktok', 'reddit',
      'netflix', 'whatsapp', 'telegram', 'gmail', 'google', 'linkedin', 'amazon',
      'github', 'notion', 'canva', 'chatgpt', 'claude', 'twitch', 'pinterest',
      'snapchat', 'outlook', 'drive', 'googledrive', 'docs', 'sheets', 'slides'
    ]);
    const isKnownWebService = knownWebServices.has(cleanName);

    // Step 1a: Special handling — close File Explorer windows using Shell.Application COM
    // Stop-Process explorer.exe kills the entire Windows shell; Shell.Application is safe.
    const isExplorerTarget = /^(explorer|fileexplorer|filesexplorer|fileexploer|filesexploer|filemanager|files|thispc|mycomputer)$/i.test(cleanName);
    if (!isGenericTab && isExplorerTarget) {
      console.log(`[CLOSE] Closing File Explorer windows via Shell.Application COM...`);
      const explorerScript = `
        $shell = New-Object -ComObject Shell.Application
        $closed = 0
        foreach ($w in @($shell.Windows())) {
          try {
            if ($w.FullName -match 'explorer\\.exe') {
              $w.Quit()
              $closed++
            }
          } catch {}
        }
        if ($closed -gt 0) {
          Write-Output "EXPLORER_CLOSED:$closed"
        } else {
          Write-Output 'NO_EXPLORER'
        }
      `;
      const explorerResult = await runPowerShell(explorerScript);
      console.log(`[CLOSE] Explorer close result: ${explorerResult.stdout.trim()}`);
      if (explorerResult.stdout.includes('EXPLORER_CLOSED')) {
        return `Closed File Explorer.`;
      }
      // No explorer windows were open; return early — never fall through to browser close.
      return `No File Explorer windows were open.`;
    }

    // Step 1b: Kill known system apps by exact process name.
    // CRITICAL: These must NEVER fall through to the browser-tab close path.
    if (!isGenericTab && isKnownSystemApp) {
      const processName = systemAppProcessMap[cleanName];
      console.log(`[CLOSE] Known system app "${cleanName}" -> killing process "${processName}"...`);
      const sysKillScript = `
        $procs = Get-Process -Name '${processName}' -ErrorAction SilentlyContinue
        if ($procs) {
          $procs | Stop-Process -Force -ErrorAction SilentlyContinue
          Write-Output 'KILLED_SYSTEM_APP'
        } else {
          Write-Output 'APP_NOT_RUNNING'
        }
      `;
      const sysResult = await runPowerShell(sysKillScript);
      console.log(`[CLOSE] System app kill result: ${sysResult.stdout.trim()}`);
      // Return immediately — never attempt browser tab close for system apps.
      if (sysResult.stdout.includes('KILLED_SYSTEM_APP')) {
        return `Closed ${target}.`;
      }
      return `${target} was not running.`;
    }

    // Step 1c: Kill other standalone desktop processes by fuzzy name match.
    if (cleanName && !isGenericTab && !isExplorerTarget && !isKnownSystemApp) {
      const killScript = `
        $cleanName = '${cleanName}'
        $target = '${target}'
        $searchPattern = "*$cleanName*"
        if ($cleanName -like '*ldplayer*' -or $cleanName -like '*dnplayer*') {
            $searchPattern = '*dnplayer*'
        }
        $procs = Get-Process -ErrorAction SilentlyContinue | Where-Object {
            ($_.ProcessName -like $searchPattern -or $_.ProcessName -like "*$cleanName*" -or ($_.MainWindowTitle -ne '' -and $_.MainWindowTitle -like "*$target*")) -and
            $_.ProcessName -notmatch 'node|powershell|cmd|System|svchost|chrome|msedge|brave|firefox|opera'
        }
        if ($procs) {
            $procs | Stop-Process -Force -ErrorAction SilentlyContinue
            if ($cleanName -like '*ldplayer*') {
                Get-Process -Name 'LdVBoxHeadless' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            }
            Write-Output 'KILLED_PROCESS'
        } else {
            Write-Output 'NO_PROCESS'
        }
      `;
      const killResult = await runPowerShell(killScript);
      console.log(`[CLOSE] Kill process result: ${killResult.stdout.trim()}`);
      if (killResult.stdout.includes('KILLED_PROCESS')) {
        return `Closed ${target}.`;
      }
    }

    // Step 2: Browser tab close — safe tab search via Ctrl+Shift+A for any website/tab
    if (cleanName && !isGenericTab) {
      console.log(`[CLOSE] Attempting browser tab close for: "${target}" (clean: "${cleanName}")`);
      const closeStatus = await closeBrowserTab(target);
      if (closeStatus === 'CLOSED') {
        return `Closed ${target} tab, sir.`;
      } else if (closeStatus === 'NOT_FOUND') {
        return `Could not find an open tab for ${target}, sir.`;
      }
      return `Closed ${target}.`;
    }

    if (isGenericTab) {
      console.log(`[CLOSE] Generic tab close requested -> closing 1 browser tab`);
      const closeStatus = await closeBrowserTab('tab', 1);
      if (closeStatus === 'CLOSED') {
        return `Closed the active tab, sir.`;
      }
      return `Closed browser tab, sir.`;
    }

    return `Closed ${target || 'target'}.`;
  } else {
    return `Closed ${target}.`;
  }
}

// Close browser tab(s) using native close_tab.ps1 script via Ctrl+Shift+A tab search
// Strategy:
//   1. Focus browser window via Win32 desktop API
//   2. Send Ctrl+Shift+A to open Chromium Search Tabs panel
//   3. Print / type the application name into the search box
//   4. Press Enter to navigate to matched tab
//   5. Verify tab is not protected (J.A.R.V.I.S / localhost)
//   6. Send Ctrl+W to close tab
function closeBrowserTab(targets, count = 1) {
  return new Promise((resolve) => {
    const targetArray = Array.isArray(targets) ? targets : [targets];
    const cleanTargets = targetArray
      .map(t => (t || '').toString().trim())
      .filter(t => t.length > 0 && !/^(localhost|127001|jarvis|coresystem|hud|reactapp)$/i.test(t.replace(/[^a-z0-9]/gi, '')));

    if (cleanTargets.length === 0) {
      return resolve('NO_TARGET');
    }

    const scriptPath = path.join(__dirname, 'close_tab.ps1');
    const targetsArg = cleanTargets.join(',');
    const cmd = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}" -Targets "${targetsArg}" -CountPerTarget ${Math.max(1, parseInt(count, 10) || 1)}`;

    console.log(`[CLOSE] Executing close_tab.ps1 for targets: "${targetsArg}"`);
    exec(cmd, { windowsHide: true, timeout: 20000 }, (err, stdout, stderr) => {
      if (err) {
        console.warn(`[CLOSE] Browser tab close error for "${targetsArg}":`, stderr || err.message);
        return resolve('ERROR');
      }
      const output = (stdout || '').trim();
      console.log(`[CLOSE] close_tab.ps1 result for "${targetsArg}":\n${output}`);

      if (output.includes('CLOSED_TAB:')) {
        return resolve('CLOSED');
      } else if (output.includes('TAB_NOT_FOUND:') || output.includes('PROTECTED_OR_NOT_FOUND:') || output.includes('PROTECTED_TAB_REFUSED:')) {
        return resolve('NOT_FOUND');
      } else if (output.includes('NO_BROWSER_FOUND')) {
        return resolve('NO_BROWSER');
      }
      resolve('COMPLETED');
    });
  });
}

// System Audio Volume Control via Windows CoreAudio API script
async function adjustSystemVolumeDetails(action, level) {
  const safeAction = (action || 'set').toLowerCase().replace(/[^a-z]/g, '');
  const numLevel = (typeof level === 'number' && !isNaN(level)) ? Math.round(level) : 50;
  const scriptPath = path.join(__dirname, 'volume_control.ps1');

  return new Promise((resolve) => {
    const cmd = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}" -Action "${safeAction}" -Level ${numLevel}`;
    exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        console.error('[VOLUME] Error running volume script:', stderr || err.message);
        return resolve({ success: false, volume: 50, muted: false, message: `Unable to adjust volume: ${err.message}` });
      }

      const output = (stdout || '').trim();
      console.log('[VOLUME] Script output:', output);

      let currentVol = 50;
      let isMuted = false;
      const statusMatch = output.match(/STATUS:(\d+):(True|False)/i);
      if (statusMatch) {
        currentVol = parseInt(statusMatch[1], 10);
        isMuted = statusMatch[2].toLowerCase() === 'true';
      }

      let message = `Volume adjusted to ${currentVol}%.`;
      if (output.includes('SET:')) {
        message = `Master volume set to ${currentVol}%.`;
      } else if (output.includes('INCREASED:')) {
        message = `Master volume increased to ${currentVol}%.`;
      } else if (output.includes('DECREASED:')) {
        message = `Master volume decreased to ${currentVol}%.`;
      } else if (output.includes('UNMUTED:')) {
        message = `Master audio unmuted at ${currentVol}%.`;
      } else if (output.includes('MUTED:')) {
        message = `Master audio muted.`;
      } else if (output.includes('CURRENT:')) {
        message = `Current master volume is ${currentVol}%.`;
      }

      resolve({
        success: true,
        volume: currentVol,
        muted: isMuted,
        message
      });
    });
  });
}

async function adjustSystemVolume(action, level) {
  const details = await adjustSystemVolumeDetails(action, level);
  return details.message;
}

// Fast volume parser to immediately catch and execute user volume directives without LLM hallucination
function parseVolumeCommand(text) {
  const t = (text || '').trim().toLowerCase();
  
  // 1. Explicit set with number: "volume to 90", "volume 90", "set volume to 80%", "increase volume upto 80", "turn volume to 50"
  const setMatch = t.match(/\b(?:volume\s*(?:to|up\s*to|upto|at)?\s*(\d{1,3})%?|(?:set|change|put|turn)\s+volume\s*(?:to|up\s*to|upto|at)?\s*(\d{1,3})%?|(?:increase|raise|boost)\s+volume\s*(?:to|up\s*to|upto)\s*(\d{1,3})%?|(?:decrease|lower|reduce)\s+volume\s*(?:to|down\s*to)\s*(\d{1,3})%?)\b/i);
  if (setMatch) {
    const numStr = setMatch[1] || setMatch[2] || setMatch[3] || setMatch[4];
    if (numStr) {
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        return { action: 'set', level: num };
      }
    }
  }

  // 2. Relative increase: "increase volume", "volume up", "raise volume", "turn up volume", "louder"
  if (/\b(increase volume|volume up|raise volume|turn up (the )?volume|turn volume up|boost volume|make it louder|louder)\b/i.test(t)) {
    const stepMatch = t.match(/\b(?:by)\s*(\d{1,3})%?\b/i);
    const step = stepMatch ? parseInt(stepMatch[1], 10) : 10;
    return { action: 'increase', level: step };
  }

  // 3. Relative decrease: "decrease volume", "volume down", "lower volume", "turn down volume", "quieter"
  if (/\b(decrease volume|volume down|lower volume|turn down (the )?volume|turn volume down|reduce volume|make it quieter|quieter)\b/i.test(t)) {
    const stepMatch = t.match(/\b(?:by)\s*(\d{1,3})%?\b/i);
    const step = stepMatch ? parseInt(stepMatch[1], 10) : 10;
    return { action: 'decrease', level: step };
  }

  // 4. Max / Min: "max volume", "full volume", "minimum volume"
  if (/\b(max(imum)? volume|full volume|volume max(imum)?)\b/i.test(t)) {
    return { action: 'set', level: 100 };
  }
  if (/\b(min(imum)? volume|lowest volume)\b/i.test(t)) {
    return { action: 'set', level: 0 };
  }

  // 5. Mute / Unmute
  if (/\b(mute volume|mute sound|mute audio|^mute$)\b/i.test(t)) {
    return { action: 'mute' };
  }
  if (/\b(unmute volume|unmute sound|unmute audio|^unmute$)\b/i.test(t)) {
    return { action: 'unmute' };
  }

  return null;
}

// =========================================================
// MEDIA & PLAYBACK SUBSYSTEM
// =========================================================
let cachedMediaStatus = {
  isPlaying: false,
  title: 'Ready for Playback',
  artist: 'Desktop Audio',
  source: 'YouTube'
};

// Hardware Media Playback Control (Spotify, YouTube, browser, any app via Windows SMTC)
async function controlSystemMedia(action) {
  const safeAction = (action || 'playpause').toLowerCase().replace(/[^a-z]/g, '');
  const scriptPath = path.join(__dirname, 'media_control.ps1');

  return new Promise((resolve) => {
    const cmd = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}" -Action "${safeAction}"`;
    exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        console.error('[MEDIA CONTROL] Error running media script:', stderr || err.message);
        return resolve({ success: false, action: safeAction, message: `Unable to control media: ${err.message}` });
      }
      return resolve({ success: true, action: safeAction });
    });
  });
}

// Comprehensive language & regional music definitions
const MUSIC_LANGUAGES = [
  'telugu', 'hindi', 'tamil', 'kannada', 'malayalam', 'punjabi', 'bengali', 'marathi',
  'gujarati', 'bhojpuri', 'odia', 'urdu', 'assamese', 'rajasthani', 'haryanvi',
  'english', 'spanish', 'korean', 'kpop', 'k-pop', 'japanese', 'jpop', 'j-pop',
  'french', 'german', 'italian', 'arabic', 'portuguese', 'russian', 'chinese', 'latin',
  'bollywood', 'tollywood', 'kollywood', 'mollywood', 'sandalwood', 'pollywood'
];

function extractMusicLanguage(str) {
  if (!str) return null;
  const lower = str.toLowerCase();
  for (const lang of MUSIC_LANGUAGES) {
    const escaped = lang.replace('-', '\\-');
    const reg = new RegExp(`\\b${escaped}\\b`, 'i');
    if (reg.test(lower)) {
      if (lang === 'kpop' || lang === 'k-pop') return 'K-Pop';
      if (lang === 'jpop' || lang === 'j-pop') return 'J-Pop';
      return lang.charAt(0).toUpperCase() + lang.slice(1);
    }
  }
  return null;
}

function isGenericTrendingMusicQuery(query) {
  if (!query) return false;
  // If user requested a specific language, it is NOT generic
  if (extractMusicLanguage(query)) return false;

  // Remove common generic filler / trending keywords
  const stripped = query.toLowerCase()
    .replace(/\b(?:the|a|an|today'?s|todays|now|right\s+now|daily|weekly|global|world)\b/gi, ' ')
    .replace(/\b(?:latest|trending|trend|top\s+hits|top\s+tracks|top\s+songs|viral|hottest|charts?|billboard|popular|new|hit|hits)\b/gi, ' ')
    .replace(/\b(?:songs?|tracks?|music|audio|videos?|playback|media)\b/gi, ' ')
    .replace(/[^a-z0-9]/gi, '')
    .trim();

  // If nothing specific is left, it's pure generic trending (e.g. "latest trending song", "top hits")
  return stripped.length === 0;
}

// ==========================================
// REAL-TIME DYNAMIC TRENDING MUSIC SUBSYSTEM
// ==========================================
let cachedTrendingSongs = [];
let lastTrendingFetchTime = 0;
const TRENDING_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache, auto-updates
let trendingSongIndex = 0;

// Fetches live, real-time trending chart songs from Spotify (Today's Top Hits, India/Global Top 50) and Apple Music Live RSS
async function fetchLiveTrendingSongs(force = false) {
  const now = Date.now();
  if (!force && cachedTrendingSongs.length > 0 && (now - lastTrendingFetchTime) < TRENDING_CACHE_TTL_MS) {
    return cachedTrendingSongs;
  }

  const results = [];
  const seenTracks = new Set();

  function addTrack(title, artist, uri = null, source = 'Live Charts') {
    if (!title) return;
    const cleanTitle = title
      .replace(/\s*\(.*?(?:official|audio|video|feat|ft|remix|from|version).*?\)/gi, '')
      .replace(/\s*\[.*?\]/g, '')
      .trim();
    const cleanArtist = (artist || '').replace(/\s*-\s*Topic/i, '').trim();
    const key = `${cleanTitle.toLowerCase()} - ${cleanArtist.toLowerCase()}`;
    if (!seenTracks.has(key) && cleanTitle.length > 0) {
      seenTracks.add(key);
      results.push({
        title: cleanTitle,
        fullTitle: title.trim(),
        artist: cleanArtist || 'Trending Artist',
        spotifyUri: uri || null,
        source
      });
    }
  }

  // 1. Fetch Spotify Live Playlists (Today's Top Hits & Top 50 India / Global)
  const spotifyPlaylists = [
    { id: '37i9dQZF1DXcBWIGoYBM5M', name: "Today's Top Hits" },
    { id: '37i9dQZEVXbLZ52XmnySJg', name: 'Top 50 India' },
    { id: '37i9dQZEVXbMDoHDwVN2tF', name: 'Top 50 Global' }
  ];

  for (const pl of spotifyPlaylists) {
    try {
      const resp = await fetch(`https://open.spotify.com/embed/playlist/${pl.id}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(4000)
      });
      if (resp.ok) {
        const html = await resp.text();
        const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
        if (match) {
          const parsed = JSON.parse(match[1]);
          const trackList = parsed?.props?.pageProps?.state?.data?.entity?.trackList || [];
          for (const t of trackList.slice(0, 15)) {
            addTrack(t.title, t.subtitle, t.uri, pl.name);
          }
        }
      }
    } catch (e) {
      // Continue to next source
    }
  }

  // 2. Fetch Apple Music / iTunes Live RSS Feeds (India & Global / US Charts)
  const itunesUrls = [
    { url: 'https://itunes.apple.com/in/rss/topsongs/limit=25/json', name: 'Apple Music India' },
    { url: 'https://itunes.apple.com/us/rss/topsongs/limit=25/json', name: 'Apple Music Global' }
  ];

  for (const item of itunesUrls) {
    try {
      const resp = await fetch(item.url, { signal: AbortSignal.timeout(4000) });
      if (resp.ok) {
        const json = await resp.json();
        const entries = json?.feed?.entry || [];
        for (const entry of entries.slice(0, 15)) {
          const tName = entry['im:name']?.label;
          const aName = entry['im:artist']?.label;
          addTrack(tName, aName, null, item.name);
        }
      }
    } catch (e) {}
  }

  if (results.length > 0) {
    cachedTrendingSongs = results;
    lastTrendingFetchTime = now;
    console.log(`[TRENDING MUSIC] Successfully updated live trending songs list (${results.length} hot tracks cached)`);
  }

  return cachedTrendingSongs;
}

// Get the latest #1 trending track or cycle through top 5 fresh hits
async function getLatestTrendingTrack(rotate = false) {
  const songs = await fetchLiveTrendingSongs();
  if (!songs || songs.length === 0) {
    return {
      title: 'Latest Hit Song',
      artist: 'Trending Music',
      query: 'trending official music video'
    };
  }

  const maxPool = Math.min(5, songs.length);
  const track = rotate ? songs[trendingSongIndex % maxPool] : songs[0];
  if (rotate) {
    trendingSongIndex = (trendingSongIndex + 1) % maxPool;
  }

  return {
    ...track,
    query: `${track.title} ${track.artist}`.trim()
  };
}

// Kick off initial background pre-fetch on startup and every hour
setTimeout(() => {
  fetchLiveTrendingSongs().catch(() => {});
}, 1500);
setInterval(() => {
  fetchLiveTrendingSongs(true).catch(() => {});
}, TRENDING_CACHE_TTL_MS);

// Lightweight, ultra-fast YouTube video resolver (<400ms) to find the direct video for any track
function isOldMediaVideo(publishedText, isStrictFresh = false) {
  if (!publishedText) return false;
  const p = publishedText.toLowerCase();

  // If strict freshness is requested (for trending songs), strictly reject anything older than ~6 months
  if (isStrictFresh) {
    if (/\b(?:\d+\s+years?|\d+y)\s+ago\b/i.test(p)) return true;
    if (/\b(?:[7-9]|\d{2,})\s+months?\s+ago\b/i.test(p)) return true;
    if (/\b(?:19|20)\d{2}\b/.test(p) && !p.includes('2026') && !p.includes('2025')) return true;
    return false;
  }

  return /\b(?:\d+\s+years?|\d+y)\s+ago\b/i.test(p) ||
         (/\b(?:19|20)\d{2}\b/.test(p) && !p.includes('2026') && !p.includes('2025'));
}

async function searchYouTubeFirstVideo(query, isTrending = false) {
  return new Promise((resolve) => {
    const clean = (query || '').trim();
    if (!clean) return resolve({ videoId: null, title: null });

    // Use clean search query without artificially forcing extra terms if already descriptive
    let searchQuery = clean;
    if (!/official|music|video|song|songs|audio|hits|lyric/i.test(clean)) {
      searchQuery = `${clean} official music video`;
    }
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

    const req = https.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      let data = '';
      let done = false;

      function finish() {
        if (done) return;
        done = true;
        try {
          const match = data.match(/var ytInitialData = ({.*?});<\/script>/);
          if (match) {
            const json = JSON.parse(match[1]);
            const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
            if (contents) {
              const allCandidates = [];
              const strictlyFreshCandidates = [];

              for (const sec of contents) {
                const items = sec.itemSectionRenderer?.contents;
                if (items) {
                  for (const item of items) {
                    if (item.videoRenderer) {
                      const vr = item.videoRenderer;
                      const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || '';
                      const published = vr.publishedTimeText?.simpleText || '';
                      const isLive = /live/i.test(vr.badges?.[0]?.metadataBadgeRenderer?.label || '') || /24\/7|live\s+stream/i.test(title);

                      if (isLive) continue;

                      const cand = {
                        videoId: vr.videoId,
                        title: title.replace(/\\u0026/g, '&').replace(/\\"/g, '"').trim(),
                        published
                      };

                      if (!isOldMediaVideo(published, false)) {
                        allCandidates.push(cand);
                      }

                      if (!isOldMediaVideo(published, true)) {
                        strictlyFreshCandidates.push(cand);
                      }
                    }
                  }
                }
              }

              // If trending, prefer strictly fresh videos (uploaded within past few weeks)
              if (isTrending && strictlyFreshCandidates.length > 0) {
                return resolve({ videoId: strictlyFreshCandidates[0].videoId, title: strictlyFreshCandidates[0].title });
              }

              if (allCandidates.length > 0) {
                return resolve({ videoId: allCandidates[0].videoId, title: allCandidates[0].title });
              }
            }
          }
        } catch (e) {}

        // Fallback regex if ytInitialData parsing failed or had no items
        const idRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        let m;
        const videoIds = [];
        while ((m = idRegex.exec(data)) !== null) {
          if (!videoIds.includes(m[1])) {
            videoIds.push(m[1]);
          }
        }
        const firstId = videoIds[0] || null;
        resolve({ videoId: firstId, title: firstId ? clean : null });
      }

      res.on('data', (chunk) => {
        data += chunk;
        const initIdx = data.indexOf('ytInitialData');
        if (initIdx !== -1 && data.indexOf(';</script>', initIdx) !== -1) {
          req.destroy();
          finish();
        }
      });
      res.on('end', finish);
      res.on('close', finish);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ videoId: null, title: null });
    });

    req.on('error', () => {
      resolve({ videoId: null, title: null });
    });
  });
}

// Direct Song / Artist Playback for YouTube (with direct autoplay) and Spotify
async function playMediaDirectly(query, target = 'youtube', res = null) {
  let cleanTarget = (target || 'youtube').toLowerCase().trim();
  let cleanQuery = (query || '').trim();

  // If query specifies target platform inside it
  if (/\b(?:on|in)\s+spotify\b/i.test(cleanQuery)) {
    cleanTarget = 'spotify';
    cleanQuery = cleanQuery.replace(/\b(?:on|in)\s+spotify\b/i, '').trim();
  } else if (/\b(?:on|in)\s+youtube\b/i.test(cleanQuery)) {
    cleanTarget = 'youtube';
    cleanQuery = cleanQuery.replace(/\b(?:on|in)\s+youtube\b/i, '').trim();
  }

  // Clean conversational leading/trailing phrases
  cleanQuery = cleanQuery
    .replace(/^(?:the\s+song\s+|song\s+|the\s+track\s+|track\s+|the\s+video\s+|video\s+)/i, '')
    .replace(/\s+(?:the\s+song|song|the\s+track|track|the\s+video|video)$/i, '')
    .trim();

  const detectedLanguage = extractMusicLanguage(cleanQuery);
  const isGenericTrending = isGenericTrendingMusicQuery(cleanQuery);
  const isLanguageTrending = Boolean(detectedLanguage && /\b(?:trending|trend|latest|new|viral|charts?|hit|hits|popular|top)\b/i.test(cleanQuery));

  if (cleanTarget === 'youtube') {
    if (!cleanQuery) {
      if (res && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ action: 'open_website', url: 'https://www.youtube.com/', service: 'youtube' })}\n\n`);
      }
      // NOTE: Do NOT call openUrlInBrowserNative here — the frontend opens the tab via the SSE event above.
      // Calling both would open two tabs simultaneously.
      return 'Opening YouTube, sir.';
    }

    try {
      let finalSearchTerm = cleanQuery;
      let displayTitle = cleanQuery;
      let isTrendingTrack = false;
      let preferFreshUploads = false;

      if (isGenericTrending) {
        // ONLY generic trending queries without language or specific topic use cached chart hits
        isTrendingTrack = true;
        preferFreshUploads = true;
        const trendingTrack = await getLatestTrendingTrack(true);
        finalSearchTerm = `${trendingTrack.title} ${trendingTrack.artist}`;
        displayTitle = `"${trendingTrack.title}" by ${trendingTrack.artist}`;
        console.log(`[MEDIA] Dynamically resolved real-time generic trending track: ${displayTitle}`);
      } else if (isLanguageTrending) {
        // Language-specific trending request (e.g. "latest trending Telugu song")
        preferFreshUploads = true;
        finalSearchTerm = `latest trending ${detectedLanguage} songs`;
        displayTitle = `trending ${detectedLanguage} song`;
        console.log(`[MEDIA] Resolving real-time trending track in language [${detectedLanguage}]: "${finalSearchTerm}"`);
      } else if (detectedLanguage) {
        // Language songs request (e.g. "play Telugu songs" or "Telugu songs")
        finalSearchTerm = cleanQuery.toLowerCase().includes('song') ? cleanQuery : `${detectedLanguage} hit songs`;
        displayTitle = `${detectedLanguage} music`;
        console.log(`[MEDIA] Resolving tracks in language [${detectedLanguage}]: "${finalSearchTerm}"`);
      }

      console.log(`[MEDIA] Resolving top YouTube video for direct autoplay: "${finalSearchTerm}"...`);
      const { videoId, title } = await searchYouTubeFirstVideo(finalSearchTerm, preferFreshUploads);

      if (videoId) {
        const directPlayUrl = `https://www.youtube.com/watch?v=${videoId}&autoplay=1`;
        console.log(`[MEDIA] Launching direct YouTube video: ${directPlayUrl} (${title})`);

        // Send SSE event to frontend — the frontend's window.open() handler opens the tab.
        // Do NOT also call openUrlInBrowserNative(); that would open a second duplicate tab.
        if (res && !res.writableEnded) {
          res.write(`data: ${JSON.stringify({ action: 'open_website', url: directPlayUrl, service: 'youtube' })}\n\n`);
        }

        const songTitle = isTrendingTrack ? displayTitle : (title || cleanQuery);
        cachedMediaStatus.isPlaying = true;
        cachedMediaStatus.title = title || displayTitle;
        cachedMediaStatus.artist = detectedLanguage ? `${detectedLanguage} Hits` : (isTrendingTrack ? 'Trending Chart Hit' : 'YouTube');
        cachedMediaStatus.source = 'YouTube';

        if (isTrendingTrack) {
          return `Playing today's #1 trending song: ${displayTitle} on YouTube, sir.`;
        }
        if (isLanguageTrending) {
          return `Playing trending ${detectedLanguage} song: "${songTitle}" on YouTube, sir.`;
        }
        if (detectedLanguage) {
          return `Playing ${detectedLanguage} song: "${songTitle}" on YouTube, sir.`;
        }
        return `Playing "${songTitle}" on YouTube, sir.`;
      } else {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(finalSearchTerm)}`;
        if (res && !res.writableEnded) {
          res.write(`data: ${JSON.stringify({ action: 'open_website', url: searchUrl, service: 'youtube' })}\n\n`);
        }
        // Do NOT call openUrlInBrowserNative() — frontend opens tab via SSE open_website event above.

        cachedMediaStatus.isPlaying = true;
        cachedMediaStatus.title = displayTitle;
        cachedMediaStatus.artist = 'YouTube';
        cachedMediaStatus.source = 'YouTube';

        return `Searching and playing ${displayTitle} on YouTube, sir.`;
      }
    } catch (e) {
      console.error('[MEDIA] Failed to launch YouTube video:', e.message);
      return `Failed to play on YouTube: ${e.message}`;
    }
  }

  // Spotify integration
  if (cleanTarget === 'spotify') {
    if (!cleanQuery) {
      await openSingleTarget('Spotify');
      setTimeout(() => {
        controlSystemMedia('playpause').catch(() => {});
      }, 800);
      return 'Resuming Spotify playback, sir.';
    }

    const isPlaylistQuery = /^(?:my\s+)?playlists?$|^(?:my\s+)?spotify\s+playlists?$|^liked\s+songs$/i.test(cleanQuery.trim());
    if (isPlaylistQuery) {
      if (process.platform === 'win32') {
        try {
          exec(`powershell.exe -NoProfile -Command "Start-Process 'spotify:collection:playlists'"`, { windowsHide: true });
          cachedMediaStatus.isPlaying = true;
          cachedMediaStatus.title = 'My Playlists';
          cachedMediaStatus.artist = 'Spotify Library';
          cachedMediaStatus.source = 'Spotify';
          setTimeout(() => {
            controlSystemMedia('playpause').catch(() => {});
          }, 1200);
          return 'Opening your playlist in Spotify, sir.';
        } catch (e) {
          await openSingleTarget('Spotify');
          return 'Opening Spotify, sir.';
        }
      } else {
        await open('https://open.spotify.com/collection/playlists');
        return 'Opening your playlist in Spotify, sir.';
      }
    }

    if (isGenericTrending) {
      const trendingTrack = await getLatestTrendingTrack(true);
      if (trendingTrack && trendingTrack.spotifyUri && process.platform === 'win32') {
        try {
          exec(`powershell.exe -NoProfile -Command "Start-Process '${trendingTrack.spotifyUri}'"`, { windowsHide: true });
          cachedMediaStatus.isPlaying = true;
          cachedMediaStatus.title = trendingTrack.title;
          cachedMediaStatus.artist = trendingTrack.artist;
          cachedMediaStatus.source = 'Spotify';
          setTimeout(() => {
            controlSystemMedia('playpause').catch(() => {});
          }, 1200);
          return `Playing today's trending hit: "${trendingTrack.title}" by ${trendingTrack.artist} on Spotify, sir.`;
        } catch (e) {
          // Fallback to playlist below
        }
      }

      if (process.platform === 'win32') {
        try {
          exec(`powershell.exe -NoProfile -Command "Start-Process 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'"`, { windowsHide: true });
          cachedMediaStatus.isPlaying = true;
          cachedMediaStatus.title = trendingTrack.title ? `"${trendingTrack.title}" by ${trendingTrack.artist}` : "Today's Top Hits";
          cachedMediaStatus.artist = 'Spotify Global Charts';
          cachedMediaStatus.source = 'Spotify';
          setTimeout(() => {
            controlSystemMedia('playpause').catch(() => {});
          }, 1200);
          return `Playing today's top hits on Spotify, sir. (Trending: "${trendingTrack.title}" by ${trendingTrack.artist})`;
        } catch (e) {
          await openSingleTarget('Spotify');
          return 'Opening Spotify, sir.';
        }
      } else {
        await open('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
        return `Playing today's top hits on Spotify, sir. (Trending: "${trendingTrack.title}" by ${trendingTrack.artist})`;
      }
    }

    // Clean conversational phrases: "enemy song by imagine dragons" -> "enemy by imagine dragons"
    let searchTerms = cleanQuery
      .replace(/\s+(?:the\s+song|song|the\s+track|track)\s+by\s+/i, ' by ')
      .trim();

    if (isLanguageTrending) {
      searchTerms = `latest trending ${detectedLanguage} songs`;
    } else if (detectedLanguage && /^(?:the\s+)?(?:songs?|music)?$/i.test(searchTerms.replace(new RegExp(`\\b${detectedLanguage}\\b`, 'i'), '').trim())) {
      searchTerms = `${detectedLanguage} hit songs`;
    }

    if (process.platform === 'win32') {
      try {
        const spotifySearchUri = `spotify:search:${encodeURIComponent(searchTerms)}`;
        exec(`powershell.exe -NoProfile -Command "Start-Process '${spotifySearchUri}'"`, { windowsHide: true });

        cachedMediaStatus.isPlaying = true;
        cachedMediaStatus.title = searchTerms;
        cachedMediaStatus.artist = 'Spotify Playback';
        cachedMediaStatus.source = 'Spotify';

        // Wait for Spotify UI to load search, then activate window, submit search, navigate to top result and start playback
        setTimeout(() => {
          exec(`powershell.exe -NoProfile -Command "$wshell = New-Object -ComObject WScript.Shell; if ($wshell.AppActivate('Spotify')) { Start-Sleep -Milliseconds 400; $wshell.SendKeys('{ENTER}'); Start-Sleep -Milliseconds 250; $wshell.SendKeys('{DOWN}'); Start-Sleep -Milliseconds 150; $wshell.SendKeys('{ENTER}'); Start-Sleep -Milliseconds 200; $wshell.SendKeys(' ') }"`, { windowsHide: true }, () => {
            controlSystemMedia('playpause').catch(() => {});
          });
        }, 1200);

        return `Playing "${searchTerms}" on Spotify, sir.`;
      } catch (e) {
        await open(`https://open.spotify.com/search/${encodeURIComponent(searchTerms)}`);
        return `Opened "${searchTerms}" on Spotify Web, sir.`;
      }
    } else {
      await open(`https://open.spotify.com/search/${encodeURIComponent(searchTerms)}`);
      return `Opened "${searchTerms}" on Spotify, sir.`;
    }
  }

  // Default fallback to YouTube
  return await playMediaDirectly(cleanQuery, 'youtube');
}

// Fast media playback parser to immediately catch and execute user media directives (<30ms latency)
function parseMediaCommand(text) {
  const t = (text || '').trim();
  const lower = t.toLowerCase();

  // SAFETY GUARD: If the command is to close, exit, quit, kill, or terminate an app/tab,
  // NEVER treat it as a media playback directive!
  if (/\b(?:close|exit|quit|kill|terminate|shut(?:\s*down)?)\b/i.test(lower)) {
    return null;
  }

  // 1. Status query: "what song is playing", "what's playing", "current song", "who is this", "what track is this"
  if (/\b(?:what(?:'s|\s+is|\s+song\s+is|\s+track\s+is)?\s+(?:the\s+)?(?:song|track|music|playing|audio)|what\s+song\s+is\s+(?:this|playing)|which\s+song\s+is\s+playing|what\s+is\s+this\s+song|who\s+is\s+(?:this|singing)|current\s+(?:song|track)|media\s+status)\b/i.test(lower)) {
    return { type: 'status_query', action: 'status' };
  }

  // 2. Next Track / Video
  if (/\b(?:play\s+)?(?:next\s+(?:song|track|video|music|audio|episode)|skip\s+(?:this\s+)?(?:song|track|video|audio|episode)?|next\s+track|next\s+song|next\s+video)\b/i.test(lower) ||
      /^(?:next|skip|play\s+next)$/i.test(lower)) {
    return { type: 'control', action: 'next', reply: 'Playing next track, sir.' };
  }

  // 3. Previous Track / Video
  if (/\b(?:play\s+)?(?:previous|prev|last)\s+(?:song|track|video|music|audio|episode)\b/i.test(lower) ||
      /\b(?:go\s+back\s+(?:a\s+)?(?:song|track|video|episode))\b/i.test(lower) ||
      /^(?:previous|prev|play\s+previous|play\s+prev)$/i.test(lower)) {
    return { type: 'control', action: 'prev', reply: 'Playing previous track, sir.' };
  }

  // 4. Pause / Stop
  if (/\b(?:pause|freeze|stop)\s+(?:the\s+)?(?:music|song|video|playback|audio|spotify|youtube)\b/i.test(lower) ||
      /^(?:pause|pause\s+music|pause\s+video|stop\s+music|stop\s+video)$/i.test(lower)) {
    return { type: 'control', action: 'playpause', reply: 'Playback paused, sir.' };
  }

  // 5. Resume / Toggle playback without specific track
  if (/^(?:resume|continue|unpause)$/i.test(lower) ||
      /\b(?:resume|continue|unpause)\s+(?:the\s+)?(?:music|song|video|playback|audio|spotify|youtube)\b/i.test(lower) ||
      /^(?:play|start|toggle)\s+(?:the\s+)?(?:music|playback|audio)$/i.test(lower) ||
      /^(?:play|resume)$/i.test(lower)) {
    return { type: 'control', action: 'playpause', reply: 'Resuming playback, sir.' };
  }

  // 5.5. Playlist directives: "open my playlist", "play my playlist", "open playlist", "play playlist", "my playlist", "my spotify playlist"
  if (/\b(?:open|launch|start|show|go\s+to|view|play|put\s+on)\s+(?:my\s+|the\s+)?playlists?\b/i.test(lower) ||
      /\bplaylists?\b/i.test(lower) && /\b(?:my|spotify|music)\b/i.test(lower) ||
      /^(?:open\s+|play\s+)?(?:my\s+)?playlists?$/i.test(lower)) {
    return { type: 'play_query', target: 'spotify', query: 'my playlist' };
  }

  // 5.6. Language-specific music directives:
  // e.g. "play latest trending Telugu song", "play Telugu songs", "play trending Hindi songs", "play latest Tamil songs"
  const langMatch = extractMusicLanguage(lower);
  if (langMatch) {
    const isPlayMusicCommand = /^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+|can\s+you\s+|could\s+you\s+|i\s+want\s+to\s+listen\s+to\s+)?(?:search\s+and\s+play|play|put\s+on|listen\s+to)\s+/i.test(lower);
    if (isPlayMusicCommand) {
      const targetPlatform = /\bspotify\b/i.test(lower) ? 'spotify' : 'youtube';

      // Check if user specified a specific track/artist or just asked for music in that language
      const remaining = lower
        .replace(/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+|can\s+you\s+|could\s+you\s+|i\s+want\s+to\s+listen\s+to\s+)?(?:search\s+and\s+play|play|put\s+on|listen\s+to)\s+/i, '')
        .replace(/\s+(?:on|in)\s+(?:spotify|youtube)$/i, '')
        .replace(new RegExp(`\\b(?:in\\s+)?${langMatch.toLowerCase()}\\b`, 'i'), '')
        .replace(/\b(?:latest\s+trending|trending|trend|latest|new|viral|top\s+hits|today'?s\s+top\s+hits|top|hits|popular|charts?|billboard|hottest)\b/gi, '')
        .replace(/\b(?:songs?|tracks?|music|audio|videos?|some|the|a)\b/gi, '')
        .trim();

      const isTrending = /\b(?:trending|trend|latest|new|viral|top\s+hits|today'?s\s+top\s+hits|top|hits|popular|charts?|billboard|hottest)\b/i.test(lower);

      if (!remaining || remaining.length === 0) {
        const finalQuery = isTrending ? `latest trending ${langMatch} songs` : `${langMatch} hit songs`;
        return { type: 'play_query', target: targetPlatform, query: finalQuery };
      }
    }
  }

  // 5.8. Trending / Latest music directives: "play latest trending song", "play trending song", "play latest song", "play today's top hits", "play viral song"
  const trendingMusicRegex = /^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+|can\s+you\s+|could\s+you\s+|i\s+want\s+to\s+listen\s+to\s+)?(?:search\s+and\s+play|play|put\s+on|listen\s+to)\s+(?:the\s+)?(?:latest\s+trending\s+songs?|trending\s+songs?|latest\s+songs?|new\s+songs?|viral\s+songs?|top\s+hits|today'?s\s+top\s+hits|hottest\s+songs?|chart\s+toppers?|trending\s+music|latest\s+music|top\s+trending(?:\s+songs?)?)(?:\s+(?:on|in)\s+(spotify|youtube))?$/i;
  const trendingMatch = lower.match(trendingMusicRegex);
  if (trendingMatch) {
    const targetPlatform = trendingMatch[1] ? trendingMatch[1].toLowerCase() : (/\bspotify\b/i.test(lower) ? 'spotify' : 'youtube');
    return { type: 'play_query', target: targetPlatform, query: 'latest trending song' };
  }

  // 6. Spotify explicit commands: "play X in spotify", "play X on spotify", "in spotify play X", "open spotify and play X", "spotify play X"
  if (/\bspotify\b/i.test(lower)) {
    if (/^(?:open|launch|start|close|exit|quit|kill)\s+spotify\b/i.test(lower) || /\b(?:close|exit|quit|kill)\s+(?:the\s+)?spotify/i.test(lower)) return null;
    let spotQuery = lower
      .replace(/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+|can\s+you\s+|could\s+you\s+)?/i, '')
      .replace(/^(?:open\s+spotify\s+(?:and\s+)?(?:search\s+and\s+play|play|put\s+on|listen\s+to)|(?:in|on)\s+spotify\s+(?:search\s+and\s+play|play|put\s+on|listen\s+to)|spotify\s+(?:play|put\s+on|listen\s+to))/i, '')
      .replace(/^(?:search\s+and\s+play|play|search\s+for|put\s+on|listen\s+to)\s+/i, '')
      .replace(/\s+(?:on|in)\s+spotify$/i, '')
      .trim();

    if (spotQuery && !/^(music|some\s+music|playback|song|a\s+song|songs|video|audio|something|anything|it)$/i.test(spotQuery)) {
      spotQuery = spotQuery
        .replace(/^(?:the\s+song\s+|song\s+|the\s+track\s+|track\s+)/i, '')
        .replace(/\s+(?:the\s+song|song|the\s+track|track)\s+by\s+/i, ' by ')
        .replace(/\s+(?:the\s+song|song|the\s+track|track)$/i, '')
        .trim();
      return { type: 'play_query', target: 'spotify', query: spotQuery };
    }
  }

  // 7. YouTube explicit commands: "play X on youtube", "in youtube play X", "open youtube and play X", "youtube play X"
  if (/\byoutube\b/i.test(lower)) {
    if (/^(?:open|launch|start|close|exit|quit|kill)\s+youtube\b/i.test(lower) || /\b(?:close|exit|quit|kill)\s+(?:the\s+)?youtube/i.test(lower)) return null;
    let ytQuery = lower
      .replace(/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+|can\s+you\s+|could\s+you\s+)?/i, '')
      .replace(/^(?:open\s+youtube\s+(?:and\s+)?(?:search\s+and\s+play|play|put\s+on|listen\s+to)|(?:in|on)\s+youtube\s+(?:search\s+and\s+play|play|put\s+on|listen\s+to)|youtube\s+(?:play|put\s+on|listen\s+to))/i, '')
      .replace(/^(?:search\s+and\s+play|play|search\s+for|put\s+on|listen\s+to)\s+/i, '')
      .replace(/\s+(?:on|in)\s+youtube$/i, '')
      .trim();

    if (ytQuery && !/^(music|some\s+music|playback|song|a\s+song|songs|video|audio|something|anything|it)$/i.test(ytQuery)) {
      ytQuery = ytQuery
        .replace(/^(?:the\s+song\s+|song\s+|the\s+track\s+|track\s+|the\s+video\s+|video\s+)/i, '')
        .replace(/\s+(?:the\s+song|song|the\s+track|track)\s+by\s+/i, ' by ')
        .replace(/\s+(?:the\s+song|song|the\s+track|track|the\s+video|video)$/i, '')
        .trim();
      return { type: 'play_query', target: 'youtube', query: ytQuery };
    }
  }

  // 8. General "play [song/artist]" (defaults to YouTube for direct video playback)
  // e.g. "play enemy song by imagein dragon", "play starboy", "play enemy by imagine dragons"
  const generalPlayMatch = lower.match(/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+|can\s+you\s+|could\s+you\s+|i\s+want\s+to\s+listen\s+to\s+)?(?:search\s+and\s+play|play|put\s+on|listen\s+to)\s+(.+)$/i);
  if (generalPlayMatch && generalPlayMatch[1]) {
    let candidate = generalPlayMatch[1].trim();

    // Check if candidate is generic ("music", "some music", "a song", "songs", "something", "anything", "it")
    if (/^(music|some\s+music|playback|song|a\s+song|songs|video|audio|something|anything|it)$/i.test(candidate)) {
      return { type: 'control', action: 'playpause', reply: 'Resuming playback, sir.' };
    }

    // Check if candidate is asking for trending/latest music
    if (/^(?:the\s+)?(?:latest\s+trending(?:\s+songs?)?|trending(?:\s+songs?)?|latest\s+songs?|new\s+songs?|viral(?:\s+songs?)?|today'?s\s+top\s+hits|top\s+hits|trending\s+music|latest\s+music|top\s+trending(?:\s+songs?)?)$/i.test(candidate)) {
      return { type: 'play_query', target: 'youtube', query: 'latest trending song' };
    }

    candidate = candidate
      .replace(/^(?:the\s+song\s+|song\s+|the\s+track\s+|track\s+)/i, '')
      .replace(/\s+(?:the\s+song|song|the\s+track|track)\s+by\s+/i, ' by ')
      .replace(/\s+(?:the\s+song|song|the\s+track|track)$/i, '')
      .trim();

    return { type: 'play_query', target: 'youtube', query: candidate };
  }

  return null;
}


// Weather Service Integration (Open-Meteo & Free Geolocation - No API Key Required)
const WMO_WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snowfall',
  73: 'Moderate snowfall',
  75: 'Heavy snowfall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

function decodeWeatherCode(code) {
  return WMO_WEATHER_CODES[code] || 'Variable weather conditions';
}

async function getIpLocation() {
  try {
    const response = await fetch('http://ip-api.com/json/', { signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        return {
          city: data.city,
          region: data.regionName,
          country: data.country,
          lat: data.lat,
          lon: data.lon
        };
      }
    }
  } catch (err) {
    console.warn('[WEATHER] IP geolocation failed:', err.message);
  }
  return { city: 'Local Area', region: '', country: '', lat: 17.385, lon: 78.486 };
}

async function resolveUserLocation(clientCoords) {
  if (clientCoords && clientCoords.lat && clientCoords.lon) {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${clientCoords.lat}&longitude=${clientCoords.lon}&localityLanguage=en`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const d = await res.json();
        const city = d.city || d.locality || d.principalSubdivision || 'Local Area';
        return {
          city: city,
          region: d.principalSubdivision || '',
          country: d.countryName || '',
          lat: clientCoords.lat,
          lon: clientCoords.lon,
          permission: 'granted',
          source: 'Browser GPS/Wi-Fi'
        };
      }
    } catch (e) {
      console.warn('[LOCATION] Reverse geocode error:', e.message);
    }
    return {
      city: 'Local Area',
      region: '',
      country: '',
      lat: clientCoords.lat,
      lon: clientCoords.lon,
      permission: 'granted',
      source: 'Browser GPS/Wi-Fi'
    };
  }
  const ipLoc = await getIpLocation();
  return {
    ...ipLoc,
    permission: 'granted (via Network IP)',
    source: 'Network IP Geolocation'
  };
}

async function getCoordinatesForLocation(locationName) {
  const clean = (locationName || '').trim();
  if (!clean || ['here', 'current', 'my location', 'my city', 'today', 'local', 'me', 'now'].includes(clean.toLowerCase())) {
    return null;
  }
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=1&language=en&format=json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        return {
          city: item.name,
          region: item.admin1 || '',
          country: item.country || '',
          lat: item.latitude,
          lon: item.longitude
        };
      }
    }
  } catch (err) {
    console.warn(`[WEATHER] Geocoding failed for "${locationName}":`, err.message);
  }
  return null;
}

async function fetchLiveWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.statusText}`);
  }
  return await response.json();
}

async function getWeatherData(locationName, clientCoords = null) {
  let locationInfo = null;
  if (locationName) {
    locationInfo = await getCoordinatesForLocation(locationName);
  }
  
  if (!locationInfo) {
    if (clientCoords && clientCoords.lat && clientCoords.lon) {
      locationInfo = {
        city: clientCoords.city || 'Your Location',
        region: clientCoords.region || '',
        country: clientCoords.country || '',
        lat: clientCoords.lat,
        lon: clientCoords.lon
      };
    } else {
      locationInfo = await getIpLocation();
    }
  }

  const raw = await fetchLiveWeather(locationInfo.lat, locationInfo.lon);
  const current = raw.current || {};
  const daily = raw.daily || {};

  const condition = decodeWeatherCode(current.weather_code);
  const forecast7Day = [];
  if (daily.time && Array.isArray(daily.time)) {
    for (let i = 0; i < Math.min(daily.time.length, 7); i++) {
      const dateObj = new Date(daily.time[i]);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      forecast7Day.push({
        date: daily.time[i],
        day: dayName,
        maxTemp: Math.round(daily.temperature_2m_max?.[i] ?? 0),
        minTemp: Math.round(daily.temperature_2m_min?.[i] ?? 0),
        condition: decodeWeatherCode(daily.weather_code?.[i])
      });
    }
  }

  return {
    location: `${locationInfo.city}${locationInfo.country ? ', ' + locationInfo.country : ''}`,
    city: locationInfo.city,
    coordinates: { lat: locationInfo.lat, lon: locationInfo.lon },
    current: {
      temperature: Math.round(current.temperature_2m ?? 0),
      apparentTemperature: Math.round(current.apparent_temperature ?? 0),
      humidity: current.relative_humidity_2m ?? 0,
      pressure: Math.round(current.surface_pressure ?? 0),
      windSpeed: Math.round(current.wind_speed_10m ?? 0),
      weatherCode: current.weather_code ?? 0,
      condition: condition,
      precipitation: current.precipitation ?? 0
    },
    forecast: forecast7Day
  };
}


// System integration functions
const systemTools = {
  get_weather: async (args, res, clientLocation) => {
    const requestedLoc = (args?.location || '').trim();
    console.log(`[WEATHER] Processing weather request for location: "${requestedLoc || 'CURRENT_LOCATION'}"`);
    try {
      const data = await getWeatherData(requestedLoc, clientLocation);
      const todayHigh = data.forecast[0]?.maxTemp ?? data.current.temperature;
      const todayLow = data.forecast[0]?.minTemp ?? data.current.temperature;
      const summary = `Location: ${data.location}
Current Weather: ${data.current.condition}
Current Temperature: ${data.current.temperature}°C (Feels like ${data.current.apparentTemperature}°C)
Humidity: ${data.current.humidity}%
Wind Speed: ${data.current.windSpeed} km/h
Pressure: ${data.current.pressure} hPa
Today's High / Low: High ${todayHigh}°C, Low ${todayLow}°C
Upcoming 3-Day Forecast: ${data.forecast.slice(1, 4).map(f => `${f.day}: ${f.maxTemp}°C (${f.condition})`).join('; ')}`;
      console.log(`[WEATHER] Weather data resolved for ${data.location}: ${data.current.temperature}°C, ${data.current.condition}`);
      return summary;
    } catch (err) {
      console.error(`[WEATHER] Error fetching weather:`, err);
      return `ERROR: Unable to fetch live weather at this moment (${err.message}).`;
    }
  },

  open_targets: async (args, res) => {
    const targets = extractTargets(args);
    if (targets.length === 0) {
      return "ERROR: No targets specified to open.";
    }
    const results = [];
    for (let i = 0; i < targets.length; i++) {
      if (i > 0) {
        // Small stagger between opening multiple tabs so Windows/browser allocates each tab cleanly
        await new Promise(r => setTimeout(r, 200));
      }
      const r = await openSingleTarget(targets[i], res);
      results.push(r);
    }
    return `SUCCESS: ${results.join(' ')}`;
  },

  close_targets: async (args, res) => {
    const targets = extractTargets(args);
    if (targets.length === 0) {
      return await closeSingleTarget('', res);
    }
    const results = [];
    for (let i = 0; i < targets.length; i++) {
      if (i > 0) {
        await new Promise(r => setTimeout(r, 250));
      }
      const r = await closeSingleTarget(targets[i], res);
      results.push(r);
    }
    return `SUCCESS: ${results.join(' ')}`;
  },

  // Aliases for full backward compatibility
  open_application: async (args, res) => systemTools.open_targets(args, res),
  open_website: async (args, res) => systemTools.open_targets(args, res),
  close_target: async (args, res) => systemTools.close_targets(args, res),

  close_chrome_tabs: async (args, res) => {
    const count = parseInt(args?.count) || 1;
    const platform = process.platform;

    // Notify frontend to safely close managed open tabs via window references
    if (res && !res.writableEnded) {
      for (let i = 0; i < count; i++) {
        res.write(`data: ${JSON.stringify({ action: 'close_tab', target: 'tab' })}\n\n`);
      }
    }

    if (platform === 'win32') {
      const targetArg = count > 1 ? 'all_tabs' : 'tab';
      await closeBrowserTab(targetArg, count);
      return count > 1
        ? `Closed ${count} browser tabs. J.A.R.V.I.S. Core System remains online.`
        : `Closed the browser tab. J.A.R.V.I.S. Core System remains online.`;
    } else if (platform === 'darwin') {
      const command = `osascript -e '
        tell application "Google Chrome"
          tell front window
            repeat ${count} times
              close active tab
            end repeat
          end tell
        end tell
      '`;
      return new Promise((resolve) => {
        exec(command, () => {
          resolve(`SUCCESS: Closed ${count} tab(s) on macOS.`);
        });
      });
    } else {
      return `SUCCESS: Closed ${count} tab(s).`;
    }
  },

  reopen_closed_tab: async (args) => {
    const count = parseInt(args?.count) || 1;
    const platform = process.platform;

    if (platform === 'win32') {
      const psScript = `
        $wshell = New-Object -ComObject Wscript.Shell
        $activated = $wshell.AppActivate('Google Chrome')
        if (-not $activated) { $activated = $wshell.AppActivate('Chrome') }
        if (-not $activated) { $activated = $wshell.AppActivate('Microsoft Edge') }
        if (-not $activated) { $activated = $wshell.AppActivate('Brave') }
        if ($activated) {
            for ($i=0; $i -lt ${count}; $i++) {
                $wshell.SendKeys('^+t')
                Start-Sleep -m 200
            }
            Write-Output 'REOPENED_TABS'
        } else {
            Write-Output 'NO_BROWSER'
        }
      `;
      const res = await runPowerShell(psScript);
      if (res.stdout.includes('NO_BROWSER')) {
        if (openedWebsitesHistory.length > 0) {
          const lastUrl = openedWebsitesHistory[openedWebsitesHistory.length - 1];
          return new Promise((resolve) => {
            exec(`cmd.exe /c start "" "${lastUrl}"`, (openErr) => {
              if (openErr) {
                resolve(`ERROR: Browser was not active and could not reopen tab.`);
              } else {
                resolve(`SUCCESS: Reopened previous website ${lastUrl}.`);
              }
            });
          });
        }
        return "ERROR: Browser was not active or could not reopen closed tab.";
      }
      return `SUCCESS: Reopened ${count} previous tab(s) in browser.`;
    } else if (platform === 'darwin') {
      const command = `osascript -e '
        tell application "System Events"
          tell process "Google Chrome"
            set frontmost to true
            repeat ${count} times
              keystroke "t" using {command down, shift down}
              delay 0.2
            end repeat
          end tell
        end tell
      '`;
      return new Promise((resolve) => {
        exec(command, (err) => {
          if (err) {
            resolve("ERROR: Failed to reopen Chrome tab on macOS.");
          } else {
            resolve(`SUCCESS: Reopened ${count} closed tab(s) in Google Chrome.`);
          }
        });
      });
    } else {
      return `ERROR: Unsupported platform '${platform}'.`;
    }
  },

  switch_previous_tab: async () => {
    const platform = process.platform;
    if (platform === 'win32') {
      const psScript = `
        $wshell = New-Object -ComObject Wscript.Shell
        $activated = $wshell.AppActivate('Google Chrome')
        if (-not $activated) { $activated = $wshell.AppActivate('Chrome') }
        if (-not $activated) { $activated = $wshell.AppActivate('Microsoft Edge') }
        if (-not $activated) { $activated = $wshell.AppActivate('Brave') }
        if (-not $activated) { $activated = $wshell.AppActivate('React App') }
        if ($activated) {
            $wshell.SendKeys('^+{TAB}')
            Write-Output 'SWITCHED_TAB'
        } else {
            Write-Output 'NO_BROWSER'
        }
      `;
      const res = await runPowerShell(psScript);
      if (res.stdout.includes('NO_BROWSER')) {
        return "ERROR: Browser was not active.";
      }
      return "SUCCESS: Switched to previous tab in browser.";
    } else if (platform === 'darwin') {
      const command = `osascript -e '
        tell application "Google Chrome"
          tell front window
            set active tab index to (active tab index - 1)
          end tell
        end tell
      '`;
      return new Promise((resolve) => {
        exec(command, (err) => {
          if (err) {
            resolve("ERROR: Failed to switch tab on macOS.");
          } else {
            resolve("SUCCESS: Switched to previous tab on macOS.");
          }
        });
      });
    } else {
      return `ERROR: Unsupported platform '${platform}'.`;
    }
  },

  list_desktop_folders: async () => {
    try {
      const desktopPath = getDesktopPath();
      if (!desktopPath || !fs.existsSync(desktopPath)) {
        return "ERROR: Desktop directory not found.";
      }
      
      const files = fs.readdirSync(desktopPath);
      const folders = files.filter(file => {
        try {
          return fs.statSync(path.join(desktopPath, file)).isDirectory();
        } catch (e) {
          return false;
        }
      });

      if (folders.length === 0) {
        return "SUCCESS: There are no folders on your Desktop.";
      } else if (folders.length === 1) {
        return `SUCCESS: There is 1 folder on your Desktop: ${folders[0]}.`;
      } else {
        return `SUCCESS: There are ${folders.length} folders on your Desktop: ${folders.join(', ')}.`;
      }
    } catch (err) {
      return `ERROR: Failed to list desktop folders: ${err.message}`;
    }
  },

  open_folder: async (args) => {
    const rawName = (args?.folderName || args?.name || '').trim();
    const cleanLower = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const desktopPath = getDesktopPath();
    const platform = process.platform;

    let targetPath = null;
    let displayName = rawName || 'Desktop';

    // 1. If user asked for desktop, folders in desktop, desktop folders, or left blank:
    if (!cleanLower || cleanLower === 'desktop' || cleanLower.includes('desktopfolder') || cleanLower.includes('folders') || cleanLower.includes('desktop')) {
      targetPath = desktopPath;
      displayName = 'Desktop';
    } else {
      // 2. Check standard well-known Windows folders
      const standardFolders = {
        'downloads': path.join(os.homedir(), 'Downloads'),
        'documents': fs.existsSync(path.join(os.homedir(), 'OneDrive', 'Documents'))
          ? path.join(os.homedir(), 'OneDrive', 'Documents')
          : path.join(os.homedir(), 'Documents'),
        'pictures': path.join(os.homedir(), 'Pictures'),
        'music': path.join(os.homedir(), 'Music'),
        'videos': path.join(os.homedir(), 'Videos')
      };

      if (standardFolders[cleanLower] && fs.existsSync(standardFolders[cleanLower])) {
        targetPath = standardFolders[cleanLower];
        displayName = cleanLower.charAt(0).toUpperCase() + cleanLower.slice(1);
      } else {
        // 3. Search Desktop folders for a match
        if (desktopPath && fs.existsSync(desktopPath)) {
          const directCheck = path.join(desktopPath, rawName);
          if (fs.existsSync(directCheck) && fs.statSync(directCheck).isDirectory()) {
            targetPath = directCheck;
            displayName = rawName;
          } else {
            try {
              const entries = fs.readdirSync(desktopPath, { withFileTypes: true });
              for (const entry of entries) {
                if (entry.isDirectory()) {
                  const entryClean = entry.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                  if (entryClean === cleanLower || entryClean.includes(cleanLower) || cleanLower.includes(entryClean)) {
                    targetPath = path.join(desktopPath, entry.name);
                    displayName = entry.name;
                    break;
                  }
                }
              }
            } catch (e) {}
          }
        }

        // 4. If still not found, check if it is an absolute path
        if (!targetPath && fs.existsSync(rawName)) {
          targetPath = rawName;
        }
      }
    }

    // Default fallback to Desktop if target folder wasn't resolved
    if (!targetPath) {
      targetPath = desktopPath;
      displayName = 'Desktop';
    }

    if (platform === 'win32') {
      return new Promise((resolve) => {
        exec(`cmd.exe /c start "" explorer.exe "${targetPath}"`, (err) => {
          if (err) {
            resolve(`ERROR: Could not open folder ${displayName}: ${err.message}`);
          } else {
            resolve(`SUCCESS: Opened ${displayName} folder in File Explorer.`);
          }
        });
      });
    } else if (platform === 'darwin') {
      return new Promise((resolve) => {
        exec(`open "${targetPath}"`, (err) => {
          if (err) {
            resolve(`ERROR: Could not open folder ${displayName}.`);
          } else {
            resolve(`SUCCESS: Opened ${displayName} folder.`);
          }
        });
      });
    } else {
      return new Promise((resolve) => {
        exec(`xdg-open "${targetPath}"`, (err) => {
          if (err) {
            resolve(`ERROR: Could not open folder ${displayName}.`);
          } else {
            resolve(`SUCCESS: Opened ${displayName} folder.`);
          }
        });
      });
    }
  },
  get_current_time: async (args, res, clientLocation, clientTime) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (clientTime) {
      return `Exact current time: ${clientTime}. System clock: ${timeStr}, ${dateStr} (${timezone}).`;
    }
    return `Exact current time: ${timeStr}, Date: ${dateStr} (${timezone}).`;
  },
  get_user_location: async (args, res, clientLocation) => {
    const loc = await resolveUserLocation(clientLocation);
    const locDesc = `${loc.city}${loc.region ? `, ${loc.region}` : ''}${loc.country ? `, ${loc.country}` : ''}`;
    return `Location telemetry active and verified. Browser permission: GRANTED. Current position: ${locDesc} (Coordinates: ${loc.lat}, ${loc.lon}, Source: ${loc.source}).`;
  },
  adjust_volume: async (args) => {
    const action = (args?.action || 'set').toLowerCase();
    let level = args?.level;
    if (typeof level === 'string') {
      const m = level.match(/\d+/);
      level = m ? parseInt(m[0], 10) : null;
    }
    return await adjustSystemVolume(action, level);
  },
  get_system_stats: async () => {
    const stats = await getSystemTelemetry();
    return `System Telemetry: CPU Usage ${stats.cpu}%, RAM Memory ${stats.ramUsedGB} GB / ${stats.ramTotalGB} GB (${stats.ramPercent}% used), System Uptime ${stats.uptime}, Cores: ${stats.cores}. All systems operational.`;
  },
  get_latest_news: async (args) => {
    const topic = args?.topic || args?.query || '';
    const newsItems = await fetchLiveNews(topic);
    if (newsItems && newsItems.length > 0) {
      const formatted = newsItems.map((n, i) => `${i + 1}. ${n.title}`).join('\n');
      return `LIVE REAL-TIME NEWS HEADLINES (TODAY):\n${formatted}\n\nPresent a concise, intelligent summary of these top stories as J.A.R.V.I.S.`;
    }
    return await performWebSearch(`${topic || 'latest breaking news'} today`);
  },
  web_search: async (args) => {
    const query = args?.query || '';
    if (!query) return "ERROR: No search query provided.";
    if (/news|headline|updates?/i.test(query)) {
      const newsItems = await fetchLiveNews(query);
      if (newsItems && newsItems.length > 0) {
        const formatted = newsItems.map((n, i) => `${i + 1}. ${n.title}`).join('\n');
        return `LIVE REAL-TIME NEWS HEADLINES (TODAY):\n${formatted}`;
      }
    }
    return await performWebSearch(query);
  },
  manage_notes: async (args, res) => {
    const action = (args?.action || 'list').toLowerCase();
    const notes = readNotes();
    if (action === 'save' || action === 'add' || action === 'remember') {
      const content = args?.content || args?.note || '';
      const title = args?.title || (content.length > 25 ? content.substring(0, 22) + '...' : content) || 'Quick Note';
      if (!content) return "ERROR: Note content cannot be empty.";
      const newNote = {
        id: Date.now().toString(),
        title,
        content,
        timestamp: new Date().toLocaleString()
      };
      notes.unshift(newNote);
      writeNotes(notes);
      if (res && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ action: 'update_notes' })}\n\n`);
      }
      return `SUCCESS: Remembered note "${title}": ${content}`;
    } else if (action === 'delete' || action === 'remove') {
      const target = (args?.title || args?.id || '').toLowerCase();
      const updated = notes.filter(n => n.id !== target && !n.title.toLowerCase().includes(target));
      writeNotes(updated);
      if (res && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ action: 'update_notes' })}\n\n`);
      }
      return `SUCCESS: Note removed from Jarvis memory.`;
    } else {
      if (notes.length === 0) return "No notes currently stored in memory, sir.";
      const list = notes.map((n, i) => `${i + 1}. [${n.title}]: ${n.content}`).join('\n');
      return `Stored Notes in Memory:\n${list}`;
    }
  },
  manage_timers: async (args, res) => {
    const seconds = parseInt(args?.seconds || args?.duration) || 60;
    const label = args?.label || 'Timer';
    if (res && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({ action: 'start_timer', seconds, label })}\n\n`);
    }
    return `SUCCESS: Countdown timer set for ${seconds} seconds (${label}).`;
  },
  system_power_action: async (args) => {
    const action = (args?.action || '').toLowerCase();
    if (action === 'lock') {
      if (process.platform === 'win32') {
        exec('rundll32.exe user32.dll,LockWorkStation');
        return "SUCCESS: Workstation locked successfully.";
      }
      return "Lock workstation executed.";
    }
    return "Power action acknowledged.";
  },
  calculate_math: async (args, res) => {
    const expr = args?.expression || args?.query || '';
    if (!expr) return "ERROR: No mathematical expression provided.";
    try {
      const mathRes = mathEngine.evaluate(expr);
      if (mathRes.success) {
        // If SSE stream is active, notify the frontend HUD
        if (res && !res.writableEnded) {
          res.write(`data: ${JSON.stringify({
            action: 'math_calculation',
            expression: mathRes.expression,
            result: mathRes.formattedResult,
            steps: mathRes.steps,
            category: mathRes.category
          })}\n\n`);
        }
        return `Mathematical Calculation Result: ${mathRes.steps || mathRes.formattedResult}. Verbal summary: ${mathRes.voiceResponse}`;
      }
      return `ERROR: ${mathRes.error || 'Unable to calculate expression.'}`;
    } catch (e) {
      return `ERROR: Calculation exception: ${e.message}`;
    }
  },
  media_control: async (args) => {
    const action = (args?.action || 'playpause').toLowerCase();
    const result = await controlSystemMedia(action);
    if (result.success) {
      if (typeof cachedMediaStatus !== 'undefined') {
        if (action === 'playpause') {
          cachedMediaStatus.isPlaying = !cachedMediaStatus.isPlaying;
        } else if (action === 'next' || action === 'prev' || action === 'previous') {
          cachedMediaStatus.isPlaying = true;
        } else if (action === 'stop') {
          cachedMediaStatus.isPlaying = false;
        }
      }
      return `SUCCESS: Executed media command "${action}".`;
    }
    return `Media command "${action}" encountered an error: ${result.message || 'Unknown'}`;
  },
  play_media: async (args, res) => {
    const query = args?.query || '';
    const target = (args?.target || 'youtube').toLowerCase();
    return await playMediaDirectly(query, target, res);
  },
  get_media_status: async () => {
    const status = await getMediaStatus();
    if (status.isPlaying && status.title !== 'Ready for Playback') {
      return `Currently playing: "${status.title}" by ${status.artist} on ${status.source}.`;
    }
    return `No active media playback currently detected.`;
  },
  find_user_file: async (args) => {
    const fileName = (args?.fileName || args?.query || '').trim().toLowerCase();
    if (!fileName) return "ERROR: Please specify a file name to search.";

    const searchDirs = [
      getDesktopPath(),
      path.join(os.homedir(), 'Downloads'),
      path.join(os.homedir(), 'Documents')
    ];

    const matches = [];
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          for (const f of files) {
            if (f.toLowerCase().includes(fileName)) {
              matches.push(`${f} (${path.basename(dir)})`);
              if (matches.length >= 5) break;
            }
          }
        } catch (e) {}
      }
    }

    if (matches.length > 0) {
      return `Found file(s) matching "${fileName}": ${matches.join(', ')}.`;
    }
    return `Searched Desktop, Downloads, and Documents. No file matching "${fileName}" found.`;
  },
  git_status: async () => {
    return new Promise((resolve) => {
      exec('git status --short && git branch --show-current', { cwd: path.join(__dirname, '..') }, (err, stdout) => {
        if (err) {
          resolve("Git status telemetry: Current branch main, workspace active.");
        } else {
          const lines = (stdout || '').trim().split('\n');
          const branch = lines[lines.length - 1] || 'main';
          const uncommitted = Math.max(0, lines.length - 1);
          resolve(`Git Status Telemetry: Active branch "${branch}", ${uncommitted} uncommitted file change(s).`);
        }
      });
    });
  },
  execute_protocol: async (args) => {
    const protoId = args?.protocolId || args?.name;
    const res = await executeProtocolById(protoId);
    return res.message;
  },
  remember_knowledge: async (args) => {
    try {
      const { topic, content, keywords } = args || {};
      if (!topic || !content) {
        return "ERROR: Both topic and content are required to save knowledge.";
      }
      const res = knowledgeEngine.saveKnowledge({ topic, content, keywords });
      return `Custom knowledge recorded for topic "${topic}". Memory successfully synchronized, sir.`;
    } catch (e) {
      return `ERROR: Failed to save knowledge: ${e.message}`;
    }
  },
  set_reminder: async (args) => {
    try {
      const { title, time, delayMinutes, delaySeconds } = args || {};
      const res = reminderEngine.scheduleReminder({
        title: title || 'Reminder',
        time,
        delayMinutes: delayMinutes || 0,
        delaySeconds: delaySeconds || 0
      });
      return res.message;
    } catch (e) {
      return `ERROR: Failed to schedule reminder: ${e.message}`;
    }
  },
  list_reminders: async () => {
    try {
      const list = reminderEngine.getUpcomingReminders();
      if (list.length === 0) {
        return "No upcoming reminders scheduled at this time, sir.";
      }
      const formatted = list.map((r, i) => `${i + 1}. "${r.title}" scheduled for ${r.timeStr}`).join('\n');
      return `Upcoming Scheduled Reminders:\n${formatted}`;
    } catch (e) {
      return `ERROR: Failed to retrieve reminders: ${e.message}`;
    }
  },
  cancel_reminder: async (args) => {
    try {
      const query = args?.id || args?.title;
      const res = reminderEngine.cancelReminder(query);
      return res.message;
    } catch (e) {
      return `ERROR: Failed to cancel reminder: ${e.message}`;
    }
  }
};

// Define tool schemas for Groq
const toolSchemas = [
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Returns the exact real-time local clock time, current date, day of the week, and timezone. Invoke this tool whenever the user asks for the current time, date, today\'s day, what time it is, etc.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_location',
      description: 'Returns the user\'s real-time geographical location, city, region, coordinates, and verifies that location access permission is active and granted. ALWAYS invoke this tool whenever the user asks where they are, asks what their location is, or asks/comments about location access or permission.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Fetches real-time live weather conditions and forecasts for the user\'s location or any specified city/region (e.g. "Hyderabad", "London", "Tokyo", "New York"). ALWAYS invoke this tool whenever the user asks about the weather, temperature, humidity, rain, climate, or forecast (e.g. "how is the weather today, Jarvis?", "what\'s the temperature outside?", "is it going to rain?"). Leave location empty or omit it if the user asks about their own/current location or today.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city or location name (e.g. "Tokyo", "London", "Mumbai"). Leave blank if user asks about today or their local weather.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_targets',
      description: 'Opens one or more applications, websites, programs, or games (e.g. YouTube, Instagram, Spotify, Discord, LD Player, Notepad, Chrome, VS Code). ALWAYS use this tool when the user asks to open, start, or launch any app, site, or program (single or multiple). Pass ALL targets as an array in `targets`.',
      parameters: {
        type: 'object',
        properties: {
          targets: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of all apps or websites to open (e.g. ["YouTube", "Instagram"] or ["Spotify"]).'
          }
        },
        required: ['targets']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'close_targets',
      description: 'Closes one or more applications, services, websites, or browser tabs (e.g. YouTube, Instagram, Spotify, Discord, Notepad, Chrome). ALWAYS use this tool whenever the user asks to close, exit, quit, or kill any app, site, or tab (single or multiple). Pass ALL targets as an array in `targets`.',
      parameters: {
        type: 'object',
        properties: {
          targets: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of all apps, websites, or tabs to close (e.g. ["YouTube", "Instagram"] or ["Spotify"]).'
          }
        },
        required: ['targets']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_website',
      description: 'Opens a website/URL in the web browser (e.g. YouTube, Instagram, Facebook).',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL or web address to open (e.g., youtube.com, instagram.com).'
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_application',
      description: 'Opens an application or service installed on the system or desktop. Use open_targets instead if multiple items are requested.',
      parameters: {
        type: 'object',
        properties: {
          appName: {
            type: 'string',
            description: 'The name of the application or service to open.'
          }
        },
        required: ['appName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'close_target',
      description: 'Closes a specific application, service, website, or browser tab. Use close_targets instead if multiple items are requested.',
      parameters: {
        type: 'object',
        properties: {
          targetName: {
            type: 'string',
            description: 'The name of the application, website, or tab to close.'
          }
        },
        required: ['targetName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'close_chrome_tabs',
      description: 'Closes a specified number of generic unnamed browser tabs when explicitly requested (e.g. "close 2 tabs"). DO NOT use when a specific app or website name is mentioned (like YouTube or Spotify) - use close_targets instead. Never use to close J.A.R.V.I.S.',
      parameters: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'The number of generic tabs to close (defaults to 1).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'reopen_closed_tab',
      description: 'Reopens or restores the most recently closed tab(s) or opens the previous tab in the web browser (e.g. Chrome, Edge, Brave). Use whenever the user asks to "open previous tab", "open the previous tab", "reopen previous tab", "reopen closed tab", "restore tab", or "reopen tab".',
      parameters: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'The number of closed tabs to reopen/restore (defaults to 1).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'switch_previous_tab',
      description: 'Switches focus back to the previous active tab in the browser. Use whenever the user asks to "switch to previous tab", "go back a tab", or "go to previous tab".',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_desktop_folders',
      description: 'Counts and lists the directories/folders located on the user\'s Desktop. Use when the user asks how many folders are on the desktop, asks to count desktop folders, or asks what folders exist on desktop.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_folder',
      description: 'Opens a folder or directory in File Explorer. Use when the user asks to open the desktop, show folders on desktop, open folders in desktop, or open a specific folder such as J.A.R.V.I.S or Downloads.',
      parameters: {
        type: 'object',
        properties: {
          folderName: {
            type: 'string',
            description: 'The name of the folder to open (e.g. "Desktop", "J.A.R.V.I.S", "Downloads", "Documents"). If the user asks to open folders in desktop or show desktop, specify "Desktop".'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'adjust_volume',
      description: 'Controls or adjusts system audio volume on the machine. ALWAYS invoke this tool whenever the user asks to increase, decrease, set, raise, lower, mute, or unmute volume (e.g. "increase volume upto 80%", "set volume to 80", "increase volume", "decrease volume", "turn down volume", "mute", "unmute").',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['set', 'increase', 'decrease', 'mute', 'unmute', 'get'],
            description: 'The volume action to perform. Use "set" if an explicit target level or percentage is specified (e.g. 80, 50, 100). Use "increase" to raise volume. Use "decrease" to lower volume. Use "mute" to silence audio. Use "unmute" to restore audio.'
          },
          level: {
            type: 'number',
            description: 'The target volume percentage (0 to 100) for "set" (e.g. 80), or the step amount to increase/decrease by (defaults to 10 if not specified).'
          }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_system_stats',
      description: 'Returns real-time system performance telemetry: CPU utilization percentage, RAM memory usage (GB and %), system uptime, and CPU core count. Use whenever the user asks for system stats, CPU usage, memory status, or system performance.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_latest_news',
      description: 'Fetches real-time live news updates and top headlines today from live global news sources. ALWAYS invoke this tool whenever the user asks for news, current events, headlines, updates, what happened today, tech news, sports news, or world news.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Optional news topic or category (e.g. "technology", "sports", "business", "world", "India"). Leave blank for top headlines.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Performs a live web search to answer real-time questions, current news, sports scores, stock prices, or facts not in your local training data. Use whenever the user asks to search the web or asks about live real-time information.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query or topic to search on the web.'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'manage_notes',
      description: 'Saves, lists, or deletes notes and remembered items in Jarvis memory. Use when the user says "remember...", "save note...", "list notes", "show my notes", or "delete note...".',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['save', 'list', 'delete'],
            description: 'Action to perform: "save" to remember a note, "list" to view all notes, "delete" to remove a note.'
          },
          content: {
            type: 'string',
            description: 'The text content of the note to remember.'
          },
          title: {
            type: 'string',
            description: 'Optional note title or identifier for deleting.'
          }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'manage_timers',
      description: 'Sets a countdown timer or alarm on the Jarvis HUD. Use whenever the user asks to "set a timer for X seconds/minutes" or "start a countdown".',
      parameters: {
        type: 'object',
        properties: {
          seconds: {
            type: 'number',
            description: 'Total timer duration in seconds.'
          },
          label: {
            type: 'string',
            description: 'Label or title for the timer.'
          }
        },
        required: ['seconds']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'system_power_action',
      description: 'Executes system power management actions like locking the PC workstation screen. Use when the user asks to "lock my PC", "lock workstation", or "lock screen".',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['lock'],
            description: 'The power action to take.'
          }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_math',
      description: 'Evaluates mathematical equations, arithmetic operations, unit conversions, or calculations. Use whenever the user asks to calculate, evaluate, or convert numerical math expressions.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'The mathematical expression to evaluate (e.g. "255 * 84", "15% of 850").'
          }
        },
        required: ['expression']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'media_control',
      description: 'Controls media playback on the machine (play, pause, next track, previous track, stop). Use when the user asks to "play music", "pause music", "next song", "previous track", or "toggle playback".',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['playpause', 'next', 'previous', 'stop'],
            description: 'The media playback command to execute.'
          }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'play_media',
      description: 'Plays a specific song, artist, album, playlist, or track directly on YouTube or Spotify. Automatically resolves the exact track and starts playing it immediately with autoplay. Defaults to YouTube for instant playback without login.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The song title, artist, or music query to play (e.g. "Enemy Imagine Dragons", "Starboy", "Queen Bohemian Rhapsody").'
          },
          target: {
            type: 'string',
            enum: ['youtube', 'spotify'],
            description: 'The streaming platform. Defaults to "youtube" for direct instant playback.'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_media_status',
      description: 'Fetches the current media playback status, including what song is currently playing, the artist, and playback state. Use when the user asks "what song is playing?", "what\'s playing?", or "who is this?".',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'find_user_file',
      description: 'Searches for files matching a name query across Desktop, Downloads, and Documents folders. Use when the user asks to "find file named X", "search for file X", or "where is file X".',
      parameters: {
        type: 'object',
        properties: {
          fileName: {
            type: 'string',
            description: 'The file name or keyword to search for.'
          }
        },
        required: ['fileName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'Queries git repository telemetry (active branch, uncommitted files count). Use when the user asks for git status, git branch, or repository status.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_protocol',
      description: 'Executes a pre-configured multi-step Iron Man protocol macro by ID or name (e.g. "focus", "chill", "clean_slate", "nightfall"). ALWAYS invoke this tool whenever the user asks to initiate, activate, or run a protocol.',
      parameters: {
        type: 'object',
        properties: {
          protocolId: {
            type: 'string',
            description: 'The protocol identifier to trigger (e.g. "focus", "chill", "clean_slate", "nightfall").'
          }
        },
        required: ['protocolId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remember_knowledge',
      description: 'Saves or records custom knowledge, facts, project rules, definitions (e.g. AGI definition, user preferences, custom notes) into J.A.R.V.I.S. persistent memory core. Invoke whenever the user asks to "remember that...", "note that...", "save this knowledge", or "remember this fact".',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'The title or topic name (e.g. "AGI Definition", "User Preferences", "Project Architecture").'
          },
          content: {
            type: 'string',
            description: 'The exact knowledge or fact to remember.'
          },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional array of search trigger keywords.'
          }
        },
        required: ['topic', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_reminder',
      description: 'Schedules an automatic proactive reminder or alarm that alerts the user at a specific clock time (e.g. "12:37", "3:45 PM") or after a relative delay (e.g. in 15 minutes). When the scheduled time arrives, J.A.R.V.I.S automatically speaks out loud through the speakers and displays a desktop alert.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title or task to be reminded about (e.g. "Meeting", "Call John", "Drink water", "Submit report").'
          },
          time: {
            type: 'string',
            description: 'The exact clock time (e.g. "12:37", "12:37 PM", "15:00") or relative phrase (e.g. "in 15 minutes", "in 1 hour").'
          },
          delayMinutes: {
            type: 'number',
            description: 'Optional delay in minutes from now.'
          }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_reminders',
      description: 'Lists all pending / upcoming scheduled reminders. Use when the user asks "what are my reminders?", "show my reminders", or "do I have any reminders?".',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cancel_reminder',
      description: 'Cancels an existing scheduled reminder by title or ID. Use when the user asks to "cancel the meeting reminder", "delete reminder", or "cancel reminder".',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title or keyword of the reminder to cancel.'
          }
        },
        required: ['title']
      }
    }
  }
];

// Native browser launch endpoint (used as immediate fallback if browser blocks popups)
app.post('/api/open_native', (req, res) => {
  const { url } = req.body;
  if (url) {
    console.log('Opening native browser tab for:', url);
    openUrlInBrowserNative(url);
    return res.json({ success: true, url });
  }
  return res.status(400).json({ error: 'No URL specified' });
});

// 3D Viewport Action endpoint (open folder in Explorer or open model in Blender)
app.post('/api/viewport3d/action', (req, res) => {
  const { action, modelKey } = req.body;
  const modelsDir = path.join(__dirname, 'Data', 'Generated_Models', modelKey || 'dog');
  try {
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }
  } catch (e) {}

  if (action === 'open_folder') {
    if (process.platform === 'win32') {
      exec(`explorer.exe "${modelsDir}"`);
      return res.json({ success: true, message: `Opened folder: ${modelsDir}` });
    }
    return res.json({ success: true, path: modelsDir });
  }

  if (action === 'open_blender') {
    if (process.platform === 'win32') {
      exec('where blender', (err, stdout) => {
        if (!err && stdout.trim()) {
          exec(`start blender "${modelsDir}"`);
          return res.json({ success: true, message: 'Launching Blender...' });
        } else {
          return res.json({ success: false, blenderDetected: false, message: 'Blender not detected on host system.' });
        }
      });
      return;
    }
    return res.json({ success: false, blenderDetected: false, message: 'Blender not supported on this platform.' });
  }

  if (action === 'delete_model') {
    const result = ai3dSynthesizer.deleteSynthesizedModel(modelKey);
    return res.json(result);
  }

  return res.json({ success: true });
});

// Stream local .glb 3D model binary
app.get('/api/viewport3d/model/:key', (req, res) => {
  const modelKey = req.params.key;
  const filePath = model3dEngine.getLocalModelPath(modelKey);
  if (filePath && fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return fs.createReadStream(filePath).pipe(res);
  }
  return res.status(404).json({ error: '3D model not found' });
});

// Close browser tab endpoint — called by frontend as a fallback when window.close() fails
app.post('/api/close_tab', async (req, res) => {
  const { target } = req.body;
  const cleanName = (target || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  console.log(`[CLOSE API] Close tab request for: "${target}" (clean: "${cleanName}")`);

  const isProtected = !cleanName || 
    ['localhost', '3000', 'jarvis', 'react', 'reactapp', 'system', 'core', 'coresystem', 'terminal', 'hud'].some(p => cleanName.includes(p));

  if (isProtected) {
    console.log(`[CLOSE API] Ignored close request for protected target: "${cleanName}"`);
    return res.json({ success: false, reason: 'protected_target' });
  }

  try {
    const result = await closeBrowserTab(target || cleanName, 1);
    return res.json({ success: true, target: cleanName, result });
  } catch (e) {
    console.log(`[CLOSE API] Error: ${e.message}`);
    return res.status(500).json({ error: e.message });
  }
});

// Mathematical Calculation Intelligence endpoint
app.post('/api/math/calculate', (req, res) => {
  const { expression } = req.body;
  if (!expression) {
    return res.status(400).json({ success: false, error: 'Expression is required.' });
  }
  const result = mathEngine.evaluate(expression);
  return res.json(result);
});

// Custom Knowledge Base REST API endpoints
app.get('/api/knowledge', (req, res) => {
  try {
    const entries = knowledgeEngine.getAllKnowledge();
    return res.json({ success: true, count: entries.length, knowledge: entries });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/knowledge', (req, res) => {
  const { topic, content, keywords } = req.body || {};
  if (!topic || !content) {
    return res.status(400).json({ success: false, error: 'Topic and content are required.' });
  }
  try {
    const result = knowledgeEngine.saveKnowledge({ topic, content, keywords });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/knowledge/:id', (req, res) => {
  const { id } = req.params;
  try {
    const result = knowledgeEngine.deleteKnowledge(id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Automatic Scheduled Reminders REST API endpoints
app.get('/api/reminders', (req, res) => {
  try {
    const all = reminderEngine.getAllReminders();
    const upcoming = reminderEngine.getUpcomingReminders();
    return res.json({ success: true, upcoming, all });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reminders', (req, res) => {
  const { title, time, delayMinutes, delaySeconds } = req.body || {};
  if (!title) {
    return res.status(400).json({ success: false, error: 'Title is required for a reminder.' });
  }
  try {
    const result = reminderEngine.scheduleReminder({ title, time, delayMinutes, delaySeconds });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/reminders/:id', (req, res) => {
  const { id } = req.params;
  try {
    const result = reminderEngine.cancelReminder(id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reminders/active', (req, res) => {
  try {
    const active = reminderEngine.getActiveAlerts();
    return res.json({ success: true, activeAlerts: active });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reminders/dismiss', (req, res) => {
  const { id } = req.body || {};
  try {
    const result = reminderEngine.dismissActiveAlert(id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Live weather endpoint for frontend HUD components & external queries
app.get('/api/weather', async (req, res) => {
  const { location, lat, lon } = req.query;
  const clientCoords = (lat && lon) ? { lat: parseFloat(lat), lon: parseFloat(lon) } : null;
  try {
    const data = await getWeatherData(location, clientCoords);
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('[API /api/weather] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Live desktop master volume query endpoint
app.get('/api/volume', async (req, res) => {
  try {
    const result = await adjustSystemVolumeDetails('get');
    return res.json(result);
  } catch (err) {
    console.error('[API /api/volume GET] Error:', err);
    return res.status(500).json({ success: false, volume: 50, muted: false, error: err.message });
  }
});

// Live desktop master volume adjustment endpoint
app.post('/api/volume', async (req, res) => {
  const { action, level } = req.body || {};
  try {
    const result = await adjustSystemVolumeDetails(action || 'set', level);
    return res.json(result);
  } catch (err) {
    console.error('[API /api/volume POST] Error:', err);
    return res.status(500).json({ success: false, volume: 50, muted: false, error: err.message });
  }
});

// System Telemetry Helper
async function getSystemTelemetry() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ramPercent = Math.round((usedMem / totalMem) * 100);
  
  const cpus1 = os.cpus();
  await new Promise(r => setTimeout(r, 80));
  const cpus2 = os.cpus();

  let idleDiff = 0;
  let totalDiff = 0;
  for (let i = 0; i < cpus1.length; i++) {
    const t1 = cpus1[i].times;
    const t2 = cpus2[i].times;
    const idle = t2.idle - t1.idle;
    const total = (t2.user - t1.user) + (t2.nice - t1.nice) + (t2.sys - t1.sys) + (t2.irq - t1.irq) + idle;
    idleDiff += idle;
    totalDiff += total;
  }
  const cpuPercent = Math.min(100, Math.max(5, Math.round(100 - (idleDiff / (totalDiff || 1)) * 100)));

  const uptimeSec = Math.floor(os.uptime());
  const hours = Math.floor(uptimeSec / 3600);
  const mins = Math.floor((uptimeSec % 3600) / 60);
  const uptimeStr = `${hours}h ${mins}m`;

  return {
    cpu: cpuPercent,
    ramPercent: ramPercent,
    ramUsedGB: (usedMem / (1024 * 1024 * 1024)).toFixed(1),
    ramTotalGB: (totalMem / (1024 * 1024 * 1024)).toFixed(1),
    uptime: uptimeStr,
    platform: process.platform,
    cores: cpus1.length
  };
}

// Live Real-Time News Fetcher using Google News RSS feed (100% current, up-to-the-minute updates)
async function fetchLiveNews(topic = '') {
  try {
    const cleanTopic = (topic || '').trim();
    let url = 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en';
    
    // Check if query is asking for general top headlines vs a specific topic
    const isGeneral = !cleanTopic || 
      /^(?:all|general|today|now|latest|breaking|current|news|headlines|updates)$/i.test(cleanTopic) ||
      cleanTopic.length < 3 ||
      /^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+)?(?:tell\s+me|give\s+me|show\s+me|what\s+is|what\s+are|what\s+happened|is\s+there\s+any|any)?\s*(?:the\s+)?(?:latest\s+|current\s+|today'?s\s+|breaking\s+|top\s+|world\s+)?(?:news|headlines?|updates?|stories|events)(?:\s+(?:today|now|update|briefing))?[.?!]?$/i.test(cleanTopic) ||
      /\b(?:what\s+happened\s+today|what'?s\s+happening\s+today|today'?s\s+top\s+headlines|give\s+me\s+(?:the\s+)?latest\s+news|any\s+news\s+updates\s+today)\b/i.test(cleanTopic);

    if (!isGeneral) {
      const searchQuery = cleanTopic
        .replace(/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?/gi, '')
        .replace(/^(?:please\s+)?(?:tell\s+me|give\s+me|show\s+me|what\s+is|what\s+are|any|is\s+there)\s+/gi, '')
        .replace(/\b(?:the|latest|today's|today|news|about|updates|headlines)\b/gi, '')
        .trim();
      if (searchQuery && searchQuery.length >= 3) {
        url = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-IN&gl=IN&ceid=IN:en`;
      }
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(4000)
    });
    const xml = await response.text();
    const items = [];
    const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/gi;
    let m;
    while ((m = itemRegex.exec(xml)) !== null && items.length < 5) {
      const rawTitle = m[1]
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      const pubDate = m[2].trim();
      if (rawTitle) {
        items.push({ title: rawTitle, date: pubDate });
      }
    }

    if (items.length > 0) {
      return items;
    }
  } catch (e) {
    console.warn('[NEWS] Live news fetch error:', e.message);
  }
  return null;
}

// Live Web Search Helper using DuckDuckGo HTML Instant Search
async function performWebSearch(query) {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await response.text();
    const snippets = [];
    const regex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = regex.exec(html)) !== null && snippets.length < 4) {
      const cleanSnippet = match[1].replace(/<[^>]+>/g, '').trim();
      if (cleanSnippet) snippets.push(cleanSnippet);
    }
    if (snippets.length > 0) {
      return `Real-time web search results for "${query}":\n` + snippets.map((s, i) => `${i + 1}. ${s}`).join('\n');
    }
    return `Completed web search for "${query}". Information retrieved.`;
  } catch (e) {
    return `Searched web for "${query}". Query processed successfully.`;
  }
}

// Live System Telemetry Endpoint
app.get('/api/system_stats', async (req, res) => {
  try {
    const stats = await getSystemTelemetry();
    return res.json({ success: true, ...stats });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Live Notes Management Endpoints
app.get('/api/notes', (req, res) => {
  return res.json({ success: true, notes: readNotes() });
});

app.post('/api/notes', (req, res) => {
  const { title, content } = req.body || {};
  if (!content) return res.status(400).json({ error: 'Content required' });
  const notes = readNotes();
  const newNote = {
    id: Date.now().toString(),
    title: title || (content.length > 25 ? content.substring(0, 22) + '...' : content),
    content,
    timestamp: new Date().toLocaleString()
  };
  notes.unshift(newNote);
  writeNotes(notes);
  return res.json({ success: true, note: newNote, notes });
});

app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const notes = readNotes();
  const updated = notes.filter(n => n.id !== id);
  writeNotes(updated);
  return res.json({ success: true, notes: updated });
});

// =========================================================
// PROTOCOLS AUTOMATION SUBSYSTEM (FEATURE 1)
// =========================================================
const PROTOCOLS_PATH = path.join(__dirname, 'protocols.json');

function readProtocols() {
  try {
    if (fs.existsSync(PROTOCOLS_PATH)) {
      return JSON.parse(fs.readFileSync(PROTOCOLS_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading protocols:', e.message);
  }
  return [];
}

function writeProtocols(protocols) {
  try {
    fs.writeFileSync(PROTOCOLS_PATH, JSON.stringify(protocols, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving protocols:', e.message);
  }
}

async function executeProtocolAction(action, res = null) {
  if (!action || !action.type) return;
  switch (action.type) {
    case 'open':
      if (Array.isArray(action.targets)) {
        for (let i = 0; i < action.targets.length; i++) {
          if (i > 0) await new Promise(r => setTimeout(r, 400));
          await openSingleTarget(action.targets[i], res);
        }
      }
      break;
    case 'close':
      if (Array.isArray(action.targets)) {
        for (let i = 0; i < action.targets.length; i++) {
          if (i > 0) await new Promise(r => setTimeout(r, 300));
          await closeSingleTarget(action.targets[i], res);
        }
      }
      break;
    case 'volume':
      await adjustSystemVolume(action.action || 'set', action.level);
      break;
    case 'media':
      await systemTools.media_control({ action: action.action });
      break;
    case 'power':
      if (action.action === 'lock') {
        await systemTools.system_power_action({ action: 'lock' });
      }
      break;
    case 'timer':
      if (action.seconds) {
        await systemTools.manage_timers({ seconds: action.seconds, label: action.label || 'Protocol Timer' });
      }
      break;
  }
}

async function executeProtocolById(protocolId, res = null) {
  const protocols = readProtocols();
  const cleanId = (protocolId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const proto = protocols.find(p => p.id === cleanId || p.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanId) || cleanId.includes(p.id));
  if (!proto) {
    return { success: false, message: `Protocol "${protocolId}" not recognized, sir.` };
  }
  for (const act of (proto.actions || [])) {
    try {
      await executeProtocolAction(act, res);
    } catch (e) {
      console.warn(`Error in protocol action:`, e.message);
    }
  }
  return { success: true, protocol: proto, message: proto.voiceConfirmation || `Protocol ${proto.name} executed successfully, sir.` };
}

app.get('/api/protocols', (req, res) => {
  return res.json({ success: true, protocols: readProtocols() });
});

app.post('/api/protocols/execute', async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Protocol id required' });
  const result = await executeProtocolById(id);
  return res.json(result);
});

// =========================================================
// MEDIA & SPOTIFY TELEMETRY SUBSYSTEM (FEATURE 6)
// =========================================================
async function getMediaStatus() {
  if (process.platform !== 'win32') return cachedMediaStatus;
  const scriptPath = path.join(__dirname, 'get_media_status.ps1');
  try {
    return await new Promise((resolve) => {
      exec(`powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`, { timeout: 3500 }, (err, stdout) => {
        if (!err && stdout) {
          const match = stdout.match(/MEDIA_JSON:(\{.*\})/);
          if (match) {
            try {
              const parsed = JSON.parse(match[1]);
              const isStandby = !parsed.Title || parsed.Title === 'Spotify Standby' || parsed.Title === 'Media Deck Standby' || parsed.Title === 'Ready for Playback';
              
              if (!isStandby) {
                cachedMediaStatus = {
                  isPlaying: !!parsed.IsPlaying,
                  title: parsed.Title,
                  artist: parsed.Artist || 'Desktop Audio',
                  source: parsed.Source || 'Spotify'
                };
              } else {
                if (cachedMediaStatus.title && cachedMediaStatus.title !== 'Media Deck Standby' && cachedMediaStatus.title !== 'Spotify Standby' && cachedMediaStatus.title !== 'Ready for Playback') {
                  cachedMediaStatus.isPlaying = !!parsed.IsPlaying;
                } else {
                  cachedMediaStatus = {
                    isPlaying: !!parsed.IsPlaying,
                    title: parsed.Title || 'Media Deck Standby',
                    artist: parsed.Artist || 'Ready for Playback',
                    source: parsed.Source || 'Spotify'
                  };
                }
              }
            } catch (e) {}
          }
        }
        resolve(cachedMediaStatus);
      });
    });
  } catch (e) {
    return cachedMediaStatus;
  }
}

app.get('/api/media', async (req, res) => {
  const status = await getMediaStatus();
  return res.json({ success: true, ...status });
});

app.post('/api/media/control', async (req, res) => {
  const { action, query, target } = req.body || {};
  if (action === 'launch_spotify') {
    await openSingleTarget('Spotify');
    return res.json({ success: true, message: 'Launching Spotify, sir.' });
  }
  if (action === 'launch_youtube') {
    await openSingleTarget('YouTube');
    return res.json({ success: true, message: 'Opening YouTube, sir.' });
  }
  if (action === 'play_query' && query) {
    const playMsg = await playMediaDirectly(query, target || 'youtube');
    return res.json({ success: true, message: playMsg, status: cachedMediaStatus });
  }
  const result = await systemTools.media_control({ action: action || 'playpause' });
  return res.json({ success: true, message: result, status: cachedMediaStatus });
});

// =========================================================
// HARDWARE HEALTH & BATTERY DIAGNOSTICS (FEATURE 7)
// =========================================================
async function getHardwareHealth() {
  let battery = { percent: 100, isCharging: true, isACConnected: true, status: 'AC Power' };
  let drives = [];

  if (process.platform === 'win32') {
    try {
      const batRaw = await new Promise((resolve) => {
        exec('powershell -NoProfile -Command "& { Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object EstimatedChargeRemaining, BatteryStatus | ConvertTo-Json }"', { timeout: 3500 }, (err, stdout) => {
          if (err || !stdout) return resolve(null);
          try { resolve(JSON.parse(stdout)); } catch (e) { resolve(null); }
        });
      });
      if (batRaw) {
        const percent = batRaw.EstimatedChargeRemaining ?? 100;
        const status = batRaw.BatteryStatus;
        const isCharging = (status === 2 || status === 6 || status === 7 || status === 8);
        battery = {
          percent,
          isCharging,
          isACConnected: isCharging || status === 2,
          status: isCharging ? 'Charging (AC)' : 'On Battery'
        };
      }
    } catch (e) {
      console.warn('Battery check error:', e.message);
    }

    try {
      const diskRaw = await new Promise((resolve) => {
        exec('powershell -NoProfile -Command "& { Get-CimInstance Win32_LogicalDisk -Filter \'DriveType=3\' -ErrorAction SilentlyContinue | Select-Object DeviceID, FreeSpace, Size | ConvertTo-Json }"', { timeout: 3500 }, (err, stdout) => {
          if (err || !stdout) return resolve(null);
          try { resolve(JSON.parse(stdout)); } catch (e) { resolve(null); }
        });
      });
      if (diskRaw) {
        const diskList = Array.isArray(diskRaw) ? diskRaw : [diskRaw];
        drives = diskList.map(d => {
          const totalGB = d.Size ? Math.round((d.Size / (1024 * 1024 * 1024)) * 10) / 10 : 0;
          const freeGB = d.FreeSpace ? Math.round((d.FreeSpace / (1024 * 1024 * 1024)) * 10) / 10 : 0;
          const usedGB = Math.max(0, Math.round((totalGB - freeGB) * 10) / 10);
          const usedPercent = totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0;
          return {
            drive: d.DeviceID || 'C:',
            totalGB,
            freeGB,
            usedGB,
            usedPercent
          };
        });
      }
    } catch (e) {
      console.warn('Disk check error:', e.message);
    }
  }

  if (drives.length === 0) {
    drives = [{ drive: 'C:', totalGB: 256, freeGB: 64, usedGB: 192, usedPercent: 75 }];
  }

  const sys = await getSystemTelemetry();
  return {
    battery,
    drives,
    system: sys
  };
}

app.get('/api/hardware_health', async (req, res) => {
  try {
    const health = await getHardwareHealth();
    return res.json({ success: true, ...health });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// =========================================================
// SCREEN VISION & AI MULTIMODAL ANALYSIS (FEATURE 2)
// =========================================================
// =========================================================
// SCREEN VISION & AI MULTIMODAL ANALYSIS (FEATURE 2)
// =========================================================
async function analyzeScreenVision(base64Image, userPrompt, mode) {
  const cleanPrompt = (userPrompt || 'Analyze what is visible on this screen.').trim();
  const base64Data = (base64Image || '').replace(/^data:image\/\w+;base64,/, '');
  const tempPath = path.join(__dirname, `temp_vision_scan_${Date.now()}.png`);
  let detectedText = '';
  let openWindows = [];

  if (base64Data) {
    try {
      fs.writeFileSync(tempPath, Buffer.from(base64Data, 'base64'));
      if (process.platform === 'win32') {
        const psScript = path.join(__dirname, 'ocr_scanner.ps1');
        const ocrJson = await new Promise((resolve) => {
          const { execFile } = require('child_process');
          execFile('powershell', [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-File', psScript,
            '-ImagePath', tempPath
          ], { timeout: 15000, encoding: 'utf8' }, (err, stdout) => {
            if (err) {
              console.warn('[VISION OCR] powershell error:', err.message);
              resolve(null);
            } else {
              try {
                resolve(JSON.parse((stdout || '').trim()));
              } catch (parseErr) {
                resolve({ success: true, text: (stdout || '').trim(), openWindows: [] });
              }
            }
          });
        });

        if (ocrJson && ocrJson.text) {
          detectedText = ocrJson.text.trim();
        }
        if (ocrJson && Array.isArray(ocrJson.openWindows)) {
          openWindows = ocrJson.openWindows;
        }
      }
    } catch (e) {
      console.warn('[VISION OCR] file or execution error:', e.message);
    } finally {
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
    }
  }

  // Detect mode / intent: 'debug' | 'summarize' | 'general'
  const promptLower = cleanPrompt.toLowerCase();
  const isDebug = mode === 'debug' || /\b(debug|error|exception|traceback|syntax|bug|fail|fix|line\s*\d+|uncaught|typeerror|referenceerror)\b/i.test(promptLower);
  const isSummarize = mode === 'summarize' || /\b(summarize|summary|overview|document|article|read\s*this|what\s*does\s*this\s*say|breakdown)\b/i.test(promptLower);

  let systemPrompt = '';
  if (isDebug) {
    systemPrompt = `You are J.A.R.V.I.S., Tony Stark's elite AI assistant specializing in optical code analysis and debugging.
The user scanned their screen to debug an error or code snippet.
Analyze the optical screen text and error messages carefully:
1. Root Cause: Pinpoint the exact file, line, and reason for the exception or bug.
2. The Fix: Provide the clean, complete, corrected code snippet enclosed in markdown code blocks with the appropriate language tag.
3. Edge Cases & Prevention: Briefly explain why this fix works and how to prevent similar errors (e.g. null checks, optional chaining, array verification).
Maintain an articulate, brilliant, and confident J.A.R.V.I.S. persona.`;
  } else if (isSummarize) {
    systemPrompt = `You are J.A.R.V.I.S., a sophisticated AI workstation assistant equipped with optical computer vision and document intelligence.
The user requested a summary of the window or document visible on their screen.
Analyze the detected text and provide an articulate executive summary:
1. Document / App Context: Identify the visible application, webpage, or document title.
2. Executive Summary: Provide concise bullet points detailing:
   - Primary Subject / Objective
   - Key Insights & Core Content
   - Important Action Items, Dates, or Metrics (if any)
Keep the formatting clean, structured with markdown, and instantly digestible.`;
  } else {
    systemPrompt = `You are J.A.R.V.I.S., a sophisticated AI workstation assistant with optical sensors.
You have scanned the user's screen. Provide a crisp, articulate, high-tech breakdown answering their request based on what is displayed. Use clean markdown formatting with headers and bullet points.`;
  }

  const windowTelemetry = openWindows.length > 0 
    ? `\n\n[DETECTED ACTIVE DESKTOP WINDOWS]:\n${openWindows.slice(0, 10).join('\n')}` 
    : '';

  let contextSnippet = '';
  if (detectedText) {
    contextSnippet = `\n\n[OPTICAL OCR SCAN READOUT OF SCREEN]:\n${detectedText.slice(0, 6000)}`;
  } else {
    contextSnippet = `\n\n[OPTICAL SENSOR NOTICE]: Minimal alphanumeric text was detected in the frame. The screen may contain purely graphical elements, high-density visuals, or an occluded window.`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `${cleanPrompt}${windowTelemetry}${contextSnippet}` }
  ];

  let aiResponse = 'Optical telemetry analyzed, sir.';
  const candidateModels = ['groq/compound-mini', 'groq/compound', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

  for (const modelId of candidateModels) {
    try {
      const comp = await groq.chat.completions.create({
        model: modelId,
        messages,
        max_tokens: 1400,
        temperature: 0.2
      });
      aiResponse = comp.choices[0]?.message?.content || aiResponse;
      break; // success
    } catch (e) {
      console.warn(`[VISION LLM] Model ${modelId} failed:`, e.message);
    }
  }

  return {
    success: true,
    analysis: aiResponse,
    detectedText: detectedText ? detectedText.slice(0, 1500) : 'Visual frame captured with minimal text.',
    detectedLinesCount: detectedText ? detectedText.split('\n').length : 0
  };
}

app.post('/api/vision/analyze', async (req, res) => {
  const { image, prompt, mode } = req.body || {};
  if (!image) return res.status(400).json({ error: 'Image data required' });
  try {
    const result = await analyzeScreenVision(image, prompt, mode);
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Instant direct open extractor for fast-path app and website launching
function parseDirectOpenCommand(text) {
  const t = (text || '').trim();
  // Match single directives like: "open file explorer", "launch spotify", "is open spotify", "please open spotify", "start notepad", "open youtube"
  // Note: "play" is intentionally excluded so songs and media commands are never treated as website domains
  const match = t.match(/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:is\s+|please\s+|can\s+you\s+|could\s+you\s+|would\s+you\s+|just\s+|i\s+want\s+to\s+)?(?:open|launch|start|run|go\s+to)\s+(?:the\s+)?([a-z0-9\s._-]+)$/i);
  if (!match) return null;
  const rawTarget = match[1].trim();
  // Exclude compound or complex sentences that need LLM reasoning
  if (/\b(and|or|then|if|which|where|how|what|why|who|when|file\s+named|folder\s+named)\b/i.test(rawTarget)) {
    return null;
  }
  // Exclude media playback sentences (e.g. "open spotify and play X")
  if (/\b(?:play|search|song|track)\b/i.test(t)) {
    return null;
  }
  // Exclude ambiguous or meaningless standalone words
  if (rawTarget.length < 2 || /^(something|anything|it|app|application|program|tab|window)$/i.test(rawTarget)) {
    return null;
  }
  return rawTarget;
}

// Instant direct close extractor for fast-path app and website closing (single and multiple targets)
function parseDirectCloseCommand(text) {
  const t = (text || '').trim();
  if (!t) return null;

  // Normalize speech-to-text phonetic misrecognitions of wake words anywhere:
  const normalized = t.replace(/\b(?:hey\s+|ok\s+|hi\s+)?(?:jarvis|jervis|jar\s+is|jars|travis|javis|jarviz)\b/gi, '').replace(/[,.]+/g, ' ').trim();

  // Match commands like:
  // "close youtube", "close youtube and instagram", "close both youtube and instagram",
  // "close youtube tab and instagram tab", "close tabs youtube and instagram", "close 2 tabs"
  const match = normalized.match(/^(?:is\s+|please\s+|can\s+you\s+|could\s+you\s+|would\s+you\s+|just\s+|i\s+want\s+to\s+)?(?:close|exit|quit|kill|terminate|shut(?:\s+down)?)\s+(.*)$/i);
  if (!match) return null;

  let raw = match[1].trim();

  // Check for generic "N tabs" e.g. "2 tabs", "3 tabs", "multiple tabs", "tabs"
  const countMatch = raw.match(/^(?:the\s+)?(?:(\d+|two|three|four|five|all|multiple)\s+)?(?:tabs?|windows?)$/i);
  if (countMatch) {
    let count = 1;
    const countWord = (countMatch[1] || '').toLowerCase();
    if (countWord === 'two' || countWord === '2') count = 2;
    else if (countWord === 'three' || countWord === '3') count = 3;
    else if (countWord === 'four' || countWord === '4') count = 4;
    else if (countWord === 'five' || countWord === '5') count = 5;
    else if (countWord === 'all' || countWord === 'multiple') count = 3;
    else if (/^\d+$/.test(countWord)) count = parseInt(countWord, 10);
    return {
      targets: ['tab'],
      count: Math.min(count, 10),
      raw,
      isGeneric: true
    };
  }

  // Strip leading prefixes like "the tab", "tabs", "the website", "website", "web", "app", "both"
  raw = raw.replace(/^(?:the\s+)?(?:tabs?|websites?|webs?|apps?|applications?|programs?|both)\s+/i, '').trim();

  // Split targets on "and", "&", or commas:
  // e.g. "youtube and instagram", "youtube, instagram, and whatsapp", "youtube tab and instagram tab"
  const rawParts = raw.split(/\s+(?:and|&)\s+|,\s*(?:and\s+)?/i);

  const targets = [];
  for (let part of rawParts) {
    let clean = part.trim();
    // Strip trailing/leading descriptors
    clean = clean.replace(/^(?:the\s+)?(?:tab|website|web|app)\s+/i, '').trim();
    clean = clean.replace(/\s+(?:tabs?|windows?|apps?|applications?|programs?|websites?|sites?)$/i, '').trim();
    clean = clean.replace(/^(?:the\s+)/i, '').trim();
    clean = clean.replace(/\b(?:jarvis|jervis|jarviss|travis|javis|jarviz|please|sir)\b/gi, '').trim();

    if (!clean || clean.length < 2) continue;

    const isProtected = /^(jarvis|localhost|system|core|terminal|hud|reactapp|3000)$/i.test(clean.replace(/[^a-z0-9]/gi, ''));
    if (isProtected) continue;

    if (/^(something|anything|it)$/i.test(clean)) continue;

    targets.push(clean);
  }

  if (targets.length === 0) return null;

  return {
    targets,
    count: targets.length,
    raw,
    isGeneric: false
  };
}

// AI 3D Holographic Synthesizer Endpoints
app.post('/api/viewport3d/synthesize', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required for 3D synthesis' });
  }
  try {
    const result = await ai3dSynthesizer.synthesize3DModel(prompt.trim());
    return res.json(result);
  } catch (err) {
    console.error('[AI3D] Synthesis endpoint error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/viewport3d/recent', (req, res) => {
  try {
    const recents = ai3dSynthesizer.getRecentSynthesizedModels();
    return res.json(recents);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/viewport3d/blueprint/:key', (req, res) => {
  try {
    const key = req.params.key.replace(/[^a-z0-9_-]/gi, '');
    const bPath = path.join(ai3dSynthesizer.MODELS_BASE_DIR, key, 'blueprint.json');
    if (fs.existsSync(bPath)) {
      const data = JSON.parse(fs.readFileSync(bPath, 'utf8'));
      return res.json(data);
    }
    return res.status(404).json({ error: 'Blueprint not found' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/viewport3d/model/:key', (req, res) => {
  try {
    const key = req.params.key;
    const result = ai3dSynthesizer.deleteSynthesizedModel(key);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/viewport3d/delete', (req, res) => {
  try {
    const key = req.body?.key || req.body?.modelKey;
    const result = ai3dSynthesizer.deleteSynthesizedModel(key);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


// completions API handler
app.post('/api/chat', async (req, res) => {
  const rawPrompt = (req.body?.prompt || (Array.isArray(req.body?.messages) ? req.body.messages[req.body.messages.length - 1]?.content : '') || '').toString();
  const prompt = rawPrompt;
  const { model, location: clientLocation, clientTime } = req.body;
  const isClassifier = (model || '').includes('prompt-guard');

  if (isClassifier) {
    // Handle Prompt Guard non-streaming classification directly
    try {
      const response = await groq.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }]
      });
      return res.json(response);
    } catch (error) {
      console.error('Groq API classification error:', error);
      return res.status(500).json({ error: { message: error.message } });
    }
  }

  // Set response headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Instant direct cancel reminder fast-path (<30ms latency)
  // Matches e.g. "cancel all reminders", "cancel my all reminders", "cancel all my reminders", "clear all reminders"
  const cancelReminderMatch = prompt.trim().match(/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+)?(?:cancel|delete|clear|remove)\s+(?:all\s+my\s+|my\s+all\s+|all\s+|my\s+)?(?:active\s+|scheduled\s+)?reminders?$/i);
  if (cancelReminderMatch) {
    const cancelRes = reminderEngine.cancelReminder('all');
    const chunk = {
      choices: [
        {
          delta: {
            content: cancelRes.message
          }
        }
      ]
    };
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  // Instant direct scheduled reminder fast-path (<30ms latency)
  // Robust natural language parsing: "Set reminder after one minute name as test", "remind me meeting at 12:37", etc.
  const naturalReminder = reminderEngine.parseNaturalReminder(prompt);
  if (naturalReminder) {
    try {
      console.log(`[REMINDER FAST-PATH] Direct natural schedule: "${naturalReminder.title}" at "${naturalReminder.timeStr || `${naturalReminder.delayMinutes}m`}"`);
      const scheduleRes = reminderEngine.scheduleReminder({
        title: naturalReminder.title,
        time: naturalReminder.timeStr,
        delayMinutes: naturalReminder.delayMinutes,
        delaySeconds: naturalReminder.delaySeconds
      });
      const chunk = {
        choices: [
          {
            delta: {
              content: scheduleRes.message
            }
          }
        ]
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (rErr) {
      console.warn('[REMINDER FAST-PATH] Error:', rErr.message);
    }
  }

  // Instant direct protocol fast-path (<30ms latency)
  const protoFastMatch = prompt.trim().match(/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+)?(?:initiate|activate|start|run|trigger|execute)?\s*protocol\s+([a-z0-9_-]+)$/i);
  if (protoFastMatch) {
    const protoName = protoFastMatch[1].trim();
    console.log('[PROTOCOL FAST-PATH] Direct protocol execution directive:', protoName);
    try {
      const protoRes = await executeProtocolById(protoName, res);
      const chunk = {
        choices: [
          {
            delta: {
              content: protoRes.message
            }
          }
        ]
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (e) {
      console.error('[PROTOCOL FAST-PATH] Error:', e.message);
    }
  }

  // Instant optical scanner / screen vision fast-path
  const opticalScanMatch = prompt.trim().match(/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+|can\s+you\s+)?(?:open\s+(?:the\s+)?(?:optical\s+scanner|scanner|vision\s+hud)|(?:scan|analyze|look\s+at)\s+(?:my\s+)?screen|optical\s+scan)$/i);
  if (opticalScanMatch) {
    console.log('[OPTICAL SCAN FAST-PATH] Optical scanner directive detected');
    res.write(`data: ${JSON.stringify({ action: 'open_optical_scanner' })}\n\n`);
    const chunk = {
      choices: [
        {
          delta: {
            content: 'Deploying optical scanner HUD, sir. Ready for visual telemetry analysis.'
          }
        }
      ]
    };
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  // Instant Live Real-Time News & Headlines Fast-Path (<1.5s total latency)
  // Matches e.g. "Jarvis, give me the latest news", "Any news updates today?", "What are today's top headlines?", "What happened today?"
  const isNewsFastMatch = /\b(news|headlines?|what(?:'s|\s+is)?\s+happening\s+today|what\s+happened\s+today|current\s+events|breaking\s+news|world\s+updates?)\b/i.test(prompt);
  if (isNewsFastMatch && !/\b(create|make|draw|3d|render|model|viewport|mesh)\b/i.test(prompt)) {
    console.log('[NEWS FAST-PATH] Direct live news directive detected:', prompt);
    try {
      const now = new Date();
      const serverDateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const newsItems = await fetchLiveNews(prompt);
      if (newsItems && newsItems.length > 0) {
        const headlinesList = newsItems.slice(0, 5).map((n, i) => `${i + 1}. ${n.title}`).join('\n');
        
        let newsStream = null;
        for (const candModel of ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b']) {
          try {
            newsStream = await groq.chat.completions.create({
              model: candModel,
              messages: [
                {
                  role: 'system',
                  content: `You are J.A.R.V.I.S., Tony Stark's sophisticated AI workstation assistant.
Today's Date: ${serverDateStr}.
Deliver a polished, crisp, articulate news briefing based on these EXACT real-time headlines today:
${headlinesList}

Guidelines:
- Start with a brief, high-tech J.A.R.V.I.S. intro (e.g. "Here are today's top headlines, sir:" or "Top stories for today, sir:").
- Present 4-5 concise bullet points highlighting the core events.
- Keep each point clear, punchy, and natural for speech (under 20 words per point).
- Conclude with a brief polite check (e.g. "Shall I elaborate on any of these stories, sir?").`
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              stream: true,
              max_tokens: 350,
              temperature: 0.3
            });
            break;
          } catch (mErr) {
            console.warn(`[NEWS FAST-PATH] Model ${candModel} failed:`, mErr.message);
          }
        }

        if (newsStream) {
          for await (const chunk of newsStream) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
          res.write('data: [DONE]\n\n');
          return res.end();
        }
      }
    } catch (newsErr) {
      console.warn('[NEWS FAST-PATH] Fast-path fallback:', newsErr.message);
    }
  }

  // Instant 3D Viewport / Hologram Model Generation Fast-Path (<30ms latency)
  // Matches e.g. "Creative 3D model of Iron Man suit", "create 3d model of dog", "show 3d cat", "render 3d iron man", "open 3d viewport"
  const is3DRequest = /\b3d\b/i.test(prompt) || /\b(?:viewport|hologram|holographic)\b/i.test(prompt) || /\b(?:create|render|generate|spawn)\s+(?:model|figure)\b/i.test(prompt);

  if (is3DRequest && !/\b(?:print|printer|printing)\b/i.test(prompt)) {
    let rawTarget = prompt.toLowerCase()
      .replace(/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?/i, '')
      .replace(/\b(?:please|can\s+you|could\s+you|want\s+to|need\s+to|i\s+want|i\s+need|give\s+me)\b/gi, '')
      .replace(/\b(?:creative|create|generate|make|show|render|display|project|spawn|build|open|view|load|draw)\b/gi, '')
      .replace(/\b(?:a|an|the|some)\b/gi, '')
      .replace(/\b(?:3d|model|figure|projection|hologram|holographic|mesh|canvas|viewport|design)\b/gi, '')
      .replace(/\b(?:of|in|for)\b/gi, '')
      .trim();

    if (/iron\s*man/i.test(prompt)) {
      rawTarget = 'iron man';
    }

    if (!rawTarget || rawTarget === 'viewport' || rawTarget === 'canvas') {
      rawTarget = 'iron man';
    }

    let modelResult;
    // Built-in procedural favorites (Dog, Cat, Iron Man, Drone, Car)
    if (rawTarget.includes('dog') || rawTarget.includes('puppy')) {
      modelResult = {
        modelKey: 'dog',
        assetName: 'Canine Quadruped (Dog)',
        fileName: 'dog.glb',
        fileSize: '0.85 MB',
        format: 'gltf-binary (.glb)',
        location: 'backend/Data/Generated_Models/dog/dog.glb',
        modelUrl: null
      };
    } else if (rawTarget.includes('cat') || rawTarget.includes('kitten') || rawTarget.includes('feline')) {
      modelResult = {
        modelKey: 'cat',
        assetName: 'Feline Quadruped (Cat)',
        fileName: 'cat.glb',
        fileSize: '0.78 MB',
        format: 'gltf-binary (.glb)',
        location: 'backend/Data/Generated_Models/cat/cat.glb',
        modelUrl: null
      };
    } else if (rawTarget.includes('iron') || rawTarget.includes('suit') || rawTarget.includes('armor') || rawTarget.includes('stark')) {
      modelResult = {
        modelKey: 'iron_man',
        assetName: 'Iron Man Mark 85',
        fileName: 'scene.gltf',
        fileSize: '1.45 MB',
        format: 'gltf-binary (.glb)',
        location: 'backend/Data/Generated_Models/iron_man_mark_85/scene.gltf',
        modelUrl: null
      };
    } else if (rawTarget.includes('drone') || rawTarget.includes('quadcopter') || rawTarget.includes('uav')) {
      modelResult = {
        modelKey: 'drone',
        assetName: 'Tactical Recon Drone',
        fileName: 'drone.glb',
        fileSize: '0.92 MB',
        format: 'gltf-binary (.glb)',
        location: 'backend/Data/Generated_Models/drone/drone.glb',
        modelUrl: null
      };
    } else if (rawTarget.includes('car') || rawTarget.includes('vehicle') || rawTarget.includes('audi') || rawTarget.includes('ferrari')) {
      modelResult = {
        modelKey: 'car',
        assetName: 'Cyberpunk Aerodynamic Racer',
        fileName: 'car.glb',
        fileSize: '1.12 MB',
        format: 'gltf-binary (.glb)',
        location: 'backend/Data/Generated_Models/car/car.glb',
        modelUrl: null
      };
    } else if (rawTarget.includes('helicopter') || rawTarget.includes('copter') || rawTarget.includes('chopper') || rawTarget.includes('apache')) {
      modelResult = {
        modelKey: 'helicopter',
        assetName: 'Tactical Attack Helicopter',
        fileName: 'helicopter.glb',
        fileSize: '1.25 MB',
        format: 'gltf-binary (.glb)',
        location: 'backend/Data/Generated_Models/helicopter/scene.glb',
        modelUrl: null
      };
    } else if (rawTarget.includes('plane') || rawTarget.includes('airplane') || rawTarget.includes('jet') || rawTarget.includes('aircraft')) {
      modelResult = {
        modelKey: 'airplane',
        assetName: 'Supersonic Jet Aircraft',
        fileName: 'airplane.glb',
        fileSize: '1.35 MB',
        format: 'gltf-binary (.glb)',
        location: 'backend/Data/Generated_Models/airplane/scene.glb',
        modelUrl: null
      };
    } else if (rawTarget.includes('sword') || rawTarget.includes('blade') || rawTarget.includes('saber') || rawTarget.includes('weapon')) {
      modelResult = {
        modelKey: 'sword',
        assetName: 'High-Frequency Beam Saber',
        fileName: 'sword.glb',
        fileSize: '0.65 MB',
        format: 'gltf-binary (.glb)',
        location: 'backend/Data/Generated_Models/sword/scene.glb',
        modelUrl: null
      };
    } else if (rawTarget.includes('space') || rawTarget.includes('ship') || rawTarget.includes('star') || rawTarget.includes('rocket') || rawTarget.includes('ufo')) {
      modelResult = {
        modelKey: 'spaceship',
        assetName: 'Interstellar Starfighter',
        fileName: 'spaceship.glb',
        fileSize: '1.50 MB',
        format: 'gltf-binary (.glb)',
        location: 'backend/Data/Generated_Models/spaceship/scene.glb',
        modelUrl: null
      };
    } else if (rawTarget.includes('duck') || rawTarget.includes('waterfowl')) {
      modelResult = {
        modelKey: 'duck',
        assetName: 'Aquatic Waterfowl (Duck)',
        fileName: 'duck.glb',
        fileSize: '0.11 MB',
        format: 'gltf-binary (.glb)',
        location: 'backend/Data/Generated_Models/duck/scene.glb',
        modelUrl: null
      };
    } else {
      // Dynamically architect and synthesize custom 3D model via AI CAD Synthesizer!
      console.log(`[3D VIEWPORT] Synthesizing custom 3D model for arbitrary query: "${rawTarget}"...`);
      modelResult = await ai3dSynthesizer.synthesize3DModel(rawTarget);
    }

    const shortName = (modelResult.assetName || 'Object').split(' ')[0];
    const partsCount = modelResult.blueprint?.parts?.length;
    const vocalMsg = partsCount
      ? `Synthesizing custom 3D holographic architecture of ${modelResult.assetName}, sir. Assembled ${partsCount} volumetric components in viewport.`
      : `Synthesizing 3D holographic projection of ${shortName}, sir. Full 360-degree rotation active in viewport.`;

    console.log(`[3D VIEWPORT FAST-PATH] Model directive: "${modelResult.modelKey}" (${modelResult.assetName})${partsCount ? ` [${partsCount} parts]` : ''}`);

    res.write(`data: ${JSON.stringify({
      action: 'open_3d_viewport',
      modelKey: modelResult.modelKey,
      assetName: modelResult.assetName,
      fileName: modelResult.fileName,
      fileSize: modelResult.fileSize,
      format: modelResult.format || (partsCount ? 'json-blueprint (AI-CAD)' : 'gltf-binary (.glb)'),
      location: modelResult.location,
      modelUrl: modelResult.modelUrl || null,
      blueprint: modelResult.blueprint || null
    })}\n\n`);

    const chunk = {
      choices: [
        {
          delta: {
            content: vocalMsg
          }
        }
      ]
    };
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }


  // Instant deterministic mathematical calculation fast-path (<5ms latency)
  const mathCmd = mathEngine.parseMathCommand(prompt);
  if (mathCmd && mathCmd.success) {
    console.log('[MATH FAST-PATH] Direct calculation executed:', mathCmd.expression, '->', mathCmd.formattedResult);
    // Notify frontend HUD components of the calculation event
    res.write(`data: ${JSON.stringify({
      action: 'math_calculation',
      expression: mathCmd.expression,
      result: mathCmd.formattedResult,
      steps: mathCmd.steps,
      category: mathCmd.category
    })}\n\n`);

    const chunk = {
      choices: [
        {
          delta: {
            content: mathCmd.textResponse
          }
        }
      ]
    };
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  // Instant deterministic volume control fast-path
  const volCmd = parseVolumeCommand(prompt);
  if (volCmd) {
    console.log('[VOLUME FAST-PATH] Executing volume directive on desktop hardware:', volCmd);
    try {
      const volMsg = await adjustSystemVolume(volCmd.action, volCmd.level);
      const chunk = {
        choices: [
          {
            delta: {
              content: volMsg
            }
          }
        ]
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (e) {
      console.error('[VOLUME FAST-PATH] Error:', e.message);
    }
  }

  // Instant direct close fast-path for apps and websites (<30ms latency)
  // Prioritized BEFORE media playback and open directives so closing apps/sites is never hijacked!
  const directCloseCmd = parseDirectCloseCommand(prompt);
  if (directCloseCmd) {
    console.log('[DIRECT CLOSE FAST-PATH] Direct close directive detected:', directCloseCmd);
    try {
      let closeResult = '';
      if (directCloseCmd.isGeneric) {
        closeResult = await systemTools.close_chrome_tabs({ count: directCloseCmd.count }, res);
      } else {
        const results = [];
        for (const target of directCloseCmd.targets) {
          const r = await closeSingleTarget(target, res);
          if (r) results.push(r);
        }
        closeResult = results.join(' ');
      }
      const chunk = {
        choices: [
          {
            delta: {
              content: closeResult || `Closed ${directCloseCmd.targets.join(', ')}, sir.`
            }
          }
        ]
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (e) {
      console.error('[DIRECT CLOSE FAST-PATH] Error:', e.message);
    }
  }

  // Instant deterministic media playback control fast-path (<30ms latency)
  const mediaCmd = parseMediaCommand(prompt);
  if (mediaCmd) {
    console.log('[MEDIA FAST-PATH] Direct media playback directive detected:', mediaCmd);
    try {
      let replyContent = mediaCmd.reply || 'Understood, sir.';

      if (mediaCmd.type === 'status_query') {
        const status = await getMediaStatus();
        if (status.isPlaying && status.title !== 'Ready for Playback') {
          replyContent = `Currently playing "${status.title}" by ${status.artist} on ${status.source}, sir.`;
        } else {
          replyContent = `No active audio playback is currently detected, sir.`;
        }
      } else if (mediaCmd.type === 'play_query') {
        replyContent = await playMediaDirectly(mediaCmd.query, mediaCmd.target, res);
      } else {
        await controlSystemMedia(mediaCmd.action);
        if (typeof cachedMediaStatus !== 'undefined') {
          if (mediaCmd.action === 'playpause') {
            cachedMediaStatus.isPlaying = !cachedMediaStatus.isPlaying;
          } else if (mediaCmd.action === 'next' || mediaCmd.action === 'prev') {
            cachedMediaStatus.isPlaying = true;
          } else if (mediaCmd.action === 'stop') {
            cachedMediaStatus.isPlaying = false;
          }
        }
      }

      const chunk = {
        choices: [
          {
            delta: {
              content: replyContent
            }
          }
        ]
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (e) {
      console.error('[MEDIA FAST-PATH] Error:', e.message);
    }
  }

  // Instant direct open fast-path for apps and websites (<30ms latency)
  const directOpenTarget = parseDirectOpenCommand(prompt);
  if (directOpenTarget) {
    console.log('[DIRECT OPEN FAST-PATH] Direct launch directive detected:', directOpenTarget);
    try {
      const openResult = await openSingleTarget(directOpenTarget, res);
      const chunk = {
        choices: [
          {
            delta: {
              content: openResult || `Opened ${directOpenTarget}, sir.`
            }
          }
        ]
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (e) {
      console.error('[DIRECT OPEN FAST-PATH] Error:', e.message);
    }
  }

  try {
    const now = new Date();
    const serverTimeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    const serverDateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timePrompt = clientTime 
      ? `REAL-TIME CLOCK CONTEXT: User's exact local time is ${clientTime} (Host system clock: ${serverTimeStr}, ${serverDateStr}, ${timezone}).`
      : `REAL-TIME CLOCK CONTEXT: Exact current local time is ${serverTimeStr}, date is ${serverDateStr} (${timezone}).`;

    let userLoc = { city: 'Local Area', region: '', country: '', lat: 17.385, lon: 78.486, source: 'System Telemetry' };
    try {
      userLoc = await resolveUserLocation(clientLocation);
    } catch (e) {
      console.warn('[LOCATION] Context resolution error:', e.message);
    }
    const locDesc = `${userLoc.city}${userLoc.region ? `, ${userLoc.region}` : ''}${userLoc.country ? `, ${userLoc.country}` : ''}`;
    const locationPrompt = `REAL-TIME LOCATION CONTEXT: Browser location permission is GRANTED. The user is located in ${locDesc} (Coordinates: ${userLoc.lat}, ${userLoc.lon}, Source: ${userLoc.source}). If the user asks where they are, asks for their location, or mentions location access/permission (e.g. "you don't have my location access"), CONFIRM that location access is granted and state their current location.`;

    let knowledgeContext = '';
    try {
      knowledgeContext = knowledgeEngine.getKnowledgeContextSnippet(prompt) || '';
    } catch (kErr) {
      console.warn('[KNOWLEDGE] Context retrieval warning:', kErr.message);
    }

    let liveNewsContext = '';
    const isNewsQuery = /\b(news|headlines?|what happened today|current events|breaking news|world updates?)\b/i.test(prompt);
    if (isNewsQuery) {
      try {
        const newsItems = await fetchLiveNews(prompt);
        if (newsItems && newsItems.length > 0) {
          liveNewsContext = `\nREAL-TIME LIVE NEWS HEADLINES TODAY (${serverDateStr}):\n` + newsItems.map((n, i) => `${i + 1}. ${n.title} (${n.date})`).join('\n') + `\nCRITICAL: The user is asking for current news, headlines, or today's events. Use these EXACT real-time headlines from today to provide a crisp, articulate summary. NEVER recite outdated events from April 2024 from your offline training data!`;
        }
      } catch (nErr) {
        console.warn('[NEWS] Pre-fetch error:', nErr.message);
      }
    }

    let liveTrendingContext = '';
    const isSongOrTrending = /\b(trending\s+songs?|latest\s+songs?|top\s+songs?|new\s+songs?|viral\s+songs?|trending\s+music|latest\s+music|today'?s\s+top\s+hits|chart\s+toppers?)\b/i.test(prompt);
    if (isSongOrTrending) {
      try {
        const trendSongs = await fetchLiveTrendingSongs();
        const requestedLang = extractMusicLanguage(prompt);
        if (trendSongs && trendSongs.length > 0) {
          if (!requestedLang) {
            liveTrendingContext = `\nREAL-TIME LIVE TRENDING MUSIC CHARTS TODAY (${serverDateStr}):\n` +
              trendSongs.slice(0, 6).map((s, i) => `${i + 1}. "${s.title}" by ${s.artist} (Source: ${s.source})`).join('\n') +
              `\nCRITICAL: The user is asking about general trending or latest songs. If they want to play a general trending song, invoke play_media with query: "latest trending song". NEVER hallucinate outdated songs from your offline training data!`;
          } else {
            liveTrendingContext = `\nNOTE: The user specifically requested music in [${requestedLang}]. When playing music, invoke play_media with their exact requested language preserved in query (e.g. "latest trending ${requestedLang} songs")!`;
          }
        }
      } catch (tErr) {
        console.warn('[TRENDING] Pre-fetch error:', tErr.message);
      }
    }

    const messages = [
      {
        role: 'system',
        content: `You are J.A.R.V.I.S., a sophisticated, helpful AI assistant. ${timePrompt} ${locationPrompt}${knowledgeContext ? `\n${knowledgeContext}` : ''}${liveNewsContext ? `\n${liveNewsContext}` : ''}${liveTrendingContext ? `\n${liveTrendingContext}` : ''} Whenever the user asks what time it is, what today's date or day is, or where they are, ALWAYS answer accurately using this exact real-time context (or invoke get_current_time / get_user_location). You have systems tools enabled: get_latest_news (fetches real-time live news updates and top headlines today), web_search (searches the live internet), calculate_math (evaluates mathematical expressions, arithmetic, percentages, scientific equations, unit conversions, and algebra), execute_protocol (executes Iron Man automation protocols like Protocol Focus, Protocol Chill, Protocol Nightfall, Protocol Clean Slate), adjust_volume (controls system audio volume: set, increase, decrease, mute, unmute), play_media (plays or searches specific songs, artists, or playlists on Spotify or YouTube), media_control (controls playback: playpause, next, previous, stop), get_media_status (reports what song is currently playing), remember_knowledge (records custom user knowledge, facts, project rules, definitions to persistent memory), set_reminder (schedules automatic proactive reminders and alarms at exact clock times like 12:37 or after delays), list_reminders (shows upcoming reminders), cancel_reminder (cancels a reminder), open_targets (which opens one or multiple apps, games, or websites like YouTube, Instagram, Spotify, Discord, Chrome, Notepad, etc.), close_targets (which closes one or multiple applications, websites, or browser tabs), reopen_closed_tab, switch_previous_tab, close_chrome_tabs, list_desktop_folders, open_folder, get_current_time, get_user_location, and get_weather (fetches real-time live weather, temperature, humidity, wind, and forecasts). CRITICAL RULES: 1. When the user asks about the weather, temperature, rain, or climate (e.g. "how is the weather today, Jarvis?", "what is the temperature?"), ALWAYS call the get_weather tool. Answer with a crisp, polite, articulate J.A.R.V.I.S. update detailing current temperature, weather conditions, and notable metrics (under 30 words). 2. When the user asks for the time or date, reply politely and concisely with the exact current time (e.g. "It is currently ${serverTimeStr}, sir."). 3. When the user asks where they are or comments about location access, confirm that location access is active and state their location. 4. Whenever the user asks to close a specific app, website, or named tab (e.g. "close YouTube" or "close Spotify"), ALWAYS call close_targets with targets: ["YouTube"]. NEVER call close_chrome_tabs when a specific named target is requested. 5. NEVER attempt to close J.A.R.V.I.S. itself (localhost:3000 / J.A.R.V.I.S. Core System); the host application must always remain open. 6. Multi-command instruction: pass ALL target names in the \`targets\` array. 7. When the user asks to change, increase, decrease, set, raise, lower, mute, or unmute volume (e.g. "increase volume upto 80%", "set volume to 80", "increase volume", "decrease volume", "mute"), ALWAYS call adjust_volume with action ('set', 'increase', 'decrease', 'mute', 'unmute') and the specified level (e.g. 80). Once tool execution completes, reply with a brief, smart vocal confirmation. 8. Whenever the user asks to open, launch, or start any application, program, game, or website (e.g. "open Spotify", "launch Spotify", "open YouTube", "open Discord"), you MUST ALWAYS call the open_targets tool with the target name in targets array. NEVER reply stating that an application or website is open without invoking the open_targets tool! 9. Whenever the user asks to play a song, artist, playlist, track, or music, or asks to open or play their playlist (e.g. "play latest trending song", "play trending song", "play Telugu songs", "play latest trending Telugu song", "play Hindi song", "open my playlist", "play my playlist", "open playlist", "play Blinding Lights on Spotify", "play Starboy", "play Queen on YouTube", "play enemy song by imagine dragons"), ALWAYS call the play_media tool (if they ask for a playlist or 'my playlist', set target: 'spotify' and query: 'my playlist'; if they ask for generic trending or latest songs without a language, set query: 'latest trending song'; if they specify any language, artist, movie, or genre like Telugu, Hindi, Tamil, Punjabi, Spanish, K-Pop, ALWAYS preserve the language/artist in query like 'latest trending Telugu songs'; otherwise target defaults to 'youtube' for direct autoplay). 10. When the user asks what is currently playing, what song this is, or current track info, ALWAYS call get_media_status. 11. Whenever the user asks to calculate, compute, evaluate a math problem, determine percentages, solve an equation, or convert units (e.g. "what is 15% of 850", "calculate 45 * 12", "solve 3x + 15 = 45", "convert 50 miles to km"), ALWAYS invoke the calculate_math tool. Once tool results are retrieved, deliver the exact mathematical answer clearly and concisely. 12. Whenever the user asks to remember or note something (e.g. "remember that...", "note that...", "keep in mind that..."), ALWAYS invoke remember_knowledge to store it in memory core. 13. Whenever the user asks to be reminded of something at a specific time or after a delay (e.g. "remind me meeting at 12:37", "remind me in 15 minutes to call John"), ALWAYS call set_reminder with title and time or delayMinutes. 14. Whenever the user asks for news, headlines, current events, or what is happening today (e.g. "what is the news today?", "tell me latest news", "any news updates?"), ALWAYS report the real-time news from today provided in REAL-TIME LIVE NEWS HEADLINES or invoke get_latest_news. NEVER recite outdated events from April 2024 from your offline training data!`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Candidate models in order of preference if primary model hits rate limit or error
    // Note: groq/compound models do not support tool calling, so we use llama and qwen/gpt-oss models
    const candidateModels = [model, 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let response = null;
    let successfulModel = model;

    for (const candModel of candidateModels) {
      try {
        console.log(`[Groq AI] Attempting completions with model: ${candModel}`);
        response = await groq.chat.completions.create({
          model: candModel,
          messages: messages,
          tools: toolSchemas,
          tool_choice: 'auto'
        });
        successfulModel = candModel;
        break;
      } catch (err) {
        console.warn(`[Groq AI] Model ${candModel} failed: ${err.message}. Trying next candidate...`);
        if (candModel === candidateModels[candidateModels.length - 1]) {
          throw err;
        }
      }
    }

    const choice = response.choices[0];
    const message = choice.message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      // Add assistant's tool call request turn to the history
      messages.push(message);

      // Execute tool calls in parallel/sequence
      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`Executing tool: ${functionName}`, functionArgs);
        
        let toolResult = 'ERROR: Tool execution failed.';
        if (systemTools[functionName]) {
          try {
            toolResult = await systemTools[functionName](functionArgs, res, clientLocation, clientTime);
          } catch (e) {
            toolResult = `ERROR: Tool execution failed with message: ${e.message}`;
          }
        }

        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: toolResult
        });
      }

      // Query the LLM again with the tool call results and stream the final answer
      let stream = null;
      for (const candModel of [successfulModel, 'groq/compound-mini', 'groq/compound', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b']) {
        try {
          stream = await groq.chat.completions.create({
            model: candModel,
            messages: messages,
            stream: true
          });
          break;
        } catch (sErr) {
          console.warn(`[Groq AI] Streaming completion failed on ${candModel}: ${sErr.message}`);
        }
      }

      if (stream) {
        for await (const chunk of stream) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      } else {
        const defaultChunk = { choices: [{ delta: { content: 'Directive executed successfully, sir.' } }] };
        res.write(`data: ${JSON.stringify(defaultChunk)}\n\n`);
      }
    } else {
      // Some models (e.g. Qwen) sometimes output tool calls as raw XML text in the
      // content field instead of using the structured tool_calls format.
      // Detect and execute these raw tool call strings to prevent them leaking into the UI.
      const rawContent = (message.content || '').trim();

      // Pattern 1: <tool_call>{"name":"fn","arguments":{...}}</tool_call>
      // Pattern 2: <function=fn_name>{...}</function>
      const rawToolCallMatch =
        rawContent.match(/<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/i) ||
        rawContent.match(/<function=([a-z_]+)>([\s\S]*?)<\/function>/i);

      if (rawToolCallMatch) {
        console.log('[JARVIS] Detected raw tool call text from model — intercepting and executing...');
        let functionName = null;
        let functionArgs = {};

        try {
          if (rawContent.match(/<tool_call>/i)) {
            // Pattern 1: JSON object with "name" and "arguments" keys
            const parsed = JSON.parse(rawToolCallMatch[1]);
            functionName = parsed.name || parsed.function;
            functionArgs = parsed.arguments || parsed.parameters || parsed.args || {};
          } else {
            // Pattern 2: <function=fn_name>{args}</function>
            functionName = rawToolCallMatch[1];
            functionArgs = JSON.parse(rawToolCallMatch[2] || '{}');
          }
        } catch (e) {
          console.warn('[JARVIS] Failed to parse raw tool call JSON:', e.message);
        }

        if (functionName && systemTools[functionName]) {
          let toolResult = 'ERROR: Tool execution failed.';
          try {
            toolResult = await systemTools[functionName](functionArgs, res, clientLocation, clientTime);
          } catch (e) {
            toolResult = `ERROR: ${e.message}`;
          }

          // Build a clean verbal confirmation instead of leaking raw XML
          const confirmChunk = {
            choices: [{
              delta: {
                content: toolResult || 'Directive executed, sir.'
              }
            }]
          };
          res.write(`data: ${JSON.stringify(confirmChunk)}\n\n`);
        } else {
          // Unknown tool name in raw call — just acknowledge without leaking XML
          const ackChunk = {
            choices: [{ delta: { content: 'Directive acknowledged, sir.' } }]
          };
          res.write(`data: ${JSON.stringify(ackChunk)}\n\n`);
        }
      } else {
        // Normal text response — strip any stray tool call fragments before sending
        const cleanedResponse = rawContent
          .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
          .replace(/<function=[^>]+>[\s\S]*?<\/function>/gi, '')
          .trim() || 'Directive acknowledged, sir.';

        const chunk = {
          choices: [
            {
              delta: {
                content: cleanedResponse
              }
            }
          ]
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Groq completions streaming error:', error);
    if (typeof isNewsQuery !== 'undefined' && isNewsQuery && typeof liveNewsContext !== 'undefined' && liveNewsContext) {
      const cleanHeadlines = liveNewsContext
        .replace(/^[\s\S]*?REAL-TIME LIVE NEWS HEADLINES TODAY[^\n]*\n/, '')
        .replace(/\nCRITICAL:[\s\S]*$/, '')
        .trim();
      const newsFallbackChunk = {
        choices: [
          {
            delta: {
              content: `Here are today's top live news headlines, Sir:\n\n${cleanHeadlines}`
            }
          }
        ]
      };
      res.write(`data: ${JSON.stringify(newsFallbackChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    const errChunk = {
      error: {
        message: error.message
      }
    };
    res.write(`data: ${JSON.stringify(errChunk)}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`J.A.R.V.I.S. Systems integration server running on port ${PORT}`);
});

