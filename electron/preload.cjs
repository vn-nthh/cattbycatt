const { contextBridge, ipcRenderer } = require('electron')

console.log('Preload script is loading...')

// Expose a tiny API if needed later
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (key) => ipcRenderer.invoke('set-api-key', key),
  deleteApiKey: () => ipcRenderer.invoke('delete-api-key'),
})

console.log('Preload script loaded, electron API exposed')


