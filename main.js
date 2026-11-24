const {
  app, BrowserWindow, ipcMain, globalShortcut, screen, shell,
  Tray, Menu, nativeImage
} = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const STREAMKIT_HOST = 'streamkit.discord.com';

const DEFAULTS = {
  // Sohbet katmani
  url: '',
  width: 480,
  height: 720,
  x: null,
  y: null,
  background: 'transparent',
  fontScale: 1,
  chatDelaySec: 0,
  // Durum (status) katmani
  url2: '',
  width2: 340,
  height2: 120,
  x2: null,
  y2: null,
  background2: 'transparent',
  statusRefreshSec: 15,
  // Otomatik guncelleme (GitHub: "kullanici/repo")
  updateRepo: ''
};

const SPECS = {
  chat: {
    name: 'chat',
    urlKey: 'url',
    wKey: 'width', hKey: 'height',
    xKey: 'x', yKey: 'y',
    bgKey: 'background',
    zoomKey: 'fontScale',
    defW: 480, defH: 720,
    taskbar: false
  },
  status: {
    name: 'status',
    urlKey: 'url2',
    wKey: 'width2', hKey: 'height2',
    xKey: 'x2', yKey: 'y2',
    bgKey: 'background2',
    zoomKey: null,
    defW: 340, defH: 120,
    taskbar: true
  }
};

let tray = null;
let clickThrough = false;
let suppressPersist = false;
let config = loadConfig();

const windows = { chat: null, status: null };
const cssKeys = { chat: null, status: null };
const persistTimers = { chat: null, status: null };
let statusRefreshTimer = null;

/* ---------------- yardimcilar ---------------- */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function loadConfig() {
  try {
    let raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    raw = raw.replace(/^\uFEFF/, '');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

function saveConfig(patch) {
  config = { ...loadConfig(), ...patch };
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.error('config yazilamadi:', e);
  }
  return config;
}

function isStreamKit(url) {
  try {
    return new URL(url).hostname === STREAMKIT_HOST;
  } catch (e) {
    return false;
  }
}

function extractGuildIdFromStatusUrl(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/overlay\/status\/(\d+)/);
    return m ? m[1] : null;
  } catch (e) {
    return null;
  }
}

