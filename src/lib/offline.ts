// Offline ASR and Translation using @xenova/transformers (ONNX)
// Lazy-load pipelines and cache instances

export interface OfflineInitOptions {
  cacheDir?: string
}

type ASRPipeline = any
type TranslationPipeline = any

let asrPipeline: ASRPipeline | null = null
let translationPipeline: TranslationPipeline | null = null
let initializedCacheDir: string | null = null

function getPreferredDevice(): 'webgpu' | 'wasm' {
  try {
    // Prefer WebGPU when available in the renderer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (typeof navigator !== 'undefined' && (navigator as any)?.gpu) ? 'webgpu' : 'wasm'
  } catch {
    return 'wasm'
  }
}

async function loadTransformers(cacheDir?: string) {
  const mod = await import('@xenova/transformers')
  const { env } = mod as any
  // Hint cache location for Electron renderer
  if (cacheDir) {
    try {
      if (typeof process !== 'undefined' && process.env) process.env.TRANSFORMERS_CACHE = cacheDir
      ;(globalThis as any).TRANSFORMERS_CACHE = cacheDir
    } catch {}
    try {
      env.cacheDir = cacheDir.endsWith('transformers') ? cacheDir : `${cacheDir}/transformers`
    } catch {}
  }
  // Use ONNX backends; allow WebGPU if available, otherwise WASM
  env.allowRemoteModels = true
  // Force remote fetch in browser to avoid dev server intercepts
  env.allowLocalModels = false
  env.remoteModelProxy = 'https://huggingface.co'
  // Ensure ORT wasm assets resolve in dev
  try { env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/' } catch {}
  env.backends.onnx.wasm.numThreads = Math.max(1, (navigator as any)?.hardwareConcurrency || 4)
  return mod
}

export async function preloadOffline(options: OfflineInitOptions = {}) {
  const { pipeline } = await loadTransformers(options.cacheDir)
  initializedCacheDir = options.cacheDir || null
  // Preload ASR (Whisper base) and Translation (M2M100-418M)
  const device = getPreferredDevice()
  if (!asrPipeline) asrPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', { device })
  if (!translationPipeline) translationPipeline = await pipeline('translation', 'Xenova/nllb-200-distilled-600M', { quantized: true, device })
}

export async function transcribeOffline(params: {
  audio: Float32Array
  sampleRate?: number
  cacheDir?: string
}): Promise<{ text: string; confidence?: number }> {
  if (!asrPipeline) {
    await preloadOffline({ cacheDir: params.cacheDir })
  }
  const sr = params.sampleRate ?? 16000
  const result = await asrPipeline!(params.audio, {
    chunk_length_s: 30,
    return_timestamps: false,
    sampling_rate: sr,
    device: getPreferredDevice(),
  })
  const text: string = (result?.text || '').trim()
  return { text }
}

export async function translateOffline(params: {
  text: string
  sourceLanguage: string
  targetLanguage: string
  cacheDir?: string
}): Promise<string> {
  if (!translationPipeline) {
    await preloadOffline({ cacheDir: params.cacheDir })
  }
  const src = mapLang(params.sourceLanguage)
  const tgt = mapLang(params.targetLanguage)
  const out = await translationPipeline!(params.text, { src_lang: src, tgt_lang: tgt, num_beams: 1, do_sample: false, device: getPreferredDevice() })
  // Transformers.js returns string or object depending on pipeline; normalize
  if (typeof out === 'string') return out
  if (Array.isArray(out) && out[0]?.translation_text) return String(out[0].translation_text)
  if (out?.translation_text) return String(out.translation_text)
  return ''
}

function mapLang(code: string): string {
  // NLLB-200 language tags
  const mapping: Record<string, string> = {
    en: 'eng_Latn',
    ja: 'jpn_Jpan',
    ko: 'kor_Hang',
  }
  return mapping[code] || 'eng_Latn'
}


