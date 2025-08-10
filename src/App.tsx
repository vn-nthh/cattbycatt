import { useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import ServerExportView from "./components/ServerExportView";
import CSSCustomizer from "./components/CSSCustomizer";
import { getSessionId } from "./lib/session";
import { MicVAD } from "@ricky0123/vad-web";
import { transcribeOffline, translateOffline } from "./lib/offline";

// Suppress ONNX Runtime warnings about unused initializers
if (typeof window !== 'undefined') {
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    // Filter out ONNX Runtime warnings about unused initializers
    const message = args.join(' ');
    if (message.includes('onnxruntime') && message.includes('Removing initializer') && message.includes('It is not used by any node')) {
      return; // Suppress this specific warning
    }
    originalConsoleWarn(...args);
  };
}

// Define supported languages
const LANGUAGES = {
  en: "English",
  ja: "Japanese",
  ko: "Korean",
} as const;

// Internationalization for main app
interface MainAppTranslations {
  // App title and description
  appTitle: string;
  appSubtitle: string;
  loading: string;
  
  // Language selection
  chooseLanguage: string;
  selectLanguage: string;
  chooseLangNext: string;
  setKeyFirst: string;
  setKeyFirstTitle: string;
  getGroqKeyHelpBefore: string;
  getGroqKeyHelpAfter: string;
  
  // Settings
  useAdvancedAsr: string;
  
  // Actions
  startListening: string;
  customizeObsStyling: string;
  changeApiKey: string;
  offlineSetupNext: string;
  offlineBackToApiKey: string;
  configureKeyOrModel: string;
  
  // Console page
  console: string;
  stopAndReset: string;
  listening: string;
  
  // Language labels
  original: string;
  inputDevice: string;
  microphone: string;
  offlineModelDirectory: string;
  
  // Links
  openObsView: string;
  customizeObs: string;
  linkCopied: string;
  useOfflineInstead: string;
  chooseModelFolderHelp: string;
  modelDirectoryPlaceholder: string;
  browse: string;
  modelsReady: string;
  preparing: string;
  downloadUseOffline: string;
  apiKeyPlaceholder: string;

  // API key flow
  groqApiKey: string;
  invalidGroqKey: string;
  groqKeyValidated: string;
  save: string;
  saving: string;
}

