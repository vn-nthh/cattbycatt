import { app, BrowserWindow, ipcMain } from 'electron'
import keytar from 'keytar'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

process.env.ELECTRON = 'true'
// Suppress security warnings in development only
if (!app.isPackaged) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.cjs')
  console.log('Preload path:', preloadPath)
  console.log('Preload file exists:', fs.existsSync(preloadPath))
  
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    useContentSize: true,
    backgroundColor: '#0d0c13',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#ffffff',
      height: 32,
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Temporarily disable sandbox to test preload
      preload: preloadPath,
    },
    autoHideMenuBar: true,
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
  if (!app.isPackaged) win.loadURL(devServerUrl + '?electron=1')
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

// Secure key storage via Keytar
const SERVICE_NAME = 'CATTbyCatt'
const ACCOUNT_NAME = 'groq_api_key'

ipcMain.handle('get-api-key', async () => {
  try {
    const value = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME)
    return value || null
  } catch (err) {
    console.error('get-api-key error:', err)
    return null
  }
})

ipcMain.handle('set-api-key', async (_event, apiKey) => {
  try {
    console.log('Main process: set-api-key called with:', typeof apiKey, apiKey?.length)
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      console.log('Main process: Invalid API key')
      return false
    }
    console.log('Main process: Attempting to save to keytar...')
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, apiKey.trim())
    console.log('Main process: Successfully saved to keytar')
    return true
  } catch (err) {
    console.error('set-api-key error:', err)
    return false
  }
})

ipcMain.handle('delete-api-key', async () => {
  try {
    const deleted = await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME)
    return deleted
  } catch (err) {
    console.error('delete-api-key error:', err)
    return false
  }
})

// Validate Groq API key by calling a lightweight endpoint
ipcMain.handle('validate-api-key', async (_event, apiKey) => {
  try {
    if (typeof apiKey !== 'string' || !apiKey.trim()) return false
    const resp = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
    })
    return resp.ok
  } catch (err) {
    console.error('validate-api-key error:', err)
    return false
  }
})

// Provide OS locale to renderer for default language selection
ipcMain.handle('get-locale', async () => {
  try {
    return app.getLocale()
  } catch (err) {
    console.error('get-locale error:', err)
    return 'en'
  }
})

app.whenReady().then(async () => {
  // Test keytar availability
  try {
    console.log('Testing keytar availability...')
    await keytar.setPassword('test-service', 'test-account', 'test-value')
    const retrieved = await keytar.getPassword('test-service', 'test-account')
    console.log('Keytar test successful, retrieved:', retrieved)
    await keytar.deletePassword('test-service', 'test-account')
  } catch (err) {
    console.error('Keytar test failed:', err)
  }
  
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})