function fetchWidgetPresence(guildId) {
  return new Promise((resolve) => {
    const req = https.get(
      `https://discord.com/api/guilds/${guildId}/widget.json`,
      { timeout: 6000 },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return resolve(null);
        }
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (typeof data.presence_count === 'number') {
              resolve(data.presence_count);
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/* ---------------- katman css & scriptler ---------------- */

function clearOverlayCSS(spec, wdw) {
  if (wdw && !wdw.isDestroyed() && cssKeys[spec.name]) {
    wdw.webContents.removeInsertedCSS(cssKeys[spec.name]).catch(() => {});
    cssKeys[spec.name] = null;
  }
}

function applyOverlayCSS(spec, wdw) {
  if (!wdw || wdw.isDestroyed()) return;
  clearOverlayCSS(spec, wdw);

  const isDark = config[spec.bgKey] === 'dark';
  const bg = isDark ? 'rgba(15, 17, 23, 0.72)' : 'transparent';
  const radius = isDark ? '14px' : '0px';
  const border = isDark ? '1px solid rgba(255, 255, 255, 0.08)' : 'none';

  const css = `
    html, body {
      background: ${bg} !important;
      border-radius: ${radius} !important;
      border: ${border} !important;
      margin: 0 !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }
    #__dragbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 24px;
      z-index: 2147483647;
      -webkit-app-region: drag;
      background: transparent;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
    }
    #__dragbar::after {
      content: '';
      width: 44px;
      height: 4px;
      border-radius: 99px;
      background: rgba(255, 255, 255, 0);
      transition: background 0.2s ease;
    }
    #__dragbar:hover {
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.35), transparent);
    }
    #__dragbar:hover::after {
      background: rgba(255, 255, 255, 0.55);
    }
    .__delayed_msg_hidden {
      opacity: 0 !important;
      max-height: 0 !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      overflow: hidden !important;
      transform: translateY(10px) !important;
      pointer-events: none !important;
    }
    .__delayed_msg_show {
      transition: opacity 0.28s ease, transform 0.28s ease, max-height 0.28s ease !important;
    }
  `;

  wdw.webContents.insertCSS(css)
    .then((key) => { cssKeys[spec.name] = key; })
    .catch(() => {});

  wdw.webContents.executeJavaScript(
    `(function(){
       if (document.getElementById('__dragbar')) return;
       var d = document.createElement('div');
       d.id = '__dragbar';
       document.body.appendChild(d);
     })();`
  ).catch(() => {});
}

function injectChatDelay(wdw, delaySec) {
  if (!wdw || wdw.isDestroyed()) return;
  const delayMs = Math.max(0, Math.round((Number(delaySec) || 0) * 1000));

  const js = `
    (function() {
      window.__chatDelayMs = ${delayMs};
      if (window.__chatDelayObserver) {
        window.__chatDelayObserver.disconnect();
        window.__chatDelayObserver = null;
      }
      if (window.__chatDelayMs <= 0) return;

      // Mevcut mesajlari isaretle ki sadece yeni gelenler geciksin
      document.querySelectorAll('li, [class*="message"], [class*="Message"]').forEach(function(el) {
        el.dataset.__seen = '1';
      });

      function handleNode(node) {
        if (!node || node.nodeType !== 1) return;
        if (node.id === '__dragbar' || node.dataset.__seen) return;
        var cls = (typeof node.className === 'string') ? node.className : '';
        var isMsg = node.tagName === 'LI' || /message/i.test(cls);
        if (!isMsg) return;

        node.dataset.__seen = '1';
        var d = window.__chatDelayMs || 0;
        if (d <= 0) return;

        node.classList.add('__delayed_msg_hidden');
        setTimeout(function() {
          if (!node.isConnected) return;
          node.classList.add('__delayed_msg_show');
          node.classList.remove('__delayed_msg_hidden');
        }, d);
      }

      var obs = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            handleNode(added[j]);
          }
        }
      });

      obs.observe(document.body, { childList: true, subtree: true });
      window.__chatDelayObserver = obs;
    })();
  `;

  wdw.webContents.executeJavaScript(js).catch(() => {});
}

/* ---------------- canli online sayaci yenileme ---------------- */

function stopStatusRefresh() {
  if (statusRefreshTimer) {
    clearInterval(statusRefreshTimer);
    statusRefreshTimer = null;
  }
}

function fetchCountViaHiddenWindow(url) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val, hidden) => {
      if (settled) return;
      settled = true;
      if (hidden && !hidden.isDestroyed()) hidden.destroy();
      resolve(val);
    };

    const hidden = new BrowserWindow({
      show: false,
      width: 340,
      height: 120,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    });

    const timer = setTimeout(() => finish(null, hidden), 8000);

    hidden.webContents.on('did-finish-load', () => {
      // StreamKit JS'in sayiyi DOM'a yazmasi icin kisa bekleme
      setTimeout(async () => {
        if (settled || hidden.isDestroyed()) return;
        const count = await hidden.webContents.executeJavaScript(`
          (function() {
            var m = (document.body.innerText || '').match(/(\\d+)\\s*(online|çevrimiçi|cevrimici)/i);
            return m ? parseInt(m[1], 10) : null;
          })();
        `).catch(() => null);
        clearTimeout(timer);
        finish(count, hidden);
      }, 1500);
    });

    hidden.webContents.on('did-fail-load', () => {
      clearTimeout(timer);
      finish(null, hidden);
    });

    hidden.loadURL(url);
  });
}

