const $ = (id) => document.getElementById(id);

const DEFAULTS = {
  enabled: true,
  chatUrl: '',
  statusUrl: '',
  background: 'transparent',
  opacity: 100,
  clickThrough: false
};

function showMsg(text, ok) {
  const el = $('msg');
  el.textContent = text;
  el.className = 'msg ' + (ok ? 'ok' : 'err');
}

function isStreamKit(url) {
  try {
    return new URL(url).hostname === 'streamkit.discord.com';
  } catch (e) {
    return false;
  }
}

$('opacity').addEventListener('input', () => {
  $('opVal').textContent = '%' + $('opacity').value;
});

chrome.storage.local.get(DEFAULTS, (cfg) => {
  $('enabled').checked = cfg.enabled;
  $('chatUrl').value = cfg.chatUrl || '';
  $('statusUrl').value = cfg.statusUrl || '';
  $('background').value = cfg.background || 'transparent';
  $('opacity').value = cfg.opacity || 100;
  $('opVal').textContent = '%' + (cfg.opacity || 100);
  $('clickThrough').checked = !!cfg.clickThrough;
});

$('save').addEventListener('click', () => {
  const chatUrl = $('chatUrl').value.trim();
  const statusUrl = $('statusUrl').value.trim();

  if (chatUrl && !isStreamKit(chatUrl)) {
    showMsg('Sohbet linki streamkit.discord.com ile başlamalı.', false);
    return;
  }
  if (statusUrl && !isStreamKit(statusUrl)) {
    showMsg('Durum linki streamkit.discord.com ile başlamalı.', false);
    return;
  }

  chrome.storage.local.set({
    enabled: $('enabled').checked,
    chatUrl,
    statusUrl,
    background: $('background').value,
    opacity: parseInt($('opacity').value, 10) || 100,
    clickThrough: $('clickThrough').checked
  }, () => {
    showMsg('Kaydedildi! Açık sekmelere uygulandı.', true);
  });
});

$('resetPos').addEventListener('click', () => {
  chrome.storage.local.remove(['chatBox', 'statusBox'], () => {
    showMsg('Konumlar sıfırlandı.', true);
  });
});
