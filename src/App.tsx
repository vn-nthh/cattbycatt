import { useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import ServerExportView from "./components/ServerExportView";
import CSSCustomizer from "./components/CSSCustomizer";
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
  chooseLanguage: string;
  selectLanguage: string;
  
  // Settings
  useGptTranslation: string;
  useAdvancedAsr: string;
  
  // Actions
  startListening: string;
  customizeObsStyling: string;
  
  // Console page
  console: string;
  stopAndReset: string;
  listening: string;
  
  // Language labels
  original: string;
  
  // Links
  openObsView: string;
  customizeObs: string;
}

const mainAppTranslations: Record<string, MainAppTranslations> = {
  en: {
    appTitle: "CATT by Catt",
    appSubtitle: "Real-time Captioning And Translating Tool",
    chooseLanguage: "Choose Your Language",
    selectLanguage: "Select Language",
    useGptTranslation: "Use GPT-4 Nano for translation",
    useAdvancedAsr: "Use Advanced ASR",
    startListening: "Start Listening",
    customizeObsStyling: "🎨 Customize OBS Styling",
    console: "Console",
    stopAndReset: "Stop & Reset",
    listening: "Listening...",
    original: "Original",
    openObsView: "Open OBS View",
    customizeObs: "🎨 Customize OBS"
  },
  
  ja: {
    appTitle: "CATT by Catt",
    appSubtitle: "リアルタイム字幕・翻訳ツール",
    chooseLanguage: "言語を選択",
    selectLanguage: "言語を選択",
    useGptTranslation: "翻訳にGPT-4 Nanoを使用",
    longTextChunking: "長文チャンク化アルゴリズム（実験的）",
    useAdvancedAsr: "高度なASRを使用",
    startListening: "聞き取り開始",
    customizeObsStyling: "🎨 OBSスタイルをカスタマイズ",
    console: "コンソール",
    stopAndReset: "停止してリセット",
    listening: "聞き取り中...",
    processing: "処理中...",
    punctuationActive: "句読点処理が有効",
    incomplete: "未完了",
    original: "原文",
    openObsView: "OBSビューを開く",
    customizeObs: "🎨 OBSをカスタマイズ"
  },
  
  ko: {
    appTitle: "CATT by Catt",
    appSubtitle: "실시간 자막 및 번역 도구",
    chooseLanguage: "언어 선택",
    selectLanguage: "언어 선택",
    useGptTranslation: "번역에 GPT-4 Nano 사용",
    longTextChunking: "긴 텍스트 청킹 알고리즘 (실험적)",
    useAdvancedAsr: "고급 ASR 사용",
    startListening: "듣기 시작",
    customizeObsStyling: "🎨 OBS 스타일 사용자 지정",
    console: "콘솔",
    stopAndReset: "정지 및 재설정",
    listening: "듣는 중...",
    processing: "처리 중...",
    punctuationActive: "구두점 처리 활성화",
    incomplete: "미완료",
    original: "원본",
    openObsView: "OBS 보기 열기",
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
    <div className="min-h-screen flex flex-col bg-gray-950">
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-3xl mx-auto">
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
  const [useAdvancedAsr, setUseAdvancedAsr] = useState(false);



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
  const sessionIdRef = useRef(getSessionId());
  
  // Add ref to track if we want to keep listening (for proper cleanup)
  const shouldKeepListeningRef = useRef(false);

  const currentTranscriptRef = useRef<string>("");
  const isSpeakingRef = useRef<boolean>(false);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Local state for transcript and translations
  const [transcript, setTranscript] = useState<string>("");
  const [translations, setTranslations] = useState<Record<string, string>>({});

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
      
      const vad = await MicVAD.new({
        preSpeechPadFrames: 10,
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.35,
        redemptionFrames: 8,
        frameSamples: 1536,
        minSpeechFrames: 4,
        minSilenceFrames: 10,
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
            
            const result = await transcribeWithGroq({
              audioBlob: wavBuffer, // Pass ArrayBuffer directly, not Uint8Array
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
                } catch (error) {
                  console.error("Translation error:", error);
                }
              }
            }
          } catch (error) {
            console.error("Groq transcription error:", error);
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
            recognitionInstance.start();
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
  // Update the OBS link generation to include the session ID
  const obsLinkWithSession = `/server-export?session=${sessionIdRef.current}${useGpt ? '&gpt=true' : ''}`;
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
  }, [sourceLanguage, isStarted, useGpt, useAdvancedAsr, translateText, transcribeWithGroq]);

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

  const obsLinkWithSession = `/server-export?session=${sessionIdRef.current}${useGpt ? '&gpt=true' : ''}`;
  
  // Also create CSS Customizer link with session ID
  const cssCustomizerLinkWithSession = `/css-customizer?session=${sessionIdRef.current}&source=${sourceLanguage}`;

  // Always display raw transcript for real-time viewing, punctuation works behind the scenes
  const displayTranscript = transcript;

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-gray-950/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-800/30">
      {!isStarted ? (
        <div className="flex flex-col items-center justify-center gap-8 p-10 text-center min-h-[80vh]">
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-white text-shadow mb-2">{t.appTitle}</h1>
            <p className="text-xl text-gray-400 text-shadow">{t.appSubtitle}</p>
          </div>
          
          <div className="w-full max-w-xs bg-gray-900/70 backdrop-blur-sm p-6 rounded-xl shadow-inner border border-gray-800/30">
            <h2 className="text-xl font-semibold text-white mb-4">{t.chooseLanguage}</h2>
            <select
              className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white font-medium border border-gray-700 shadow-md transition-all hover:bg-gray-750 focus:ring-2 focus:ring-gray-600 focus:outline-none mb-4"
              value={sourceLanguage}
              onChange={(e) => {
                const selectedLang = e.target.value;
                setSourceLanguage(selectedLang);
                
                // Update UI language based on source language selection
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
            
            {/* Advanced ASR Toggle */}
            <label className="flex items-center justify-between w-full p-3 rounded-lg bg-gray-800/50 text-white cursor-pointer hover:bg-gray-800/70 transition-colors mb-4">
              <span>{t.useAdvancedAsr}</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={useAdvancedAsr}
                  onChange={(e) => setUseAdvancedAsr(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full ${useAdvancedAsr ? 'bg-gray-600' : 'bg-gray-700'} transition-colors`}></div>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transform transition-transform ${useAdvancedAsr ? 'translate-x-6' : ''}`}></div>
              </div>
            </label>

            <label className="flex items-center justify-between w-full p-3 rounded-lg bg-gray-800/50 text-white cursor-pointer hover:bg-gray-800/70 transition-colors mb-4">
              <span className="text-left">{t.useGptTranslation}</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={useGpt}
                  onChange={(e) => setUseGpt(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full ${useGpt ? 'bg-gray-600' : 'bg-gray-700'} transition-colors`}></div>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transform transition-transform ${useGpt ? 'translate-x-6' : ''}`}></div>
              </div>
            </label>
          </div>
          
          {sourceLanguage && (
            <div className="flex flex-col items-center mt-2">
              <button
                onClick={startListening}
                className="px-8 py-4 rounded-full text-lg font-bold bg-gray-800 text-white shadow-lg hover:bg-gray-700 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50"
              >
                {t.startListening}
              </button>
              <div className="mt-4 text-gray-400 flex justify-center items-center">
                <Link 
                  to={cssCustomizerLinkWithSession}
                  target="_blank"
                  className="flex items-center gap-2 hover:text-white transition-colors text-sm"
                >
                  <span>{t.customizeObsStyling}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col p-10 min-h-[80vh]">
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
            <Link 
              to={obsLinkWithSession}
              target="_blank"
              className="flex items-center gap-2 px-5 py-3 rounded-lg bg-gray-900/30 text-gray-400 hover:bg-gray-900/50 hover:text-white transition-all"
            >
              <span>{t.openObsView}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
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