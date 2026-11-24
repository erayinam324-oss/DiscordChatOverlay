const { contextBridge, ipcRenderer } = require('electron');

// Guvenlik: Bu API sadece yerel (file://) ayar sayfasina acilir.
// Uzak sayfa (StreamKit) bu fonksiyonlara erisemez.
if (window.location.protocol === 'file:') {
  contextBridge.exposeInMainWorld('overlayAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
    closeSettings: () => ipcRenderer.invoke('close-settings'),
    openStreamKit: () => ipcRenderer.invoke('open-streamkit'),
    checkUpdates: () => ipcRenderer.invoke('check-updates'),
    quit: () => ipcRenderer.invoke('quit-app')
  });
}