function updateStatusDomCount(wdw, count) {
  if (!wdw || wdw.isDestroyed() || count === null) return Promise.resolve(false);
  return wdw.webContents.executeJavaScript(`
    (function(newCount) {
      var updated = false;
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      var node;
      while ((node = walker.nextNode())) {
        var txt = node.nodeValue || '';
        if (/\\d+\\s*(online|çevrimiçi|cevrimici)/i.test(txt)) {
          var next = txt.replace(/\\d+/, String(newCount));
          if (node.nodeValue !== next) node.nodeValue = next;
          updated = true;
        }
      }
      return updated;
    })(${Number(count)});
  `).catch(() => false);
}

function startStatusRefresh() {
  stopStatusRefresh();
  const sec = clamp(Number(config.statusRefreshSec) || 15, 5, 120);
  const guildId = extractGuildIdFromStatusUrl(config.url2 || '');

  statusRefreshTimer = setInterval(async () => {
    const wdw = windows.status;
    if (!wdw || wdw.isDestroyed() || !wdw.isVisible()) return;
    const curUrl = wdw.webContents.getURL();
    if (!isStreamKit(curUrl)) return;

    // 1. Once Discord widget.json API'den anlik sayiyi cek (en hizli, 0 titreme)
    let count = guildId ? await fetchWidgetPresence(guildId) : null;

    // 2. Widget API kapaliysa gizli arka plan penceresinden yeni sayiyi cek (gorunen banner ASLA kapanip acilmaz)
    if (count === null) {
      count = await fetchCountViaHiddenWindow(curUrl);
    }

    if (count !== null && !wdw.isDestroyed()) {
      await updateStatusDomCount(wdw, count);
    }
  }, sec * 1000);
}

/* ---------------- github otomatik guncelleyici ---------------- */