const mainAppTranslations: Record<string, MainAppTranslations> = {
  en: {
    appTitle: "CATT by Catt",
    appSubtitle: "Real-time Captioning And Translating Tool",
    loading: "Loading…",
    chooseLanguage: "Choose Your Language",
    selectLanguage: "Select Language",
    chooseLangNext: "Next, choose a language",
    setKeyFirst: "First, set a Groq API key.",
    setKeyFirstTitle: "First, you'll need a Groq API key.",
    getGroqKeyHelpBefore: "No Groq key yet? Visit",
    getGroqKeyHelpAfter: "to get your key — it's free, no card required.",
    useAdvancedAsr: "Use Advanced ASR",
    startListening: "Start Listening",
    customizeObsStyling: "🎨 Customize OBS Styling",
    changeApiKey: "🔑 Change API Key",
    offlineSetupNext: "Next, choose a model directory",
    offlineBackToApiKey: "🔑 Go back to use API Key",
    configureKeyOrModel: "🔑 Configure your key/model",
    console: "Console",
    stopAndReset: "Stop & Reset",
    listening: "Listening...",
    original: "Original",
    inputDevice: "Input device",
    microphone: "Microphone",
    offlineModelDirectory: "Offline Model Directory",
    openObsView: "Copy OBS Link",
    customizeObs: "🎨 Customize OBS",
    linkCopied: "Link copied!",
    useOfflineInstead: "📦 Use an offline model instead",
    chooseModelFolderHelp: "Choose a folder to store models (several hundred MB):",
    modelDirectoryPlaceholder: "Model directory",
    browse: "Browse",
    modelsReady: "Models ready",
    preparing: "Preparing…",
    downloadUseOffline: "Download & Use Offline",
    apiKeyPlaceholder: "sk_groq_...",
    groqApiKey: "Groq API Key",
    invalidGroqKey: "Invalid Groq API key",
    groqKeyValidated: "Groq API Validated",
    save: "Save",
    saving: "Saving…",
  },
  
  ja: {
    appTitle: "CATT by Catt",
    appSubtitle: "リアルタイム字幕・翻訳ツール",
    loading: "読み込み中…",
    chooseLanguage: "言語を選択",
    selectLanguage: "言語を選択",
    chooseLangNext: "次に、言語を選択してください",
    setKeyFirst: "まず、Groq API キーを設定してください。",
    setKeyFirstTitle: "まず、Groq API キーが必要です。",
    getGroqKeyHelpBefore: "まだ Groq のキーがありませんか？ 次のサイトへ",
    getGroqKeyHelpAfter: "でキーを取得できます。クレジットカード不要・無料です。",
    useAdvancedAsr: "高度なASRを使用",
    startListening: "聞き取り開始",
    customizeObsStyling: "🎨 OBSスタイルをカスタマイズ",
    changeApiKey: "🔑 APIキーを変更",
    offlineSetupNext: "次に、モデルのディレクトリを選択してください",
    offlineBackToApiKey: "🔑 APIキーの使用に戻る",
    configureKeyOrModel: "🔑 キー/モデルを設定",
    console: "コンソール",
    stopAndReset: "停止してリセット",
    listening: "聞き取り中...",
    original: "原文",
    inputDevice: "入力デバイス",
    microphone: "マイク",
    offlineModelDirectory: "オフラインモデルのディレクトリ",
    openObsView: "OBSリンクをコピー",
    customizeObs: "🎨 OBSをカスタマイズ",
    linkCopied: "リンクをコピーしました！",
    useOfflineInstead: "📦 オフラインモデルを使用する",
    chooseModelFolderHelp: "モデルを保存するフォルダを選択してください（数百MB）:",
    modelDirectoryPlaceholder: "モデルのディレクトリ",
    browse: "参照",
    modelsReady: "モデルの準備ができました",
    preparing: "準備中…",
    downloadUseOffline: "ダウンロードしてオフラインで使用",
    apiKeyPlaceholder: "sk_groq_...",
    groqApiKey: "Groq APIキー",
    invalidGroqKey: "無効な Groq API キーです",
    groqKeyValidated: "Groq API キーを確認しました",
    save: "保存",
    saving: "保存中…",
  },
  
  ko: {
    appTitle: "CATT by Catt",
    appSubtitle: "실시간 자막 및 번역 도구",
    loading: "로딩 중…",
    chooseLanguage: "언어 선택",
    selectLanguage: "언어 선택",
    chooseLangNext: "다음으로 언어를 선택하세요",
    setKeyFirst: "먼저 Groq API 키를 설정하세요.",
    setKeyFirstTitle: "먼저 Groq API 키가 필요합니다.",
    getGroqKeyHelpBefore: "아직 Groq 키가 없나요?",
    getGroqKeyHelpAfter: "에서 키를 발급받을 수 있어요. 무료이며 카드 정보가 필요하지 않습니다.",
    useAdvancedAsr: "고급 ASR 사용",
    startListening: "듣기 시작",
    customizeObsStyling: "🎨 OBS 스타일 사용자 지정",
    changeApiKey: "🔑 API 키 변경",
    offlineSetupNext: "다음으로 모델 디렉터리를 선택하세요",
    offlineBackToApiKey: "🔑 API 키 사용으로 돌아가기",
    configureKeyOrModel: "🔑 키/모델 구성",
    console: "콘솔",
    stopAndReset: "정지 및 재설정",
    listening: "듣는 중...",
    original: "원본",
    inputDevice: "입력 장치",
    microphone: "마이크",
    offlineModelDirectory: "오프라인 모델 디렉터리",
    openObsView: "OBS 링크 복사",
    customizeObs: "🎨 OBS 사용자 지정",
    linkCopied: "링크가 복사되었습니다!",
    useOfflineInstead: "📦 오프라인 모델을 대신 사용",
    chooseModelFolderHelp: "모델을 저장할 폴더를 선택하세요(수백 MB):",
    modelDirectoryPlaceholder: "모델 디렉터리",
    browse: "찾아보기",
    modelsReady: "모델 준비 완료",
    preparing: "준비 중…",
    downloadUseOffline: "다운로드 후 오프라인 사용",
    apiKeyPlaceholder: "sk_groq_...",
    groqApiKey: "Groq API 키",
    invalidGroqKey: "유효하지 않은 Groq API 키입니다",
    groqKeyValidated: "Groq API 키가 확인되었습니다",
    save: "저장",
    saving: "저장 중…",
  }
};

// Speech recognition interfaces
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: Event) => void;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

function AppRoutes() {
  const location = useLocation();
  
  useEffect(() => {
    // Add classes to body based on route
    if (location.pathname === '/server-export') {
      document.body.classList.add('route-export');
    } else {
      document.body.classList.remove('route-export');
    }
    
    return () => {
      document.body.classList.remove('route-export');
    };
  }, [location]);
  
  // Determine if we should show the diagnostic
  const showDiagnostic = location.search.includes('debug=true');
  
  return (
    <>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/server-export" element={<ServerExportView />} />
        <Route path="/css-customizer" element={<CSSCustomizer />} />
      </Routes>
    </>
  );
}

