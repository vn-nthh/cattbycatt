const { contextBridge, ipcRenderer } = require('electron')

console.log('Preload script is loading...')

// Expose a tiny API if needed later
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (key) => ipcRenderer.invoke('set-api-key', key),
  deleteApiKey: () => ipcRenderer.invoke('delete-api-key'),
  validateApiKey: (key) => ipcRenderer.invoke('validate-api-key', key),
  getLocale: () => ipcRenderer.invoke('get-locale'),
  chooseDirectory: () => ipcRenderer.invoke('choose-directory'),
  prepareOfflineModels: (dir) => ipcRenderer.invoke('prepare-offline-models', dir),
  hasOfflineModels: (dir) => ipcRenderer.invoke('has-offline-models', dir),
  validateOfflineModels: (dir) => ipcRenderer.invoke('validate-offline-models', dir),
  offlineTranscribe: (payload) => ipcRenderer.invoke('offline-transcribe', payload),
  offlineTranslate: (payload) => ipcRenderer.invoke('offline-translate', payload),
})

console.log('Preload script loaded, electron API exposed')


