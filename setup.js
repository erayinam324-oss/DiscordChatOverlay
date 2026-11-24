const $ = (id) => document.getElementById(id);

function showMsg(text, ok) {
  const el = $('msg');
  el.textContent = text;
  el.className = 'msg ' + (ok ? 'ok' : 'err');
}

function updateBadges() {
  const delay = parseInt($('chatDelaySec').value, 10) || 0;
  $('delayBadge').textContent = delay === 0 ? 'Kapalı' : `${delay} sn`;

  document.querySelectorAll('.preset').forEach((btn) => {
    btn.classList.toggle('active', parseInt(btn.dataset.delay, 10) === delay);
  });

  const scale = parseFloat($('fontScale').value) || 1;
  $('scaleBadge').textContent = `%${Math.round(scale * 100)}`;

  const refresh = parseInt($('statusRefreshSec').value, 10) || 15;
  $('refreshBadge').textContent = `${refresh} sn`;
}

// Tab switching
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    $('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// Delay preset buttons
document.querySelectorAll('.preset').forEach((btn) => {
  btn.addEventListener('click', () => {
    $('chatDelaySec').value = btn.dataset.delay;
    updateBadges();
  });
});

$('chatDelaySec').addEventListener('input', updateBadges);
$('fontScale').addEventListener('input', updateBadges);
$('statusRefreshSec').addEventListener('input', updateBadges);

async function init() {
  try {
    const cfg = await window.overlayAPI.getConfig();
    $('url').value = cfg.url || '';
    $('width').value = cfg.width || 480;
    $('height').value = cfg.height || 720;
    $('background').value = cfg.background || 'transparent';
    $('fontScale').value = String(cfg.fontScale || 1);
    $('chatDelaySec').value = String(cfg.chatDelaySec || 0);

    $('url2').value = cfg.url2 || '';
    $('width2').value = cfg.width2 || 340;
    $('height2').value = cfg.height2 || 120;
    $('background2').value = cfg.background2 || 'transparent';
    $('statusRefreshSec').value = String(cfg.statusRefreshSec || 15);
    $('updateRepo').value = cfg.updateRepo || '';

    updateBadges();
  } catch (e) {
    showMsg('Ayarlar okunamadı: ' + e.message, false);
  }
}

$('openStreamKitTop').addEventListener('click', async () => {
  try {
    await window.overlayAPI.openStreamKit();
    showMsg('StreamKit tarayıcıda açıldı. Linki kopyalayıp yapıştırabilirsin.', true);
  } catch (e) {
    showMsg('Açılamadı: ' + e.message, false);
  }
});

$('closeBtn').addEventListener('click', () => {
  window.overlayAPI.closeSettings();
});

$('quitBtn').addEventListener('click', () => {
  window.overlayAPI.quit();
});

$('save').addEventListener('click', async () => {
  const url = $('url').value.trim();

  if (!url) {
    showMsg('Önce StreamKit sohbet linkini yapıştır.', false);
    return;
  }

  let host = '';
  try {
    host = new URL(url).hostname;
  } catch (e) {
    showMsg('Geçerli bir link değil. https://streamkit.discord.com/overlay/chat/... olmalı.', false);
    return;
  }

  if (host !== 'streamkit.discord.com') {
    showMsg('Bu link StreamKit linki değil. streamkit.discord.com ile başlamalı.', false);
    return;
  }

  const url2 = $('url2').value.trim();
  if (url2) {
    let host2 = '';
    try {
      host2 = new URL(url2).hostname;
    } catch (e) {
      showMsg('Durum linki geçerli değil. https://streamkit.discord.com/overlay/status/... olmalı.', false);
      return;
    }
    if (host2 !== 'streamkit.discord.com') {
      showMsg('Durum linki StreamKit linki değil. streamkit.discord.com ile başlamalı.', false);
      return;
    }
  }

  const payload = {
    url: url,
    width: parseInt($('width').value, 10) || 480,
    height: parseInt($('height').value, 10) || 720,
    background: $('background').value,
    fontScale: parseFloat($('fontScale').value) || 1,
    chatDelaySec: parseInt($('chatDelaySec').value, 10) || 0,

    url2: url2,
    width2: parseInt($('width2').value, 10) || 340,
    height2: parseInt($('height2').value, 10) || 120,
    background2: $('background2').value,
    statusRefreshSec: parseInt($('statusRefreshSec').value, 10) || 15,
    updateRepo: $('updateRepo').value.trim()
  };

  try {
    await window.overlayAPI.saveConfig(payload);
    showMsg('Kaydedildi, katmanlar açılıyor...', true);
  } catch (e) {
    showMsg('Kaydedilemedi: ' + e.message, false);
  }
});

init();
