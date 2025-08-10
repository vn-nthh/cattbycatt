import { app, BrowserWindow, ipcMain, dialog } from 'electron'
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

// Offline models support
ipcMain.handle('choose-directory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
  if (result.canceled || !result.filePaths[0]) return null
  return result.filePaths[0]
})

ipcMain.handle('has-offline-models', async (_e, dir) => {
  try {
    if (!dir) return false
    const base = path.join(dir, 'transformers')
    const whisper = path.join(base, 'Xenova', 'whisper-base')
    const nllb = path.join(base, 'Xenova', 'nllb-200-distilled-600M')
    return fs.existsSync(whisper) && fs.existsSync(nllb)
  } catch {
    return false
  }
})

ipcMain.handle('prepare-offline-models', async (_event, dir) => {
  if (!dir) return { ok: false, error: 'No directory specified' }
  try {
    const target = path.join(dir, 'transformers')
    fs.mkdirSync(target, { recursive: true })
    // Warm pipelines to trigger downloads to cacheDir
    try {
      await ensureNodePipelines(dir)
    } catch (e) {
      // Ignore warmup errors; user may be offline. We'll lazy-load on first use.
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err && (err.message || String(err))) || 'Unknown error' }
  }
})

ipcMain.handle('validate-offline-models', async (_e, dir) => {
  try {
    if (!dir) return { ok: false, error: 'No directory' }
    const { asr, translate } = await ensureNodePipelines(dir)
    // Do a tiny no-op run to ensure both pipelines are operational
    const test = await translate('hello', { src_lang: 'eng_Latn', tgt_lang: 'jpn_Jpan', num_beams: 1, do_sample: false })
    if (!test) return { ok: false, error: 'Translate failed' }
    // Whisper requires audio; simulate a tiny silent buffer
    const silent = new Float32Array(1600)
    await asr(silent, { sampling_rate: 16000, chunk_length_s: 1 })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message || String(err) }
  }
})

// Optional: Node-side inference (not used for now; renderer runs ONNX)
let cachedASR = null
let cachedTranslate = null
let cachedDir = null

async function ensureNodePipelines(dir) {
  if (!dir) throw new Error('No model directory provided')
  if (cachedASR && cachedTranslate && cachedDir === dir) return { asr: cachedASR, translate: cachedTranslate }
  const { pipeline, env } = await import('@xenova/transformers')
  env.allowRemoteModels = true
  env.cacheDir = path.join(dir, 'transformers')
  // Prefer onnxruntime-node in main process
  try {
    env.backends.onnx.wasm.numThreads = Math.max(1, require('os').cpus()?.length || 4)
  } catch {}
  cachedASR = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base')
  cachedTranslate = await pipeline('translation', 'Xenova/nllb-200-distilled-600M', { quantized: true })
  cachedDir = dir
  return { asr: cachedASR, translate: cachedTranslate }
}

ipcMain.handle('offline-transcribe', async (_e, payload) => {
  try {
    const { audio, sampleRate = 16000, dir } = payload || {}
    const { asr } = await ensureNodePipelines(dir)
    const floatArray = new Float32Array(audio?.buffer ? audio.buffer : audio)
    const result = await asr(floatArray, { chunk_length_s: 30, return_timestamps: false, sampling_rate: sampleRate })
    const text = (result?.text || '').trim()
    return { ok: true, text }
  } catch (err) {
    return { ok: false, error: err?.message || String(err) }
  }
})

ipcMain.handle('offline-translate', async (_e, payload) => {
  try {
    const { text, sourceLanguage, targetLanguage, dir } = payload || {}
    const { translate } = await ensureNodePipelines(dir)
    const map = { en: 'eng_Latn', ja: 'jpn_Jpan', ko: 'kor_Hang' }
    const src = map[sourceLanguage] || 'eng_Latn'
    const tgt = map[targetLanguage] || 'eng_Latn'
    const out = await translate(text, { src_lang: src, tgt_lang: tgt, num_beams: 1, do_sample: false })
    let translation = ''
    if (typeof out === 'string') translation = out
    else if (Array.isArray(out) && out[0]?.translation_text) translation = String(out[0].translation_text)
    else if (out?.translation_text) translation = String(out.translation_text)
    return { ok: true, translation }
  } catch (err) {
    return { ok: false, error: err?.message || String(err) }
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


