import { useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import ServerExportView from "./components/ServerExportView";
import ConvexDiagnostic from "./components/ConvexDiagnostic";

const LANGUAGES = {
  en: "English",
  ja: "Japanese",
  ko: "Korean",
} as const;

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
      </Routes>
      {showDiagnostic && <ConvexDiagnostic />}
    </>
  );
}

function MainApp() {
  return (
    <div className="min-h-screen flex flex-col bg-transparent">
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
  const translateText = useAction(api.translate.translateText);
  const accumulatedTextRef = useRef<string>("");
  const translationTimeoutRef = useRef<number | null>(null);
  const restartTimeoutRef = useRef<number | null>(null);
  const healthCheckIntervalRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isRestartingRef = useRef<boolean>(false);

  // Local state for transcript and translations
  const [transcript, setTranscript] = useState<string>("");
  const [translations, setTranslations] = useState<Record<string, string>>({});

  // Update to use the Convex mutation to store transcriptions
  const storeTranscription = useMutation(api.transcription.storeTranscription);
  
  // Store transcriptions in Convex when they change
  useEffect(() => {
    if (transcript) {
      storeTranscription({
        transcript,
        translations,
        sourceLanguage
      }).catch(error => {
        console.error("Error storing transcription:", error);
      });
    }
  }, [transcript, translations, sourceLanguage, storeTranscription]);

  const translateAccumulatedText = async () => {
    const text = accumulatedTextRef.current.trim();
    if (text) {
      const targetLanguages = Object.keys(LANGUAGES).filter(lang => lang !== sourceLanguage);
      const translationsResult = await Promise.all(
        targetLanguages.map(targetLang =>
          translateText({
            text,
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
    }
  };

  const startRecognition = (recognition: SpeechRecognition) => {
    if (isRestartingRef.current) return;
    
    isRestartingRef.current = true;
    
    try {
      recognition.start();
      lastActivityRef.current = Date.now();
    } catch (error) {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      restartTimeoutRef.current = window.setTimeout(() => {
        if (isStarted) {
          isRestartingRef.current = false;
          startRecognition(recognition);
        }
      }, 1000);
    } finally {
      isRestartingRef.current = false;
    }
  };

  const forceRestart = (recognition: SpeechRecognition) => {
    if (!isStarted || isRestartingRef.current) return;
    
    isRestartingRef.current = true;
    
    try {
      recognition.stop();
    } catch (e) {
      console.error("Error stopping recognition:", e);
    }
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    
    restartTimeoutRef.current = window.setTimeout(() => {
      if (isStarted) {
        isRestartingRef.current = false;
        startRecognition(recognition);
      }
    }, 1000);
  };

  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = sourceLanguage;

      const handleSpeechResult = async (event: SpeechRecognitionEvent) => {
        lastActivityRef.current = Date.now();
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            accumulatedTextRef.current = transcript;
            
            if (translationTimeoutRef.current) {
              clearTimeout(translationTimeoutRef.current);
            }
            
            translationTimeoutRef.current = window.setTimeout(translateAccumulatedText, 10);
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
        } else if (interimTranscript) {
          setTranscript(interimTranscript);
        }
      };

      recognition.onresult = handleSpeechResult;

      recognition.onend = () => {
        if (isStarted && !isRestartingRef.current) {
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          restartTimeoutRef.current = window.setTimeout(() => {
            if (isStarted) {
              startRecognition(recognition);
            }
          }, 1000);
        }
      };

      recognition.onerror = () => {
        if (isStarted && !isRestartingRef.current) {
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          restartTimeoutRef.current = window.setTimeout(() => {
            if (isStarted) {
              startRecognition(recognition);
            }
          }, 1000);
        }
      };

      setRecognition(recognition);

      healthCheckIntervalRef.current = window.setInterval(() => {
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity > 15000 && !isRestartingRef.current) {
          forceRestart(recognition);
        }
      }, 5000);
    }

    return () => {
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [sourceLanguage, isStarted, translateText]);

  const startListening = () => {
    if (!recognition) return;
    setIsStarted(true);
    startRecognition(recognition);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-transparent">
      {!isStarted ? (
        <div className="flex flex-col items-center gap-6">
          <h1 className="text-3xl font-bold text-white text-shadow mb-4">Real-time Translation</h1>
          <select
            className="input-field text-sm py-1 w-40"
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
          >
            <option value="">Select Language</option>
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-white text-shadow">
            <input
              type="checkbox"
              checked={useGpt}
              onChange={(e) => setUseGpt(e.target.checked)}
              className="form-checkbox h-4 w-4"
            />
            Use GPT-4 Nano for translation
          </label>
          {sourceLanguage && (
            <div className="flex flex-col gap-4 items-center">
              <button
                onClick={startListening}
                className="px-6 py-2 rounded text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                Start Listening
              </button>
              <div className="flex flex-col gap-2 mt-4">
                <Link 
                  to="/server-export" 
                  target="_blank"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Open OBS View
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-6 text-center">
            <p className="text-2xl text-white text-shadow">{transcript}</p>
            {Object.entries(translations).map(([lang, translation]) => (
              <p key={lang} className="text-2xl text-white text-shadow">{translation}</p>
            ))}
            <div className="flex flex-col gap-2 mt-4">
              <Link 
                to="/server-export" 
                target="_blank"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Open OBS View
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
