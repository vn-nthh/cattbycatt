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
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-gray-950/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-800/30">
      {!isStarted ? (
        <div className="flex flex-col items-center justify-center gap-8 p-10 text-center min-h-[80vh]">
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-white text-shadow mb-2">CATT by Catt</h1>
            <p className="text-xl text-gray-400 text-shadow">Real-time Captioning And Translating Tool</p>
          </div>
          
          <div className="w-full max-w-xs bg-gray-900/70 backdrop-blur-sm p-6 rounded-xl shadow-inner border border-gray-800/30">
            <h2 className="text-xl font-semibold text-white mb-4">Choose Your Language</h2>
            <select
              className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white font-medium border border-gray-700 shadow-md transition-all hover:bg-gray-750 focus:ring-2 focus:ring-gray-600 focus:outline-none mb-4"
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
            
            <label className="flex items-center justify-between w-full p-3 rounded-lg bg-gray-800/50 text-white cursor-pointer hover:bg-gray-800/70 transition-colors">
              <span>Use GPT-4 Nano for translation</span>
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
                Start Listening
              </button>
              <div className="mt-4 text-gray-400">
                <Link 
                  to="/server-export" 
                  target="_blank"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span>Open OBS View</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col p-10 min-h-[80vh]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white text-shadow">Console</h2>
            <button 
              onClick={() => setIsStarted(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800/70 text-white hover:bg-gray-800 transition-colors"
            >
              Stop &amp; Reset
            </button>
          </div>
          
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
            <div className="p-6 bg-gray-900/60 backdrop-blur-sm rounded-xl shadow-inner border border-gray-800/30">
              <div className="text-sm uppercase text-gray-400 mb-2 font-semibold">Original ({LANGUAGES[sourceLanguage as keyof typeof LANGUAGES]})</div>
              <p className="text-2xl text-white text-shadow min-h-[3rem]">{transcript || "Listening..."}</p>
            </div>
            
            {Object.entries(translations).map(([lang, translation]) => (
              <div key={lang} className="p-6 bg-gray-900/40 backdrop-blur-sm rounded-xl shadow-inner border border-gray-800/30">
                <div className="text-sm uppercase text-gray-400 mb-2 font-semibold">{LANGUAGES[lang as keyof typeof LANGUAGES]}</div>
                <p className="text-2xl text-white text-shadow">{translation}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-8 flex justify-center">
            <Link 
              to="/server-export" 
              target="_blank"
              className="flex items-center gap-2 px-5 py-3 rounded-lg bg-gray-900/30 text-gray-400 hover:bg-gray-900/50 hover:text-white transition-all"
            >
              <span>Open OBS View</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