function MainApp() {
  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <main className="flex-1 flex">
        <div className="w-full h-full">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  // Removed GPT-4 Nano option; always use Groq path
  // Electron app only supports Advanced ASR; always true in Electron
  const [useAdvancedAsr] = useState(() => {
    try {
      // Prefer preload flag when present
      // @ts-ignore
      if (typeof window !== 'undefined') {
        // Electron preload or URL flag
        // @ts-ignore
        if (window.electron?.isElectron) return true;
        if (typeof window !== 'undefined' && window.location?.search?.includes('electron=1')) return true;
      }
      // Fallback to process.versions check if available
      // @ts-ignore
      if (typeof process !== 'undefined' && process.versions?.electron) return true;
      return false;
    } catch {
      return false;
    }
  });

  // Offline model selection
  const [useOffline, setUseOffline] = useState(() => localStorage.getItem('useOffline') === '1')
  const [offlineDir, setOfflineDir] = useState<string>(() => localStorage.getItem('offlineDir') || '')
  const [isDownloadingModels, setIsDownloadingModels] = useState(false)
  const [hasOfflineModels, setHasOfflineModels] = useState<boolean | null>(null)
  // Force showing the offline setup screen even if models are already present
  const [forceOfflineSetup, setForceOfflineSetup] = useState(false)



  // Advanced ASR state
  const [micVAD, setMicVAD] = useState<MicVAD | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [vadStatus, setVadStatus] = useState<'idle' | 'listening' | 'speaking' | 'processing'>('idle');

  // UI language state to trigger re-renders when changed
  const [uiLanguage, setUiLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  // Helper function to get current translations with fallback
  const t = mainAppTranslations[uiLanguage] || mainAppTranslations.en;

  // Offline readiness and start gating
  const offlineReady = useOffline && !!offlineDir && hasOfflineModels === true
  const canShowStart = ((useOffline ? offlineReady && !forceOfflineSetup : !!hasApiKey) && !!sourceLanguage)
  const autoProceedToStart = false // keep manual start for UX

  // Dynamic subtitle based on setup progress
  const subtitle = (!useOffline && !hasApiKey)
    ? "First, set a Groq API key."
    : !sourceLanguage
    ? "Next, choose a language"
    : t.appSubtitle;

  // Function to update UI language based on source language
  const updateUILanguageFromSource = (selectedSourceLanguage: string) => {
    let newUILanguage = 'en'; // Default to English
    
    if (selectedSourceLanguage === 'ja') {
      newUILanguage = 'ja';
    } else if (selectedSourceLanguage === 'ko') {
      newUILanguage = 'ko';
    }
    
    localStorage.setItem('language', newUILanguage);
    setUiLanguage(newUILanguage);
  };

  const translateText = useAction(api.translate.translateText);
  const transcribeWithGroq = useAction(api.groqTranscription.transcribeAudioStream);
  const sessionIdRef = useRef(getSessionId());
  
  // Add ref to track if we want to keep listening (for proper cleanup)
  const shouldKeepListeningRef = useRef(false);

  const currentTranscriptRef = useRef<string>("");
  const isSpeakingRef = useRef<boolean>(false);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Local state for transcript and translations
  const [transcript, setTranscript] = useState<string>("");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    () => localStorage.getItem('preferredMicDeviceId') || ''
  );

  // Local state for API key entry when missing
  const [newApiKey, setNewApiKey] = useState<string>('')
  const [isSavingApiKey, setIsSavingApiKey] = useState<boolean>(false)

  // Auto-detect locale on first load if no language chosen
  useEffect(() => {
    const stored = localStorage.getItem('language')
    if (stored) return
    const detect = async () => {
      try {
        let locale = ''
        // @ts-ignore
        if (window.electron?.getLocale) locale = await window.electron.getLocale()
        if (!locale) locale = navigator.language || (navigator.languages && navigator.languages[0]) || 'en'
        const lower = locale.toLowerCase()
        let code: keyof typeof LANGUAGES = 'en'
        if (lower.startsWith('ja')) code = 'ja'
        else if (lower.startsWith('ko')) code = 'ko'
        localStorage.setItem('language', code)
        setUiLanguage(code)
        if (!sourceLanguage) setSourceLanguage(code)
      } catch {
        // Fallback to en
        localStorage.setItem('language', 'en')
        setUiLanguage('en')
        if (!sourceLanguage) setSourceLanguage('en')
      }
    }
    detect()
  }, [])

  useEffect(() => {
    const loadDevices = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        // Ensure permission prompt so labels populate
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        setAudioDevices(mics);
        if (!selectedDeviceId && mics[0]) setSelectedDeviceId(mics[0].deviceId);
      } catch (err) {
        console.error('Failed to enumerate devices', err);
      }
    };
    loadDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', loadDevices);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', loadDevices);
  }, []);

  useEffect(() => {
    if (selectedDeviceId) localStorage.setItem('preferredMicDeviceId', selectedDeviceId);
  }, [selectedDeviceId]);

  // Update to use the Convex mutation to store transcriptions
  const storeTranscription = useMutation(api.transcription.storeTranscription);
  
  // Store transcriptions in Convex when they change
  useEffect(() => {
    if (transcript) {
      storeTranscription({
        transcript: transcript, // Always store raw transcript for consistency
        translations,
        sourceLanguage,
        sessionId: sessionIdRef.current
      }).catch(error => {
        console.error("Error storing transcription:", error);
      });
    }
  }, [transcript, translations, sourceLanguage, storeTranscription]);

  // Store source language in sessionStorage whenever it changes (including initial load)
  useEffect(() => {
    if (sourceLanguage) {
      const key = `sourceLanguage_${sessionIdRef.current}`;
      console.log('[Main App] About to store:', {
        sourceLanguage,
        sessionId: sessionIdRef.current,
        key
      });
      
      sessionStorage.setItem(key, sourceLanguage);
      
      // Verify it was stored
      const verification = sessionStorage.getItem(key);
      console.log('[Main App] Verification - stored value:', JSON.stringify(verification));
      
      // List all sessionStorage keys for debugging
      console.log('[Main App] All sessionStorage keys:', Object.keys(sessionStorage));
    } else {
      console.log('[Main App] Skipping storage because sourceLanguage is:', JSON.stringify(sourceLanguage));
    }
  }, [sourceLanguage]);


  // Initialize MicVAD for Advanced ASR
  const initializeAdvancedASR = async () => {
    try {
      setVadStatus('listening');
      
      // If a preferred microphone is stored, build a stream using it
      const preferredDeviceId = localStorage.getItem('preferredMicDeviceId') || selectedDeviceId || undefined;
      let stream: MediaStream | undefined = undefined;
      if (preferredDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: preferredDeviceId } },
          });
        } catch (e) {
          console.warn('Failed to get stream for selected device, falling back to default mic', e);
        }
      }

      const vad = await MicVAD.new({
        // If we have a pre-selected stream, use it; otherwise MicVAD will prompt
        stream,
        preSpeechPadFrames: 10,
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.35,
        redemptionFrames: 8,
        frameSamples: 1536,
        minSpeechFrames: 4,
        // Use maxIntermittentSilenceFrames when available; omit unknown option to satisfy types
        onSpeechStart: () => {
          console.log('[VAD] Speech started');
          setVadStatus('speaking');
          isSpeakingRef.current = true;
        },
        onSpeechEnd: async (audio: Float32Array) => {
          console.log('[VAD] Speech ended, processing audio');
          setVadStatus('processing');
          
          try {
            // Check audio duration - limit to 30 seconds to prevent large files
            const durationInSeconds = audio.length / 16000; // 16kHz sample rate
            console.log(`[VAD] Audio duration: ${durationInSeconds.toFixed(2)} seconds`);
            
            if (durationInSeconds > 30) {
              console.warn(`[VAD] Audio too long (${durationInSeconds.toFixed(2)}s), truncating to 30 seconds`);
              const maxSamples = 30 * 16000; // 30 seconds at 16kHz
              audio = audio.slice(0, maxSamples);
            }
            
            // Convert Float32Array to WAV format
            const wavBuffer = float32ArrayToWav(audio, 16000);
            
            // Check file size before sending
            const fileSizeInMB = wavBuffer.byteLength / (1024 * 1024);
            console.log(`[VAD] Audio file size: ${fileSizeInMB.toFixed(2)} MB`);
            
            if (fileSizeInMB > 25) {
              console.error(`[VAD] Audio file too large: ${fileSizeInMB.toFixed(2)} MB`);
              throw new Error(`Audio file too large: ${fileSizeInMB.toFixed(2)} MB. Please speak for shorter periods.`);
            }
            
            let finalText = ''
            if (useOffline) {
              // Prefer Electron main process; fallback to in-renderer transformers
              if (!offlineDir) throw new Error('Offline model directory not set')
              try {
                // @ts-ignore
                const resp = await window.electron?.offlineTranscribe?.({ audio, sampleRate: 16000, dir: offlineDir })
                if (!resp?.ok) throw new Error(resp?.error || 'Offline transcribe failed')
                finalText = resp.text
              } catch (err) {
                console.warn('[Offline] Falling back to renderer ASR:', err)
                const offline = await transcribeOffline({ audio, sampleRate: 16000, cacheDir: offlineDir })
                finalText = offline.text
              }
            } else {
              // GROQ path
              console.time('⏱️ GROQ-REQUEST-TIME');
              const result = await transcribeWithGroq({
                audioBlob: wavBuffer,
                language: sourceLanguage,
                sessionId: sessionIdRef.current,
              });
              console.timeEnd('⏱️ GROQ-REQUEST-TIME');
              finalText = result.text
            }
            
            if (finalText.trim()) {
              setTranscript(finalText);
              currentTranscriptRef.current = finalText;
              
              
              // Translate the result text
              if (finalText.trim()) {
                const targetLanguages = Object.keys(LANGUAGES).filter(lang => lang !== sourceLanguage);
                
                try {
                  const translationsResult = await Promise.all(
                    targetLanguages.map(targetLang => (async () => {
                      if (useOffline) {
                        if (!offlineDir) throw new Error('Offline model directory not set')
                        try {
                          // @ts-ignore
                          const resp = await window.electron?.offlineTranslate?.({ text: finalText.trim(), sourceLanguage, targetLanguage: targetLang, dir: offlineDir })
                          if (!resp?.ok) throw new Error(resp?.error || 'Offline translate failed')
                          return { lang: targetLang, translation: resp.translation }
                        } catch (err) {
                          console.warn('[Offline] Falling back to renderer translation:', err)
                          const t = await translateOffline({ text: finalText.trim(), sourceLanguage, targetLanguage: targetLang, cacheDir: offlineDir })
                          return { lang: targetLang, translation: t }
                        }
                      }
                      const translation = await translateText({ text: finalText.trim(), sourceLanguage, targetLanguage: targetLang, useGpt: false })
                      return { lang: targetLang, translation }
                    })())
                  );
                  
                  const newTranslations = translationsResult.reduce(
                    (acc, { lang, translation }) => ({
                      ...acc,
                      [lang]: translation,
                    }),
                    {}
                  );
                  
                  setTranslations(newTranslations);
                } catch (error) {
                  console.error("Translation error:", error);
                }
              }
            }
            } catch (error) {
            console.error("Transcription error:", error);
          } finally {
            setVadStatus('listening');
            isSpeakingRef.current = false;
          }
        },
        onVADMisfire: () => {
          console.log('[VAD] Misfire detected');
          setVadStatus('listening');
          isSpeakingRef.current = false;
        },
      });
      
      setMicVAD(vad);
      return vad;
    } catch (error) {
      console.error("Error initializing MicVAD:", error);
      setVadStatus('idle');
      return null;
    }
  };

  // Helper function to convert Float32Array to WAV format
  const float32ArrayToWav = (buffer: Float32Array, sampleRate: number): ArrayBuffer => {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, buffer[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return arrayBuffer;
  };

  // UI helper: transient overlay message (same style as Copy OBS Link)
  function showTransientMessage(message: string) {
    const indicator = document.createElement('div')
    indicator.textContent = message
    indicator.style.position = 'fixed'
    indicator.style.bottom = '20px'
    indicator.style.left = '50%'
    indicator.style.transform = 'translateX(-50%)'
    indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
    indicator.style.color = 'white'
    indicator.style.padding = '8px 16px'
    indicator.style.borderRadius = '4px'
    indicator.style.zIndex = '9999'
    indicator.style.opacity = '0'
    indicator.style.transition = 'opacity 0.3s ease-in-out'
    document.body.appendChild(indicator)
    setTimeout(() => { indicator.style.opacity = '1' }, 10)
    setTimeout(() => {
      indicator.style.opacity = '0'
      setTimeout(() => { if (indicator.parentNode) document.body.removeChild(indicator) }, 300)
    }, 2000)
  }

  // Initialize Web Speech API and handle transcription
  useEffect(() => {
    if (!sourceLanguage || !isStarted) {
      shouldKeepListeningRef.current = false;
      return;
    }

    shouldKeepListeningRef.current = true;

    // Use Advanced ASR (MicVAD + Groq) if enabled
    if (useAdvancedAsr) {
      initializeAdvancedASR().then(vad => {
        if (vad) {
          vad.start();
          setIsRecording(true);
        }
      });
      
      return () => {
        shouldKeepListeningRef.current = false;
        if (micVAD) {
          micVAD.pause();
          setIsRecording(false);
          setVadStatus('idle');
        }
      };
    }

    // Use Web Speech API if Advanced ASR is disabled
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition API not supported in this browser");
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = sourceLanguage;

    recognitionInstance.onresult = async (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        
        if (event.results[i].isFinal) {
          // Set a timeout to mark speaking as false after a delay
          // Clear any existing timeout first
          if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
          }
          speakingTimeoutRef.current = setTimeout(() => {
            isSpeakingRef.current = false;
            speakingTimeoutRef.current = null;
          }, 1000); // 1 second delay before marking as not speaking
          
          finalTranscript += transcript;
          
          // Update transcript with only the latest final result
          setTranscript(finalTranscript);
          currentTranscriptRef.current = finalTranscript;
          
          // Translate immediately and replace existing translations
          if (finalTranscript.trim()) {
            const targetLanguages = Object.keys(LANGUAGES).filter(lang => lang !== sourceLanguage);
            
            try {
              const translationsResult = await Promise.all(
                targetLanguages.map(targetLang =>
                  translateText({
                    text: finalTranscript.trim(),
                    sourceLanguage,
                    targetLanguage: targetLang,
                    useGpt: false,
                  }).then(translation => ({ lang: targetLang, translation }))
                )
              );
              
              const newTranslations = translationsResult.reduce(
                (acc, { lang, translation }) => ({
                  ...acc,
                  [lang]: translation,
                }),
                {}
              );
              
              setTranslations(newTranslations); // Replace translations completely
            } catch (error) {
              console.error("Translation error:", error);
            }
          }
        } else {
          // Interim result implies the speaker is currently speaking
          // Clear any existing timeout since we're still speaking
          if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = null;
          }
          isSpeakingRef.current = true;
          interimTranscript += transcript;
          // Display interim results
          setTranscript(interimTranscript);
          currentTranscriptRef.current = interimTranscript;
        }
      }
    };

    // Handle recognition errors and restarts
    recognitionInstance.onerror = () => {
      if (shouldKeepListeningRef.current && isStarted) {
        setTimeout(() => {
          try {
            recognitionInstance.start();
          } catch (error) {
            console.error("Error restarting recognition:", error);
          }
        }, 1000);
      }
    };

    recognitionInstance.onend = () => {
      if (shouldKeepListeningRef.current && isStarted) {
        setTimeout(() => {
          try {
            // Guard against double-start by creating a fresh instance
            if (recognitionInstance && (recognitionInstance as any).state !== 'running') {
              recognitionInstance.start();
            }
          } catch (error) {
            console.error("Error restarting recognition:", error);
          }
        }, 1000);
      }
    };

    setRecognition(recognitionInstance);
    
    // Start recognition
    try {
      recognitionInstance.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
    }
    
    // Cleanup on unmount or when dependencies change
    return () => {
      shouldKeepListeningRef.current = false;
      try {
        recognitionInstance.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    };
  }, [sourceLanguage, isStarted, useAdvancedAsr, translateText, transcribeWithGroq]);

  // Start/stop listening
  const startListening = () => {
    if (!canShowStart) return
    setIsStarted(true);
  };

  const stopListening = () => {
    shouldKeepListeningRef.current = false;
    
    // Stop Web Speech API if active
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    }
    
    // Stop Advanced ASR if active
    if (micVAD) {
      try {
        micVAD.pause();
        setIsRecording(false);
        setVadStatus('idle');
      } catch (error) {
        console.error("Error stopping MicVAD:", error);
      }
    }
    
    // Clear speaking state and timeouts
    isSpeakingRef.current = false;
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    
    // Reset all state to return to home page
    setIsStarted(false);
    setTranscript("");
    setTranslations({});
    currentTranscriptRef.current = "";
  };

  const obsLinkWithSession = `/server-export?session=${sessionIdRef.current}`;
  
  // Also create CSS Customizer link with session ID
  const cssCustomizerLinkWithSession = `/css-customizer?session=${sessionIdRef.current}&source=${sourceLanguage}`;

  // Always display raw transcript for real-time viewing, punctuation works behind the scenes
  const displayTranscript = transcript;

  // Load API key on mount
  useEffect(() => {
    let mounted = true
    const checkApiKey = async () => {
      try {
        // @ts-ignore
        const key: string | null = await window.electron?.getApiKey?.()
        console.log('Checking API key:', !!key)
        if (!mounted) return
        setHasApiKey(!!key)
      } catch (e) {
        console.error('Error checking API key:', e)
        setHasApiKey(false)
      }
    }
    
    checkApiKey()
    
    const onUpdated = () => {
      console.log('API key updated event received')
      checkApiKey()
    }
    window.addEventListener('groq-api-key-updated', onUpdated as EventListener)
    
    return () => { 
      mounted = false
      window.removeEventListener('groq-api-key-updated', onUpdated as EventListener)
    }
  }, [])

  // On mount, restore offline preferences only (no validation here)
  useEffect(() => {
    const savedDir = localStorage.getItem('offlineDir') || ''
    const savedUse = localStorage.getItem('useOffline') === '1'
    if (savedDir) setOfflineDir(savedDir)
    if (savedUse) setUseOffline(true)
  }, [])

  return (
    <div className="flex flex-col h-full min-h-full w-full bg-gray-950/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-800/30">
      <div className="titlebar-drag"></div>
      {hasApiKey === null && !useOffline ? (
        <div className="flex items-center justify-center p-12 text-gray-400">{t.loading}</div>
      ) : !isStarted ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 h-full min-h-full items-center">
          <div className="flex flex-col justify-center self-center">
            <div className="mb-4">
              <h1 className="text-4xl font-bold text-white text-shadow mb-2">{t.appTitle}</h1>
              <p className="text-xl text-gray-400 text-shadow">{t.appSubtitle}</p>
            </div>

            {canShowStart ? (
              <div className="flex flex-col items-start mt-2">
                <button
                  onClick={startListening}
                  className="px-8 py-4 rounded-full text-lg font-bold bg-gray-800 text-white shadow-lg hover:bg-gray-700 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50"
                >
                  {t.startListening}
                </button>
                <div className="mt-4 text-gray-400">
                  <Link 
                    to={cssCustomizerLinkWithSession}
                    target="_blank"
                    className="flex items-center gap-2 hover:text-white transition-colors text-sm"
                  >
                  <span>{t.customizeObsStyling}</span>
                  </Link>
                  <button
                    onClick={async () => {
                      try {
                        // Try to delete, but proceed regardless of result
                        // @ts-ignore
                        await window.electron?.deleteApiKey?.()
                      } catch (e) {
                        console.error('Failed to delete API key', e)
                      }
                      setHasApiKey(false)
                      setUseOffline(false)
                      setIsStarted(false)
                      setSourceLanguage('')
                      localStorage.removeItem('useOffline')
                      setNewApiKey('')
                      // Notify listeners to re-check
                      window.dispatchEvent(new CustomEvent('groq-api-key-updated'))
                    }}
                    className="mt-3 flex items-center gap-2 hover:text-white transition-colors text-sm"
                    title={t.configureKeyOrModel}
                  >
                    <span>{t.configureKeyOrModel}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 mt-2">
                {(!hasApiKey && !useOffline) ? (
                  <>
                    <div>{t.setKeyFirstTitle}</div>
                      <div className="mt-1">
                      {t.getGroqKeyHelpBefore} {" "}
                      <a href="https://console.groq.com/" target="_blank" rel="noreferrer" className="underline hover:text-white no-drag">console.groq.com</a>{" "}
                      {t.getGroqKeyHelpAfter}
                      <div className="mt-2">
                        <button
                          className="flex items-center gap-2 hover:text-white transition-colors text-sm"
                          title={t.useOfflineInstead}
                          onClick={() => { setUseOffline(true); setForceOfflineSetup(true) }}
                        >
                          <span>{t.useOfflineInstead.split(' ')[0]}</span>
                          <span>{t.useOfflineInstead.replace(/^\S+\s*/, '')}</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>{useOffline && (!offlineReady || forceOfflineSetup) ? t.offlineSetupNext : t.chooseLangNext}</div>
                    {useOffline && (!offlineReady || forceOfflineSetup) && (
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            setUseOffline(false)
                            setHasApiKey(false)
                          }}
                          className="flex items-center gap-2 hover:text-white transition-colors text-sm"
                          title={t.offlineBackToApiKey}
                        >
                          <span>{t.offlineBackToApiKey}</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="w-full max-w-md md:max-w-none bg-gray-900/70 backdrop-blur-sm p-6 rounded-xl shadow-inner border border-gray-800/30 self-center h-auto min-h-[260px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                {(!hasApiKey && !useOffline)
                  ? t.groqApiKey
                  : (useOffline && (!offlineReady || forceOfflineSetup))
                  ? t.offlineModelDirectory
                  : t.chooseLanguage}
              </h2>
            </div>
            {(hasApiKey || (offlineReady && !forceOfflineSetup)) ? (
              <>
                <select
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white font-medium border border-gray-700 shadow-md transition-all hover:bg-gray-750 focus:ring-2 focus:ring-gray-600 focus:outline-none mb-4"
                  value={sourceLanguage}
                  onChange={(e) => {
                    const selectedLang = e.target.value;
                    setSourceLanguage(selectedLang);
                    updateUILanguageFromSource(selectedLang);
                  }}
                >
                  <option value="">{t.selectLanguage}</option>
                  {Object.entries(LANGUAGES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>

                <h2 className="text-xl font-semibold text-white mb-4">{t.inputDevice}</h2>
                <select
                  aria-label={t.inputDevice}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white font-medium border border-gray-700 shadow-md hover:bg-gray-750 focus:ring-2 focus:ring-gray-600 focus:outline-none"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                >
                  {audioDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || t.microphone}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                {!useOffline ? (
                  <>
                    <input
                      className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white font-medium border border-gray-700 shadow-md transition-all focus:ring-2 focus:ring-gray-600 focus:outline-none mb-4"
                      type="password"
                      placeholder={t.apiKeyPlaceholder}
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                    />
                    <button
                      onClick={async () => {
                        const trimmed = newApiKey.trim()
                        if (!trimmed) return
                        setIsSavingApiKey(true)
                        try {
                          // Validate before saving
                          // @ts-ignore
                          const valid = await window.electron?.validateApiKey?.(trimmed)
                          if (!valid) {
                            showTransientMessage(t.invalidGroqKey)
                            return
                          }
                          // @ts-ignore
                          const ok = await window.electron?.setApiKey?.(trimmed)
                          if (ok === true) {
                            showTransientMessage(t.groqKeyValidated)
                            window.dispatchEvent(new CustomEvent('groq-api-key-updated'))
                            setNewApiKey('')
                          }
                        } catch (e) {
                          console.error('Error saving API key:', e)
                        } finally {
                          setIsSavingApiKey(false)
                        }
                      }}
                      disabled={isSavingApiKey || !newApiKey.trim()}
                      className="w-full px-4 py-3 rounded-lg bg-blue-600 disabled:opacity-50 hover:bg-blue-500 transition-colors"
                    >
                      {isSavingApiKey ? t.saving : t.save}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="text-sm text-gray-300">{t.chooseModelFolderHelp}</div>
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm"
                          placeholder={t.modelDirectoryPlaceholder}
                          value={offlineDir}
                          onChange={(e) => setOfflineDir(e.target.value)}
                        />
                        <button
                          className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
                          onClick={async () => {
                            // @ts-ignore
                            const dir = await window.electron?.chooseDirectory?.()
                            if (dir) setOfflineDir(dir)
                          }}
                         >{t.browse}</button>
                      </div>
                       <button
                        className="w-full px-4 py-3 rounded-lg bg-blue-600 disabled:opacity-50 hover:bg-blue-500 transition-colors"
                        disabled={!offlineDir || isDownloadingModels}
                        onClick={async () => {
                          if (!offlineDir) return
                          setIsDownloadingModels(true)
                          // Persist settings
                          localStorage.setItem('offlineDir', offlineDir)
                          localStorage.setItem('useOffline', '1')
                          try {
                          // @ts-ignore
                            const has = await window.electron?.hasOfflineModels?.(offlineDir)
                          if (!has) {
                            // @ts-ignore
                            await window.electron?.prepareOfflineModels?.(offlineDir)
                          }
                            // Validate models before enabling start
                            // @ts-ignore
                            const validated = await window.electron?.validateOfflineModels?.(offlineDir)
                            if (!validated?.ok) throw new Error(validated?.error || 'Model validation failed')
                            // Warm models via main process; renderer loads on first use
                            setHasOfflineModels(true)
                            setUseOffline(true)
                            // If no language yet, default to stored UI language or English
                            if (!sourceLanguage) {
                              const pref = localStorage.getItem('language') || 'en'
                              setSourceLanguage(pref)
                              updateUILanguageFromSource(pref)
                            }
                            showTransientMessage(t.modelsReady)
                            // After loading or validating, go to language selection screen
                            setForceOfflineSetup(false)
                          } catch (e) {
                            console.error('Download/preload failed', e)
                            setHasOfflineModels(false)
                          } finally {
                            setIsDownloadingModels(false)
                          }
                        }}
                       >{isDownloadingModels ? t.preparing : t.downloadUseOffline}</button>
                        {/* Change API Key link lives above under description; removed duplicate here */}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Advanced ASR is always enabled in Electron; no toggle */}
          </div>
        </div>
      ) : (
        <div className="flex flex-col p-10 h-full min-h-full">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white text-shadow">{t.console}</h2>
            </div>
            <button 
              onClick={stopListening}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800/70 text-white hover:bg-gray-800 transition-colors"
            >
              {t.stopAndReset}
            </button>
          </div>
          
          <div className="flex-1 flex gap-6 overflow-y-auto">
            <div className="flex-1 flex flex-col gap-6">
              <div className="p-6 bg-gray-900/60 backdrop-blur-sm rounded-xl shadow-inner border border-gray-800/30">
                <div className="text-sm uppercase text-gray-400 mb-2 font-semibold">
                  {t.original} ({LANGUAGES[sourceLanguage as keyof typeof LANGUAGES]})
                </div>
                <p className="text-2xl text-white text-shadow min-h-[3rem]">
                  {displayTranscript || t.listening}
                </p>
              </div>

              {Object.entries(translations).map(([lang, translation]) => (
                <div key={lang} className="p-6 bg-gray-900/40 backdrop-blur-sm rounded-xl shadow-inner border border-gray-800/30">
                  <div className="text-sm uppercase text-gray-400 mb-2 font-semibold">{LANGUAGES[lang as keyof typeof LANGUAGES]}</div>
                  <p className="text-2xl text-white text-shadow">{translation}</p>
                </div>
              ))}
            </div>

          </div>
          
          <div className="mt-8 flex justify-center gap-4">
            <button 
              onClick={() => {
                const baseUrl = window.location.origin;
                const fullUrl = `${baseUrl}${obsLinkWithSession}`;

                    navigator.clipboard.writeText(fullUrl)
                  .then(() => {
                    // Show subtle indication that link was copied
                    const copyIndicator = document.createElement('div');
                        copyIndicator.textContent = t.linkCopied;
                    copyIndicator.style.position = 'fixed';
                    copyIndicator.style.bottom = '20px';
                    copyIndicator.style.left = '50%';
                    copyIndicator.style.transform = 'translateX(-50%)';
                    copyIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                    copyIndicator.style.color = 'white';
                    copyIndicator.style.padding = '8px 16px';
                    copyIndicator.style.borderRadius = '4px';
                    copyIndicator.style.zIndex = '9999';
                    copyIndicator.style.opacity = '0';
                    copyIndicator.style.transition = 'opacity 0.3s ease-in-out';

                    document.body.appendChild(copyIndicator);

                    // Fade in
                    setTimeout(() => {
                      copyIndicator.style.opacity = '1';
                    }, 10);

                    // Remove after animation
                    setTimeout(() => {
                      copyIndicator.style.opacity = '0';
                      setTimeout(() => {
                        document.body.removeChild(copyIndicator);
                      }, 300);
                    }, 2000);
                  })
                  .catch(err => {
                    console.error('Could not copy link: ', err);
                  });
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-lg bg-gray-900/30 text-gray-400 hover:bg-gray-900/50 hover:text-white transition-all"
            >
              <span>{t.openObsView}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
            <Link 
              to={cssCustomizerLinkWithSession}
              target="_blank"
              className="flex items-center gap-2 px-5 py-3 rounded-lg bg-gray-900/30 text-gray-400 hover:bg-gray-900/50 hover:text-white transition-all"
            >
              <span>{t.customizeObs}</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;