const UPDATE_FILES = ['main.js', 'preload.js', 'setup.html', 'setup.css', 'setup.js', 'package.json'];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 8000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function isNewerVersion(remote, local) {
  const r = String(remote || '0.0.0').split('.').map(Number);
  const l = String(local || '0.0.0').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

async function checkForUpdates(silent = true) {
  const repo = (config.updateRepo || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '');
  if (!repo || !repo.includes('/')) {
    return { status: 'no-repo' };
  }

  const base = `https://raw.githubusercontent.com/${repo}/main`;
  try {
    const localPkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const remotePkg = JSON.parse(await fetchText(`${base}/package.json`));

    if (!isNewerVersion(remotePkg.version, localPkg.version)) {
      return { status: 'up-to-date', version: localPkg.version };
    }

    // Yeni surum bulundu: tum kod dosyalarini indir (config.json'a DOKUNMA)
    const downloaded = {};
    for (const file of UPDATE_FILES) {
      downloaded[file] = await fetchText(`${base}/${file}`);
    }
    for (const file of UPDATE_FILES) {
      fs.writeFileSync(path.join(__dirname, file), downloaded[file], 'utf8');
    }

    app.relaunch();
    app.exit(0);
    return { status: 'updated', version: remotePkg.version };
  } catch (e) {
    if (!silent) console.warn('Guncelleme hatasi:', e.message);
    return { status: 'error', error: e.message };
  }
}

/* ---------------- pencere olusturma ---------------- */

function buildWindow(spec) {
  const area = screen.getPrimaryDisplay().workAreaSize;

  const w = clamp(Number(config[spec.wKey]) || spec.defW, 160, area.width);
  const h = clamp(Number(config[spec.hKey]) || spec.defH, 60, area.height);

  let x = config[spec.xKey];
  let y = config[spec.yKey];
  if (x == null) x = spec.name === 'chat' ? Math.max(0, area.width - w - 24) : 24;
  if (y == null) y = spec.name === 'chat' ? Math.max(0, Math.round((area.height - h) / 2)) : 24;

  const wdw = new BrowserWindow({
    width: w,
    height: h,
    x: x,
    y: y,
    minWidth: 160,
    minHeight: 60,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: spec.taskbar,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  wdw.setAlwaysOnTop(true, 'screen-saver');
  wdw.setMenuBarVisibility(false);

  wdw.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  wdw.webContents.on('did-finish-load', () => {
    const u = wdw.webContents.getURL();
    if (isStreamKit(u)) {
      suppressPersist = false;
      applyOverlayCSS(spec, wdw);
      if (spec.zoomKey && config[spec.zoomKey]) {
        wdw.webContents.setZoomFactor(Number(config[spec.zoomKey]) || 1);
      }
      if (spec.name === 'chat') {
        injectChatDelay(wdw, config.chatDelaySec);
      }
    } else {
      clearOverlayCSS(spec, wdw);
    }
  });

  wdw.webContents.on('context-menu', () => {
    buildContextMenu().popup({ window: wdw });
  });

  wdw.once('ready-to-show', () => wdw.show());

  wdw.on('moved', () => schedulePersistBounds(spec, wdw));
  wdw.on('resized', () => schedulePersistBounds(spec, wdw));

  wdw.on('closed', () => {
    if (windows[spec.name] === wdw) windows[spec.name] = null;
    if (spec.name === 'status') stopStatusRefresh();
  });

  return wdw;
}

function wireLoad(spec, wdw) {
  const url = (config[spec.urlKey] || '').trim();
  if (url && isStreamKit(url)) {
    wdw.loadURL(url);
  } else if (spec.name === 'chat') {
    openSettings();
  }
}

function createChatWindow() {
  if (windows.chat && !windows.chat.isDestroyed()) return windows.chat;
  const wdw = buildWindow(SPECS.chat);
  windows.chat = wdw;
  wireLoad(SPECS.chat, wdw);
  return wdw;
}

function createStatusWindow() {
  if (windows.status && !windows.status.isDestroyed()) return windows.status;
  if (!config.url2 || !isStreamKit(config.url2)) return null;
  const wdw = buildWindow(SPECS.status);
  windows.status = wdw;
  wireLoad(SPECS.status, wdw);
  startStatusRefresh();
  return wdw;
}

function destroyStatusWindow() {
  stopStatusRefresh();
  if (windows.status && !windows.status.isDestroyed()) {
    windows.status.destroy();
  }
  windows.status = null;
}

function schedulePersistBounds(spec, wdw) {
  if (persistTimers[spec.name]) clearTimeout(persistTimers[spec.name]);
  persistTimers[spec.name] = setTimeout(() => {
    persistBounds(spec, wdw);
  }, 300);
}

function persistBounds(spec, wdw) {
  if (!wdw || wdw.isDestroyed()) return;
  if (suppressPersist) return;
  if (wdw.webContents.getURL().startsWith('file:')) return;

  const b = wdw.getBounds();
  config = saveConfig({
    [spec.xKey]: b.x,
    [spec.yKey]: b.y,
    [spec.wKey]: b.width,
    [spec.hKey]: b.height
  });
}

function ensureWindowVisible(wdw, fully) {
  if (!wdw || wdw.isDestroyed()) return;
  const b = wdw.getBounds();
  const visible = screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    if (fully) {
      return (
        b.x >= a.x &&
        b.y >= a.y &&
        b.x + b.width <= a.x + a.width &&
        b.y + b.height <= a.y + a.height
      );
    }
    return (
      b.x < a.x + a.width &&
      b.x + b.width > a.x &&
      b.y < a.y + a.height &&
      b.y + b.height > a.y
    );
  });
  if (!visible) wdw.center();
}

function restoreChatBounds(wdw) {
  if (!wdw || wdw.isDestroyed()) return;
  const area = screen.getPrimaryDisplay().workAreaSize;
  const w = clamp(Number(config.width) || 480, 160, area.width);
  const h = clamp(Number(config.height) || 720, 60, area.height);
  wdw.setSize(Math.round(w), Math.round(h));
  if (config.x != null && config.y != null) {
    wdw.setPosition(Math.round(config.x), Math.round(config.y));
  }
  ensureWindowVisible(wdw, true);
}

/* ---------------- eylemler ---------------- */

function applyClickThrough(value) {
  clickThrough = value;
  Object.values(windows).forEach((w) => {
    if (w && !w.isDestroyed()) {
      w.setIgnoreMouseEvents(value, { forward: true });
      w.setTitle(value ? 'Katman KİLİTLİ' : 'Katman');
    }
  });
}

function openSettings() {
  const wdw = createChatWindow();
  if (!wdw) return;

  suppressPersist = true;
  applyClickThrough(false);
  clearOverlayCSS(SPECS.chat, wdw);

  const area = screen.getPrimaryDisplay().workAreaSize;
  wdw.setSize(540, Math.min(680, area.height - 40));
  wdw.center();

  wdw.show();
  wdw.focus();
  wdw.loadFile('setup.html');
  updateTray();
}

function closeSettings() {
  if (config.url && isStreamKit(config.url)) {
    const cw = createChatWindow();
    suppressPersist = true;
    restoreChatBounds(cw);
    cw.loadURL(config.url);
  } else {
    app.quit();
  }
}

function toggleClickThrough() {
  applyClickThrough(!clickThrough);
  updateTray();
}

function toggleVisibility() {
  const list = Object.values(windows).filter((w) => w && !w.isDestroyed());
  if (list.length === 0) {
    createChatWindow();
    return;
  }
  const anyVisible = list.some((w) => w.isVisible());
  list.forEach((w) => { anyVisible ? w.hide() : w.show(); });
}

function reloadAll() {
  suppressPersist = false;
  applyClickThrough(false);

  if (config.url && isStreamKit(config.url)) {
    const cw = createChatWindow();
    clearOverlayCSS(SPECS.chat, cw);
    restoreChatBounds(cw);
    cw.loadURL(config.url);
  } else {
    openSettings();
  }

  if (config.url2 && isStreamKit(config.url2)) {
    if (windows.status && !windows.status.isDestroyed()) {
      windows.status.webContents.reloadIgnoringCache();
      startStatusRefresh();
    } else {
      createStatusWindow();
    }
  } else {
    destroyStatusWindow();
  }

  updateTray();
}

/* ---------------- menuler ---------------- */

function buildMenuTemplate() {
  const delayLabel = config.chatDelaySec > 0 ? `Sohbet Gecikmesi: ${config.chatDelaySec} sn` : 'Sohbet Gecikmesi: Kapalı';
  return [
    { label: '⚙  Ayarlar & Linkler', accelerator: 'Ctrl+Shift+O', click: openSettings },
    { label: '🔄  Katmanları Yenile', click: reloadAll },
    { label: '⬇  Güncellemeleri Kontrol Et', click: () => { checkForUpdates(false); } },
    { type: 'separator' },
    { label: clickThrough ? '🔓  Kilidi Aç' : '🔒  Kilitle (Tıklama Geçir)', type: 'checkbox', checked: clickThrough, accelerator: 'Ctrl+Shift+L', click: toggleClickThrough },
    { label: '👁  Katmanları Gizle / Göster', accelerator: 'Ctrl+Shift+H', click: toggleVisibility },
    { type: 'separator' },
    { label: `⏱  ${delayLabel}`, enabled: false },
    { type: 'separator' },
    { label: '✕  Çıkış', accelerator: 'Ctrl+Shift+Q', click: () => app.quit() }
  ];
}

function buildContextMenu() {
  return Menu.buildFromTemplate(buildMenuTemplate());
}

function updateTray() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate(buildMenuTemplate()));
}

