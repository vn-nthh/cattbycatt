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
  const [asrModel, setAsrModel] = useState<'webspeech' | 'whisper' | 'gemini'>('webspeech');



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
  const sessionIdRef = useRef(getSessionId());

  // Add ref to track if we want to keep listening (for proper cleanup)
  const shouldKeepListeningRef = useRef(false);

  const currentTranscriptRef = useRef<string>("");
  const isSpeakingRef = useRef<boolean>(false);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for background execution and silence detection
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

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


  // Initialize MicVAD for Advanced ASR
  const initializeAdvancedASR = async (selectedAsrModel: 'whisper' | 'gemini') => {
    // Select the appropriate transcription function based on ASR model
    const transcribeAudio = selectedAsrModel === 'gemini' ? transcribeWithGemini : transcribeWithGroq;
    
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

            const result = await transcribeAudio({
              audioBlob: wavBuffer,
              language: sourceLanguage,
              sessionId: sessionIdRef.current,
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

    // Use Advanced ASR (MicVAD + Whisper/Gemini) if enabled
    if (asrModel !== 'webspeech') {
      initializeAdvancedASR(asrModel).then(vad => {
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
    <div className="flex flex-col w-full rounded-xl bg-[#2d2d2d] overflow-hidden shadow-2xl relative">
      {!isStarted ? (
        <div className="flex flex-col pt-16 px-8 pb-20 relative w-full max-w-[450px] responsive-container">
          {/* Logo Button - Top Center */}
          <div className="flex justify-center mb-16">
            <button
              onClick={sourceLanguage ? startListening : undefined}
              disabled={!sourceLanguage}
              className={`transition-all duration-200 ${
                sourceLanguage
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
                  onChange={(e) => setAsrModel(e.target.value as 'webspeech' | 'whisper' | 'gemini')}
                >
                  <option value="webspeech">{t.asrWebSpeech}</option>
                  <option value="whisper">{t.asrWhisper}</option>
                  <option value="gemini">{t.asrGemini}</option>
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

            {/* Translations */}
            {Object.entries(translations).map(([lang, translation]) => (
              <div key={lang} className="p-5 bg-[#1e1e1e]/40 rounded-lg border border-[#606060]/20">
                <div className="text-sm uppercase text-[#606060] mb-2 tracking-wide label-stroke">
                  {LANGUAGES[lang as keyof typeof LANGUAGES]}
                </div>
                <p className="text-xl text-[#efefef] leading-relaxed font-readable">{translation}</p>
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
  );
}

export default App;
