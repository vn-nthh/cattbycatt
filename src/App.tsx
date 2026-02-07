import { useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import ServerExportView from "./components/ServerExportView";
import CSSCustomizer from "./components/CSSCustomizer";
import { TypewriterCarousel } from "./components/TypewriterCarousel";
import { getSessionId } from "./lib/session";
import { MicVAD } from "@ricky0123/vad-web";

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

  // Language selection
  languages: string;
  selectLanguage: string;

  // Settings - Dropdowns
  asrModel: string;
  asrWebSpeech: string;
  asrWhisper: string;
  asrGemini: string;
  asrDeepgram: string;
  asrGoogleStt: string;
  asrGoogleSttStreaming: string;
  translation: string;
  translationGemini: string;
  translationGpt: string;

  // Actions
  startListening: string;
  customizeObsStyling: string;

  // Console page
  console: string;
  stopAndReset: string;
  listening: string;

  // Language labels
  original: string;
  languageEnglish: string;
  languageJapanese: string;
  languageKorean: string;

  // Links
  openObsView: string;
  customizeObs: string;
}

const mainAppTranslations: Record<string, MainAppTranslations> = {
  en: {
    appTitle: "CATT by Catt",
    appSubtitle: "Real-time Captioning And Translating Tool",
    languages: "Languages",
    selectLanguage: "Select Language",
    asrModel: "ASR Model",
    asrWebSpeech: "Default (WebSpeech API)",
    asrWhisper: "Whisper",
    asrGemini: "Gemini",
    asrDeepgram: "Nova-3 (Deepgram)",
    asrGoogleStt: "Google STT (VAD)",
    asrGoogleSttStreaming: "Google STT (Streaming)",
    translation: "Translation",
    translationGemini: "Default (Gemini 2.5 Flash Lite)",
    translationGpt: "GPT-4 Nano",
    startListening: "Start Listening",
    customizeObsStyling: "🎨 Customize OBS Styling",
    console: "Console",
    stopAndReset: "Stop & Reset",
    listening: "Listening...",
    original: "Original",
    languageEnglish: "English",
    languageJapanese: "Japanese",
    languageKorean: "Korean",
    openObsView: "Copy OBS Link",
    customizeObs: "🎨 Customize OBS"
  },

  ja: {
    appTitle: "CATT by Catt",
    appSubtitle: "リアルタイム字幕・翻訳ツール",
    languages: "言語",
    selectLanguage: "言語を選択",
    asrModel: "ASRモデル",
    asrWebSpeech: "デフォルト（WebSpeech API）",
    asrWhisper: "Whisper",
    asrGemini: "Gemini",
    asrDeepgram: "Nova-3 (Deepgram)",
    asrGoogleStt: "Google STT (VAD)",
    asrGoogleSttStreaming: "Google STT (ストリーミング)",
    translation: "翻訳",
    translationGemini: "デフォルト（Gemini 2.5 Flash Lite）",
    translationGpt: "GPT-4 Nano",
    startListening: "聞き取り開始",
    customizeObsStyling: "🎨 OBSスタイルをカスタマイズ",
    console: "コンソール",
    stopAndReset: "停止してリセット",
    listening: "聞き取り中...",
    original: "原文",
    languageEnglish: "英語",
    languageJapanese: "日本語",
    languageKorean: "韓国語",
    openObsView: "OBSリンクをコピー",
    customizeObs: "🎨 OBSをカスタマイズ"
  },

  ko: {
    appTitle: "CATT by Catt",
    appSubtitle: "실시간 자막 및 번역 도구",
    languages: "언어",
    selectLanguage: "언어 선택",
    asrModel: "ASR 모델",
    asrWebSpeech: "기본값 (WebSpeech API)",
    asrWhisper: "Whisper",
    asrGemini: "Gemini",
    asrDeepgram: "Nova-3 (Deepgram)",
    asrGoogleStt: "Google STT (VAD)",
    asrGoogleSttStreaming: "Google STT (스트리밍)",
    translation: "번역",
    translationGemini: "기본값 (Gemini 2.5 Flash Lite)",
    translationGpt: "GPT-4 Nano",
    startListening: "듣기 시작",
    customizeObsStyling: "🎨 OBS 스타일 사용자 지정",
    console: "콘솔",
    stopAndReset: "정지 및 재설정",
    listening: "듣는 중...",
    original: "원본",
    languageEnglish: "영어",
    languageJapanese: "일본어",
    languageKorean: "한국어",
    openObsView: "OBS 링크 복사",
    customizeObs: "🎨 OBS 사용자 지정"
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

// Silent audio to keep the tab active in background
const SILENT_AUDIO_URL = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAAAAAAAAAAAAACCAAAAAAAAAAAAAA//OEMAAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEcxAAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEcyAAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEczAAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEc0AAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEc1AAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEc2AAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEc3AAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEc4AAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEc5AAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEc6AAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEc7AAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEc8AAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEc9AAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEc+AAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9//OEc/AAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAACCCMP7/vu/9';

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
    <div className="min-h-screen flex flex-col bg-[#1e1e1e]">
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="min-h-[480px] mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [useGpt, setUseGpt] = useState(false);
  const [asrModel, setAsrModel] = useState<'webspeech' | 'whisper' | 'gemini' | 'deepgram' | 'google-stt' | 'google-stt-streaming'>('webspeech');



  // Advanced ASR state
  const [micVAD, setMicVAD] = useState<MicVAD | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [vadStatus, setVadStatus] = useState<'idle' | 'listening' | 'speaking' | 'processing'>('idle');

  // Keyterm state
  const [keytermsInput, setKeytermsInput] = useState('');
  const [keytermsPills, setKeytermsPills] = useState<string[]>([]);
  const [showKeytermsPanel, setShowKeytermsPanel] = useState(false);

  // Check if current ASR model supports keyterms
  // NOTE: Deepgram and Google STT keyterm APIs don't work reliably (see .agent/agent.md)
  // Gemini uses prompt injection which does work
  const supportsKeyterms = asrModel === 'gemini';

  // UI language state to trigger re-renders when changed
  const [uiLanguage, setUiLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  // Helper function to get current translations with fallback
  const t = mainAppTranslations[uiLanguage] || mainAppTranslations.en;

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
  const transcribeWithGemini = useAction(api.geminiTranscription.transcribeAudioStream);
  const transcribeWithDeepgram = useAction(api.deepgramTranscription.transcribeAudioStream);
  const transcribeWithGoogleStt = useAction(api.googleSttTranscription.transcribeAudioStream);
  const sessionIdRef = useRef(getSessionId());

  // Add ref to track if we want to keep listening (for proper cleanup)
  const shouldKeepListeningRef = useRef(false);

  const currentTranscriptRef = useRef<string>("");
  const isSpeakingRef = useRef<boolean>(false);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for background execution and silence detection
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Deepgram Streaming Refs
  const deepgramWsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const accumulatedTranscriptRef = useRef<string>("");
  // const deepgramSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const getDeepgramApiKey = useAction(api.deepgramTranscription.getDeepgramApiKey);
  // Google STT streaming uses WebSocket proxy or falls back to VAD

  // Google STT Streaming Refs
  const googleSttWsRef = useRef<WebSocket | null>(null);
  const googleSttMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const googleSttAccumulatedRef = useRef<string>("");
  const googleSttStreamRef = useRef<MediaStream | null>(null);

  // Initialize silent audio
  useEffect(() => {
    audioRef.current = new Audio(SILENT_AUDIO_URL);
    audioRef.current.loop = true;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Local state for transcript and translations
  const [transcript, setTranscript] = useState<string>("");
  const [translations, setTranslations] = useState<Record<string, string>>({});

  // Update to use the Convex mutation to store transcriptions
  const storeTranscription = useMutation(api.transcription.storeTranscription);

  // Store transcriptions in Convex when they change
  useEffect(() => {
    if (transcript) {
      storeTranscription({
        transcript: transcript,
        translations,
        sourceLanguage,
        sessionId: sessionIdRef.current
      }).catch(() => {
        // Failed to store transcription
      });
    }
  }, [transcript, translations, sourceLanguage, storeTranscription]);

  // Store source language in sessionStorage whenever it changes (including initial load)
  useEffect(() => {
    if (sourceLanguage) {
      const key = `sourceLanguage_${sessionIdRef.current}`;
      sessionStorage.setItem(key, sourceLanguage);
    }
  }, [sourceLanguage]);


  // Initialize MicVAD for Advanced ASR (Whisper, Gemini, Google STT VAD)
  const initializeAdvancedASR = async (selectedAsrModel: 'whisper' | 'gemini' | 'deepgram' | 'google-stt') => {
    // Select the appropriate transcription function based on ASR model
    let transcribeAudio;
    if (selectedAsrModel === 'gemini') {
      transcribeAudio = transcribeWithGemini;
    } else if (selectedAsrModel === 'deepgram') {
      transcribeAudio = transcribeWithDeepgram;
    } else if (selectedAsrModel === 'google-stt') {
      transcribeAudio = transcribeWithGoogleStt;
    } else {
      transcribeAudio = transcribeWithGroq;
    }

    try {
      setVadStatus('listening');

      const vad = await MicVAD.new({
        preSpeechPadFrames: 10,
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.35,
        redemptionFrames: 8,
        frameSamples: 1536,
        minSpeechFrames: 4,
        onSpeechStart: () => {
          setVadStatus('speaking');
          isSpeakingRef.current = true;
        },
        onSpeechEnd: async (audio: Float32Array) => {
          setVadStatus('processing');

          try {
            // Check audio duration - limit to 30 seconds to prevent large files
            const durationInSeconds = audio.length / 16000; // 16kHz sample rate

            if (durationInSeconds > 30) {
              const maxSamples = 30 * 16000; // 30 seconds at 16kHz
              audio = audio.slice(0, maxSamples);
            }

            // Convert Float32Array to WAV format
            const wavBuffer = float32ArrayToWav(audio, 16000);

            // Check file size before sending
            const fileSizeInMB = wavBuffer.byteLength / (1024 * 1024);

            if (fileSizeInMB > 25) {
              throw new Error(`Audio file too large: ${fileSizeInMB.toFixed(2)} MB. Please speak for shorter periods.`);
            }

            // Pass keyterms if supported (Gemini uses prompt injection)
            let keyterms = undefined;
            if (selectedAsrModel === 'gemini') {
              const saved = localStorage.getItem('asr_keyterms');
              if (saved) {
                try {
                  keyterms = JSON.parse(saved);
                } catch (e) {
                  console.warn('Failed to parse keyterms from localStorage', e);
                }
              }
            }

            const result = await transcribeAudio({
              audioBlob: wavBuffer,
              language: sourceLanguage,
              sessionId: sessionIdRef.current,
              ...(keyterms && { keyterms })
            });

            if (result.text.trim()) {
              setTranscript(result.text);
              currentTranscriptRef.current = result.text;


              // Translate the result text
              if (result.text.trim()) {
                const targetLanguages = Object.keys(LANGUAGES).filter(lang => lang !== sourceLanguage);

                try {
                  const translationsResult = await Promise.all(
                    targetLanguages.map(targetLang =>
                      translateText({
                        text: result.text.trim(),
                        sourceLanguage,
                        targetLanguage: targetLang,
                        useGpt,
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

                  setTranslations(newTranslations);
                } catch {
                  // Translation failed silently
                }
              }
            }
          } catch {
            // Transcription failed silently
          } finally {
            setVadStatus('listening');
            isSpeakingRef.current = false;
          }
        },
        onVADMisfire: () => {
          setVadStatus('listening');
          isSpeakingRef.current = false;
        },
      });

      setMicVAD(vad);
      return vad;
    } catch {
      setVadStatus('idle');
      return null;
    }
  };

  // Initialize Deepgram Streaming
  const initializeDeepgramStreaming = async () => {
    try {
      const apiKey = await getDeepgramApiKey();

      // Deepgram WebSocket URL with keyterms support
      const params = new URLSearchParams({
        model: 'nova-3',
        language: sourceLanguage,
        smart_format: 'true',
        interim_results: 'true',
        endpointing: '500',
        utterance_end_ms: '1000',
      });

      // Add keyterms if configured (stored in localStorage)
      const savedKeyterms = localStorage.getItem('asr_keyterms');
      console.log('[DEEPGRAM DEBUG] savedKeyterms from localStorage:', savedKeyterms);
      if (savedKeyterms) {
        try {
          const keyterms = JSON.parse(savedKeyterms) as string[];
          keyterms.forEach(term => {
            // Add keyterm for better recognition
            params.append('keyterm', term);

            // Also add find-and-replace for guaranteed formatting
            // The find term must be lowercase, replacement can be any case
            const lowerTerm = term.toLowerCase();
            if (lowerTerm !== term) {
              // If term has uppercase, add replacement rule
              params.append('replace', `${lowerTerm}:${term}`);
            }

            // Also add replacement for common variations without special chars
            const simpleTerm = term.replace(/[:\-_]/g, ' ').toLowerCase().trim();
            if (simpleTerm !== lowerTerm && simpleTerm !== term.toLowerCase()) {
              params.append('replace', `${simpleTerm}:${term}`);
            }
          });
          console.log('[DEEPGRAM] Using keyterms:', keyterms);
          console.log('[DEEPGRAM DEBUG] Final URL params:', params.toString());
        } catch {
          console.warn('[DEEPGRAM] Failed to parse keyterms');
        }
      } else {
        console.log('[DEEPGRAM DEBUG] No keyterms found in localStorage');
      }

      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?${params.toString()}`,
        ['token', apiKey]
      );

      ws.onopen = () => {
        console.log('[DEEPGRAM] WebSocket opened');
        startMediaRecorder(ws);
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'Results') {
          const transcriptText = data.channel?.alternatives?.[0]?.transcript;
          const isFinal = data.is_final;

          if (transcriptText) {
            if (isFinal) {
              // Add to accumulated transcript
              accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + transcriptText).trim();
            }

            // Show full accumulated text + current interim
            const displayText = (accumulatedTranscriptRef.current + ' ' + (isFinal ? '' : transcriptText)).trim();
            setTranscript(displayText);
            currentTranscriptRef.current = displayText;
          }
        } else if (data.type === 'UtteranceEnd') {
          // Deepgram detected end of utterance. This is our trigger to translate.
          const finalUtterance = accumulatedTranscriptRef.current.trim();

          if (finalUtterance) {
            console.log('[DEEPGRAM] UtteranceEnd received, translating:', finalUtterance);
            const targetLanguages = Object.keys(LANGUAGES).filter(lang => lang !== sourceLanguage);

            try {
              const translationsResult = await Promise.all(
                targetLanguages.map(targetLang =>
                  translateText({
                    text: finalUtterance,
                    sourceLanguage,
                    targetLanguage: targetLang,
                    useGpt,
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

              setTranslations(newTranslations);
            } catch (err) {
              console.error('[DEEPGRAM] Translation failed:', err);
            }

            // Clear accumulated for next utterance
            accumulatedTranscriptRef.current = '';
          }
        }
      };

      ws.onerror = (error) => {
        console.error('[DEEPGRAM] WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('[DEEPGRAM] WebSocket closed');
      };

      deepgramWsRef.current = ws;
    } catch (error) {
      console.error('[DEEPGRAM] Initialization failed:', error);
    }
  };

  const startMediaRecorder = async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };

      mediaRecorder.start(250); // Send 250ms chunks
      mediaRecorderRef.current = mediaRecorder;
    } catch (error) {
      console.error('[DEEPGRAM] MediaRecorder failed:', error);
    }
  };

  // Initialize Google STT gRPC Streaming via WebSocket Proxy
  const initializeGoogleSttStreaming = async () => {
    // Get proxy URL from environment or fall back to VAD approach
    const proxyUrl = import.meta.env.VITE_GOOGLE_STT_PROXY_URL;

    if (!proxyUrl) {
      console.log('[GOOGLE_STT] No proxy URL configured, falling back to VAD approach');
      // Fall back to VAD approach
      const vad = await initializeAdvancedASR('whisper'); // Use Whisper's VAD pattern with Google STT
      if (vad) {
        vad.start();
        setIsRecording(true);
      }
      return;
    }

    try {
      console.log('[GOOGLE_STT] Initializing WebSocket streaming...');

      // Map language code
      const languageCodeMap: Record<string, string> = {
        'en': 'en-US',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
      };
      const languageCode = languageCodeMap[sourceLanguage] || 'en-US';

      // Build WebSocket URL with keyterms
      let wsUrl = `${proxyUrl}?language=${languageCode}`;

      // Add keyterms if configured
      const savedKeyterms = localStorage.getItem('asr_keyterms');
      console.log('[GOOGLE_STT DEBUG] savedKeyterms from localStorage:', savedKeyterms);
      if (savedKeyterms) {
        try {
          const keyterms = JSON.parse(savedKeyterms) as string[];
          keyterms.forEach(term => {
            wsUrl += `&keyterms=${encodeURIComponent(term)}`;
          });
          console.log('[GOOGLE_STT] Using keyterms:', keyterms);
          console.log('[GOOGLE_STT DEBUG] Final wsUrl:', wsUrl);
        } catch {
          console.warn('[GOOGLE_STT] Failed to parse keyterms');
        }
      } else {
        console.log('[GOOGLE_STT DEBUG] No keyterms found in localStorage');
      }

      // Connect to WebSocket proxy
      const ws = new WebSocket(wsUrl);
      googleSttWsRef.current = ws;

      ws.onopen = () => {
        console.log('[GOOGLE_STT] WebSocket connected');
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'ready') {
            console.log('[GOOGLE_STT] Server ready, starting audio capture');
            startGoogleSttMediaRecorder(ws);
          } else if (data.type === 'result') {
            const { transcript, isFinal, confidence } = data;

            if (transcript) {
              if (isFinal) {
                // Final result - translate it
                const finalText = transcript;
                console.log('[GOOGLE_STT] Final result, translating:', finalText);

                const targetLanguages = Object.keys(LANGUAGES).filter(lang => lang !== sourceLanguage);

                try {
                  const translationsResult = await Promise.all(
                    targetLanguages.map(targetLang =>
                      translateText({
                        text: finalText,
                        sourceLanguage,
                        targetLanguage: targetLang,
                        useGpt,
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

                  setTranslations(newTranslations);
                } catch (err) {
                  console.error('[GOOGLE_STT] Translation failed:', err);
                }

                // Show final result and reset for next sentence
                setTranscript(finalText);
                currentTranscriptRef.current = finalText;
                googleSttAccumulatedRef.current = '';
              } else {
                // Interim result - show it
                setTranscript(transcript);
                currentTranscriptRef.current = transcript;
              }
            }
          } else if (data.type === 'error') {
            console.error('[GOOGLE_STT] Server error:', data.error);
          }
        } catch (err) {
          console.error('[GOOGLE_STT] Failed to parse message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[GOOGLE_STT] WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('[GOOGLE_STT] WebSocket closed');
      };

    } catch (error) {
      console.error('[GOOGLE_STT] Initialization failed:', error);
    }
  };

  // Start MediaRecorder for Google STT WebSocket streaming
  const startGoogleSttMediaRecorder = async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      googleSttStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };

      mediaRecorder.start(250); // Send 250ms chunks
      googleSttMediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      console.log('[GOOGLE_STT] MediaRecorder started');
    } catch (error) {
      console.error('[GOOGLE_STT] MediaRecorder failed:', error);
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

  // Initialize Web Speech API and handle transcription
  useEffect(() => {
    if (!sourceLanguage || !isStarted) {
      shouldKeepListeningRef.current = false;
      // Stop silent audio
      audioRef.current?.pause();
      return;
    }

    shouldKeepListeningRef.current = true;

    // Start silent audio to keep tab active
    audioRef.current?.play().catch(e => console.log("Audio play failed", e));

    // Use Advanced ASR (MicVAD + Whisper/Gemini/Google STT VAD) or streaming (Deepgram/Google STT Streaming) if enabled
    if (asrModel !== 'webspeech') {
      // Save keyterms to localStorage for supported models
      console.log('[ASR DEBUG] supportsKeyterms:', supportsKeyterms, 'keytermsPills:', keytermsPills);
      if (supportsKeyterms && keytermsPills.length > 0) {
        const keyterms = keytermsPills.map(term => term.replace(/_/g, ' '));
        localStorage.setItem('asr_keyterms', JSON.stringify(keyterms));
        console.log('[ASR] Keyterms locked in:', keyterms);
      } else {
        localStorage.removeItem('asr_keyterms');
        console.log('[ASR DEBUG] Keyterms removed - supportsKeyterms:', supportsKeyterms, 'keytermsPills.length:', keytermsPills.length);
      }

      if (asrModel === 'deepgram') {
        initializeDeepgramStreaming();
      } else if (asrModel === 'google-stt-streaming') {
        // Use WebSocket streaming for Google STT
        initializeGoogleSttStreaming();
      } else if (asrModel === 'google-stt') {
        // Use VAD-based approach for Google STT
        initializeAdvancedASR('google-stt').then(vad => {
          if (vad) {
            vad.start();
            setIsRecording(true);
          }
        });
      } else {
        // Use VAD-based approach for Whisper, Gemini
        initializeAdvancedASR(asrModel).then(vad => {
          if (vad) {
            vad.start();
            setIsRecording(true);
          }
        });
      }

      return () => {
        shouldKeepListeningRef.current = false;

        // Cleanup Deepgram
        if (deepgramWsRef.current) {
          deepgramWsRef.current.close();
          deepgramWsRef.current = null;
        }
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          mediaRecorderRef.current = null;
        }
        accumulatedTranscriptRef.current = "";

        // Cleanup Google STT
        if (googleSttWsRef.current) {
          googleSttWsRef.current.close();
          googleSttWsRef.current = null;
        }
        if (googleSttMediaRecorderRef.current) {
          googleSttMediaRecorderRef.current.stop();
          googleSttMediaRecorderRef.current = null;
        }
        if (googleSttStreamRef.current) {
          googleSttStreamRef.current.getTracks().forEach(track => track.stop());
          googleSttStreamRef.current = null;
        }
        googleSttAccumulatedRef.current = "";

        // Cleanup VAD
        if (micVAD) {
          micVAD.pause();
          setIsRecording(false);
          setVadStatus('idle');
        }
      };
    }

    // Use Web Speech API if webspeech is selected
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
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

          // Clear silence timer on final result
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
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
                    useGpt,
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
            } catch {
              // Translation failed silently
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

          // Reset silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          // Force finalization if silence is detected for 2 seconds
          silenceTimerRef.current = setTimeout(() => {
            console.log("Silence detected, restarting recognition to force finalization...");
            try {
              recognitionInstance.stop();
            } catch (e) {
              console.error("Error stopping recognition on silence:", e);
            }
          }, 2000);
        }
      }
    };

    // Handle recognition errors and restarts
    recognitionInstance.onerror = () => {
      if (shouldKeepListeningRef.current && isStarted) {
        setTimeout(() => {
          try {
            recognitionInstance.start();
          } catch {
            // Failed to restart recognition
          }
        }, 1000);
      }
    };

    recognitionInstance.onend = () => {
      if (shouldKeepListeningRef.current && isStarted) {
        setTimeout(() => {
          try {
            recognitionInstance.start();
          } catch {
            // Failed to restart recognition
          }
        }, 1000);
      }
    };

    setRecognition(recognitionInstance);

    // Start recognition
    try {
      recognitionInstance.start();
    } catch {
      // Failed to start recognition
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      shouldKeepListeningRef.current = false;
      try {
        recognitionInstance.stop();
      } catch {
        // Failed to stop recognition
      }
    };
    // Note: translateText, transcribeWithGroq, and transcribeWithGemini are stable Convex action references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLanguage, isStarted, useGpt, asrModel]);

  // Start/stop listening
  const startListening = () => {
    setIsStarted(true);
  };

  const stopListening = () => {
    shouldKeepListeningRef.current = false;

    // Stop Web Speech API if active
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Failed to stop recognition
      }
    }

    // Stop Advanced ASR if active
    if (micVAD) {
      try {
        micVAD.pause();
        setIsRecording(false);
        setVadStatus('idle');
      } catch {
        // Failed to stop MicVAD
      }
    }

    // Stop Deepgram Streaming if active
    if (deepgramWsRef.current) {
      try {
        deepgramWsRef.current.close();
        deepgramWsRef.current = null;
      } catch {
        // Failed to close Deepgram WS
      }
    }

    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        mediaRecorderRef.current = null;
      } catch {
        // Failed to stop MediaRecorder
      }
    }

    accumulatedTranscriptRef.current = "";

    // Clear speaking state and timeouts
    isSpeakingRef.current = false;
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    audioRef.current?.pause();

    // Reset all state to return to home page
    setIsStarted(false);
    setTranscript("");
    setTranslations({});
    currentTranscriptRef.current = "";
  };

  const obsLinkWithSession = `/server-export?session=${sessionIdRef.current}${useGpt ? '&gpt=true' : ''}`;

  // Also create CSS Customizer link with session ID
  const cssCustomizerLinkWithSession = `/css-customizer?session=${sessionIdRef.current}&source=${sourceLanguage}`;

  // Always display raw transcript for real-time viewing, punctuation works behind the scenes
  const displayTranscript = transcript;

  return (
    <div className="relative">
      {/* Keyterms UI - Positioned OUTSIDE/BELOW the main container */}
      {!isStarted && supportsKeyterms && (
        <>
          {/* Toggle Circle - bottom-right of main container, aligned to bottom edge */}
          <button
            onClick={() => setShowKeytermsPanel(!showKeytermsPanel)}
            className="absolute -right-8 bottom-0 w-6 h-6 bg-[#2d2d2d] hover:bg-[#404040] rounded-full flex items-center justify-center transition-all z-10 shadow-lg border border-[#efefef]/20"
            title="Toggle keyterms"
          >
            <svg
              className={`w-3.5 h-3.5 text-[#efefef] transition-transform duration-300 ${showKeytermsPanel ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Keyterms Input Panel - Full width below the container, matched color */}
          {showKeytermsPanel && (
            <div className="absolute top-[calc(100%+0.5rem)] left-0 w-full bg-[#2d2d2d] rounded-lg p-4 shadow-xl z-20 border border-[#efefef]/10">
              <label className="text-sm text-[#efefef] mb-2 block font-medium opacity-80">
                Keyterms
              </label>
              <div
                className="w-full min-h-[6rem] p-2 bg-[#606060] border border-[#efefef]/50 rounded-lg focus-within:border-[#efefef] transition-colors flex flex-wrap gap-2 content-start cursor-text relative"
                style={{ fontFamily: "'Inter', sans-serif" }}
                onClick={(e) => {
                  const input = (e.currentTarget.querySelector('input') as HTMLInputElement);
                  if (input) input.focus();
                }}
              >
                {/* Placeholder text - shown when no pills */}
                {keytermsPills.length === 0 && !keytermsInput && (
                  <p className="absolute top-2 left-2 right-2 text-[#efefef]/50 text-sm pointer-events-none leading-relaxed">
                    Add words commonly used to help listening models understand you better. Use Space to separate terms, and underscore to identify spaces.
                  </p>
                )}
                {/* Pills */}
                {keytermsPills.map((pill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[#404040] text-[#efefef] rounded-md text-sm"
                  >
                    {pill}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setKeytermsPills(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="ml-1 text-[#efefef]/60 hover:text-[#efefef] transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {/* Input */}
                <input
                  type="text"
                  value={keytermsInput}
                  onChange={(e) => setKeytermsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' && keytermsInput.trim()) {
                      e.preventDefault();
                      const term = keytermsInput.trim().replace(/_/g, ' ');
                      setKeytermsPills(prev => [...prev, term]);
                      setKeytermsInput('');
                    } else if (e.key === 'Backspace' && !keytermsInput && keytermsPills.length > 0) {
                      setKeytermsPills(prev => prev.slice(0, -1));
                    }
                  }}
                  className="flex-1 min-w-[120px] bg-transparent text-[#efefef] outline-none text-sm"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex flex-col w-full rounded-xl bg-[#2d2d2d] overflow-hidden shadow-2xl relative">
        {!isStarted ? (
          <div className="flex flex-col pt-16 px-8 pb-20 relative w-full max-w-[450px] responsive-container">
            {/* Logo Button - Top Center */}
            <div className="flex justify-center mb-16">
              <button
                onClick={sourceLanguage ? startListening : undefined}
                disabled={!sourceLanguage}
                className={`transition-all duration-200 ${sourceLanguage
                  ? "cursor-pointer hover:scale-105 active:scale-95"
                  : "opacity-50 cursor-not-allowed"
                  }`}
                title={sourceLanguage ? t.startListening : t.selectLanguage}
              >
                <img
                  src="/catt_logo_white.png"
                  alt="CATT Logo"
                  className="w-14 h-14"
                />
              </button>
            </div>

            {/* Dropdowns Container */}
            <div className="flex flex-col gap-3 w-full">
              {/* Language Dropdown */}
              <div className="flex items-center gap-4">
                <label className="text-xl text-[#606060] uppercase tracking-wide label-stroke min-w-[140px] shrink-0">
                  {t.languages}
                </label>
                <div className="flex-1 min-w-0 overflow-hidden rounded-lg">
                  <select
                    className="w-full px-4 py-2 bg-[#606060] text-[#efefef] border border-[#efefef]/50 transition-all hover:bg-[#707070] focus:outline-none focus:border-[#efefef] custom-select cursor-pointer rounded-lg"
                    value={sourceLanguage}
                    onChange={(e) => {
                      const selectedLang = e.target.value;
                      setSourceLanguage(selectedLang);
                      updateUILanguageFromSource(selectedLang);
                    }}
                  >
                    <option value="">{t.selectLanguage}</option>
                    {Object.entries(LANGUAGES).map(([code]) => {
                      const languageNameMap: Record<string, string> = {
                        en: t.languageEnglish,
                        ja: t.languageJapanese,
                        ko: t.languageKorean,
                      };
                      return (
                        <option key={code} value={code}>
                          {languageNameMap[code]}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* ASR Model Dropdown */}
              <div className="flex items-center gap-4">
                <label className="text-xl text-[#606060] uppercase tracking-wide label-stroke min-w-[140px] shrink-0">
                  {t.asrModel}
                </label>
                <div className="flex-1 min-w-0 overflow-hidden rounded-lg">
                  <select
                    className="w-full px-4 py-2 bg-[#606060] text-[#efefef] border border-[#efefef]/50 transition-all hover:bg-[#707070] focus:outline-none focus:border-[#efefef] custom-select cursor-pointer rounded-lg"
                    value={asrModel}
                    onChange={(e) => setAsrModel(e.target.value as 'webspeech' | 'whisper' | 'gemini' | 'deepgram' | 'google-stt' | 'google-stt-streaming')}
                  >
                    <option value="webspeech">{t.asrWebSpeech}</option>
                    <option value="whisper">{t.asrWhisper}</option>
                    <option value="gemini">{t.asrGemini}</option>
                    <option value="deepgram">{t.asrDeepgram}</option>
                    <option value="google-stt">{t.asrGoogleStt}</option>
                    <option value="google-stt-streaming">{t.asrGoogleSttStreaming}</option>
                  </select>
                </div>
              </div>

              {/* Translation Model Dropdown */}
              <div className="flex items-center gap-4">
                <label className="text-xl text-[#606060] uppercase tracking-wide label-stroke min-w-[140px] shrink-0">
                  {t.translation}
                </label>
                <div className="flex-1 min-w-0 overflow-hidden rounded-lg">
                  <select
                    className="w-full px-4 py-2 bg-[#606060] text-[#efefef] border border-[#efefef]/50 transition-all hover:bg-[#707070] focus:outline-none focus:border-[#efefef] custom-select cursor-pointer rounded-lg"
                    value={useGpt ? "gpt" : "gemini"}
                    onChange={(e) => setUseGpt(e.target.value === "gpt")}
                  >
                    <option value="gemini">{t.translationGemini}</option>
                    <option value="gpt">{t.translationGpt}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Outline SVG - Bottom, half visible (midpoint at container bottom) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-full flex justify-center pointer-events-none z-0">
              <img
                src="/outline.svg"
                alt=""
                className="w-full max-w-[400px] h-auto opacity-40"
              />
            </div>

            {/* Typewriter Carousel Tagline - Positioned over the SVG */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full flex justify-center z-10 pb-4">
              <TypewriterCarousel scrambleSpeed={100} pauseDuration={8000} scrambleIterations={15} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col p-8 min-h-[70vh] w-full max-w-[520px] responsive-container">
            {/* Header with logo and stop button */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <img
                  src="/catt_logo_white.png"
                  alt="CATT Logo"
                  className="w-10 h-10 opacity-80"
                />
                <h2 className="text-2xl text-[#606060] uppercase tracking-wide label-stroke">{t.console}</h2>
              </div>
              <button
                onClick={stopListening}
                className="px-5 py-2.5 rounded-lg text-sm bg-[#606060] text-[#efefef] border border-[#efefef]/30 hover:bg-[#707070] transition-colors"
              >
                {t.stopAndReset}
              </button>
            </div>

            {/* Transcript and Translations */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
              {/* Original Transcript */}
              <div className="p-5 bg-[#1e1e1e]/60 rounded-lg border border-[#606060]/30">
                <div className="text-sm uppercase text-[#606060] mb-2 tracking-wide label-stroke">
                  {t.original} ({LANGUAGES[sourceLanguage as keyof typeof LANGUAGES]})
                </div>
                <p className="text-xl text-[#efefef] min-h-[2.5rem] leading-relaxed font-readable">
                  {displayTranscript || (
                    <span className="text-[#606060] animate-pulse font-readable">{t.listening}</span>
                  )}
                </p>
              </div>

              {/* Translations - Always show all target languages */}
              {Object.keys(LANGUAGES)
                .filter(lang => lang !== sourceLanguage)
                .map((lang) => (
                  <div key={lang} className="p-5 bg-[#1e1e1e]/40 rounded-lg border border-[#606060]/20">
                    <div className="text-sm uppercase text-[#606060] mb-2 tracking-wide label-stroke">
                      {LANGUAGES[lang as keyof typeof LANGUAGES]}
                    </div>
                    <p className="text-xl text-[#efefef] leading-relaxed font-readable">
                      {translations[lang] || (
                        <span className="text-[#606060] animate-pulse font-readable">{t.listening}</span>
                      )}
                    </p>
                  </div>
                ))}
            </div>

            {/* Footer Actions */}
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => {
                  const baseUrl = window.location.origin;
                  const fullUrl = `${baseUrl}${obsLinkWithSession}`;

                  navigator.clipboard.writeText(fullUrl)
                    .then(() => {
                      const copyIndicator = document.createElement('div');
                      copyIndicator.textContent = 'Link copied!';
                      copyIndicator.style.position = 'fixed';
                      copyIndicator.style.bottom = '20px';
                      copyIndicator.style.left = '50%';
                      copyIndicator.style.transform = 'translateX(-50%)';
                      copyIndicator.style.backgroundColor = '#606060';
                      copyIndicator.style.color = '#efefef';
                      copyIndicator.style.padding = '10px 20px';
                      copyIndicator.style.borderRadius = '8px';
                      copyIndicator.style.zIndex = '9999';
                      copyIndicator.style.opacity = '0';
                      copyIndicator.style.transition = 'opacity 0.3s ease-in-out';
                      copyIndicator.style.fontFamily = 'Technotype34, sans-serif';

                      document.body.appendChild(copyIndicator);

                      setTimeout(() => {
                        copyIndicator.style.opacity = '1';
                      }, 10);

                      setTimeout(() => {
                        copyIndicator.style.opacity = '0';
                        setTimeout(() => {
                          document.body.removeChild(copyIndicator);
                        }, 300);
                      }, 2000);
                    })
                    .catch(() => {
                      // Failed to copy to clipboard
                    });
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-lg bg-[#606060] text-[#efefef] border border-[#efefef]/30 hover:bg-[#707070] transition-all"
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
                className="flex items-center gap-2 px-5 py-3 rounded-lg bg-[#1e1e1e]/60 text-[#606060] border border-[#606060]/30 hover:bg-[#1e1e1e] hover:text-[#efefef] transition-all"
              >
                <span>{t.customizeObs}</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