function createTray() {
  let img = nativeImage.createEmpty();
  try {
    const p = path.join(__dirname, 'icon.png');
    if (fs.existsSync(p)) img = nativeImage.createFromPath(p);
  } catch (e) { /* bos ikon */ }

  tray = new Tray(img);
  tray.setToolTip('Discord Chat Overlay — Ayarlar için sağ tık');
  tray.on('click', () => {
    if (!windows.chat) createChatWindow();
    Object.values(windows).forEach((w) => {
      if (w && !w.isDestroyed()) { w.show(); }
    });
    if (windows.chat && !windows.chat.isDestroyed()) windows.chat.focus();
  });
  updateTray();
}

/* ---------------- kisayollar ---------------- */

function registerShortcuts() {
  const tryReg = (accel, fn) => {
    try {
      const ok = globalShortcut.register(accel, fn);
      if (!ok) console.warn('Kisayol kaydedilemedi:', accel);
    } catch (e) {
      console.warn('Kisayol hatasi:', accel, e.message);
    }
  };

  tryReg('Control+Shift+O', openSettings);
  tryReg('Control+Alt+O', openSettings);
  tryReg('Control+Shift+L', toggleClickThrough);
  tryReg('Control+Shift+H', toggleVisibility);
  tryReg('Control+Shift+Q', () => app.quit());
}

/* ---------------- ipc ---------------- */

function num(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

ipcMain.handle('get-config', () => loadConfig());

ipcMain.handle('close-settings', () => {
  closeSettings();
  return true;
});

ipcMain.handle('save-config', (_e, patch) => {
  const clean = {
    url: typeof patch.url === 'string' ? patch.url.trim() : '',
    width: clamp(num(patch.width, 480), 160, 3000),
    height: clamp(num(patch.height, 720), 60, 3000),
    background: patch.background === 'dark' ? 'dark' : 'transparent',
    fontScale: clamp(num(patch.fontScale, 1), 0.7, 1.8),
    chatDelaySec: clamp(num(patch.chatDelaySec, 0), 0, 60),

    url2: typeof patch.url2 === 'string' ? patch.url2.trim() : '',
    width2: clamp(num(patch.width2, 340), 160, 3000),
    height2: clamp(num(patch.height2, 120), 60, 3000),
    background2: patch.background2 === 'dark' ? 'dark' : 'transparent',
    statusRefreshSec: clamp(num(patch.statusRefreshSec, 15), 5, 120),
    updateRepo: typeof patch.updateRepo === 'string' ? patch.updateRepo.trim() : (config.updateRepo || '')
  };
  config = saveConfig(clean);

  applyClickThrough(false);

  // Sohbet katmani
  const cw = createChatWindow();
  clearOverlayCSS(SPECS.chat, cw);
  suppressPersist = true;
  restoreChatBounds(cw);
  if (config.url && isStreamKit(config.url)) {
    cw.loadURL(config.url);
  } else {
    cw.loadFile('setup.html');
  }

  // Durum katmani
  destroyStatusWindow();
  if (config.url2 && isStreamKit(config.url2)) {
    createStatusWindow();
  }

  updateTray();
  return config;
});

ipcMain.handle('open-streamkit', async () => {
  await shell.openExternal('https://streamkit.discord.com/overlay');
  return true;
});

ipcMain.handle('quit-app', () => {
  app.quit();
  return true;
});

/* ---------------- yasam dongusu ---------------- */

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (windows.chat) {
      if (windows.chat.isMinimized()) windows.chat.restore();
      windows.chat.show();
      windows.chat.focus();
    }
  });

  app.whenReady().then(() => {
    createChatWindow();
    if (config.url2 && isStreamKit(config.url2)) createStatusWindow();
    createTray();
    registerShortcuts();
    setTimeout(() => { checkForUpdates(true); }, 3000);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createChatWindow();
    });
  });

  app.on('will-quit', () => {
    stopStatusRefresh();
    globalShortcut.unregisterAll();
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
