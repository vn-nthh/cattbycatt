import { useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import ServerExportView from "./components/ServerExportView";
import { getSessionId } from "./lib/session";

// Define supported languages
const LANGUAGES = {
  en: "English",
  ja: "Japanese",
  ko: "Korean",
} as const;

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
      </Routes>
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
  
  // Punctuation restoration state
  const [usePunctuation, setUsePunctuation] = useState(false);
  const [lastProcessedText, setLastProcessedText] = useState("");
  const [leftoverText, setLeftoverText] = useState("");
  const [leftoverStartTime, setLeftoverStartTime] = useState<number | null>(null);
  const [isProcessingPunctuation, setIsProcessingPunctuation] = useState(false);
  
  const translateText = useAction(api.translate.translateText);
  const addPunctuation = useAction(api.punctuation.addPunctuation);
  const sessionIdRef = useRef<string>(getSessionId());
  
  // Add ref to track if we want to keep listening (for proper cleanup)
  const shouldKeepListeningRef = useRef(false);
  
  // Refs for punctuation processing
  const punctuationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTranscriptRef = useRef<string>("");

  // Local state for transcript and translations
  const [transcript, setTranscript] = useState<string>("");
  const [punctuatedTranscript, setPunctuatedTranscript] = useState<string>("");
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

  // Punctuation processing logic
  const processPunctuationChunk = async (currentText: string) => {
    const startTime = Date.now();
    console.log(`[PUNCTUATION] Processing started at ${new Date().toLocaleTimeString()}`);
    console.log(`[PUNCTUATION] Current processing state: ${isProcessingPunctuation}`);
    console.log(`[PUNCTUATION] Input text length: ${currentText.length}`);
    console.log(`[PUNCTUATION] Last processed text length: ${lastProcessedText.length}`);
    
    if (isProcessingPunctuation || !usePunctuation || !currentText.trim()) {
      console.log(`[PUNCTUATION] Skipping - Processing: ${isProcessingPunctuation}, UsePunctuation: ${usePunctuation}, HasText: ${!!currentText.trim()}`);
      return;
    }

    try {
      setIsProcessingPunctuation(true);
      
      // Extract delta (new text) by comparing with last processed text
      let deltaText = currentText;
      if (lastProcessedText && currentText.startsWith(lastProcessedText)) {
        deltaText = currentText.slice(lastProcessedText.length).trim();
        console.log(`[PUNCTUATION] Delta extracted (prefix match): "${deltaText}" (${deltaText.length} chars)`);
      } else if (lastProcessedText) {
        // Handle text drift - find common prefix and extract new portion
        let commonLength = 0;
        const minLength = Math.min(lastProcessedText.length, currentText.length);
        for (let i = 0; i < minLength; i++) {
          if (lastProcessedText[i] === currentText[i]) {
            commonLength = i + 1;
          } else {
            break;
          }
        }
        deltaText = currentText.slice(commonLength).trim();
        console.log(`[PUNCTUATION] Delta extracted (drift handling): "${deltaText}" (${deltaText.length} chars)`);
        console.log(`[PUNCTUATION] Common prefix length: ${commonLength}`);
      } else {
        console.log(`[PUNCTUATION] Processing full text (first time): "${deltaText}" (${deltaText.length} chars)`);
      }
      
      // Skip if no new text
      if (!deltaText) {
        console.log(`[PUNCTUATION] No new text to process`);
        return;
      }
      
      // Prepend leftover text from previous cycle
      const textToProcess = leftoverText ? `${leftoverText} ${deltaText}` : deltaText;
      console.log(`[PUNCTUATION] Text to process: "${textToProcess}" (${textToProcess.length} chars)`);
      console.log(`[PUNCTUATION] Leftover from previous cycle: "${leftoverText}"`);
      
      // Get punctuated text from GPT
      const gptStartTime = Date.now();
      const punctuatedChunk = await addPunctuation({ text: textToProcess });
      const gptEndTime = Date.now();
      console.log(`[PUNCTUATION] GPT response time: ${gptEndTime - gptStartTime}ms`);
      console.log(`[PUNCTUATION] GPT result: "${punctuatedChunk}"`);
      
      // Parse punctuated text for complete vs incomplete phrases
      const sentenceEndRegex = /[.!?]/;
      const sentences = punctuatedChunk.split(/(?<=[.!?])\s+/);
      
      let completeText = "";
      let newLeftover = "";
      
      if (sentences.length > 1) {
        // Multiple sentences - all but last are complete
        completeText = sentences.slice(0, -1).join(" ");
        newLeftover = sentences[sentences.length - 1];
        
        // Check if the last sentence actually ends with punctuation
        if (sentenceEndRegex.test(newLeftover.trim())) {
          completeText = punctuatedChunk;
          newLeftover = "";
        }
      } else {
        // Single sentence - check if it ends with punctuation
        if (sentenceEndRegex.test(punctuatedChunk.trim())) {
          completeText = punctuatedChunk;
          newLeftover = "";
        } else {
          newLeftover = punctuatedChunk;
        }
      }
      
      // Force processing if leftover text has been accumulating too long
      const now = Date.now();
      const leftoverAge = leftoverStartTime ? now - leftoverStartTime : 0;
      const LEFTOVER_TIMEOUT = 6000; // 6 seconds (3 cycles)
      
      if (newLeftover && leftoverAge > LEFTOVER_TIMEOUT) {
        console.log(`[PUNCTUATION] Forcing leftover processing after ${leftoverAge}ms`);
        completeText = completeText ? `${completeText} ${newLeftover}` : newLeftover;
        newLeftover = "";
      }
      
      console.log(`[PUNCTUATION] Complete text: "${completeText}"`);
      console.log(`[PUNCTUATION] New leftover: "${newLeftover}"`);
      
      // Update punctuated transcript
      if (completeText) {
        // Translate complete phrases immediately and replace current translations
        if (completeText.trim()) {
          const targetLanguages = Object.keys(LANGUAGES).filter(lang => lang !== sourceLanguage);
          
          const translationStartTime = Date.now();
          Promise.all(
            targetLanguages.map(targetLang =>
              translateText({
                text: completeText.trim(),
                sourceLanguage,
                targetLanguage: targetLang,
                useGpt,
              }).then(translation => ({ lang: targetLang, translation }))
            )
          ).then(translationsResult => {
            const translationEndTime = Date.now();
            console.log(`[PUNCTUATION] Translation time: ${translationEndTime - translationStartTime}ms`);
            
            const newTranslations = translationsResult.reduce(
              (acc, { lang, translation }) => ({
                ...acc,
                [lang]: translation, // Replace with new translation, don't accumulate
              }),
              {}
            );
            setTranslations(newTranslations); // Replace translations completely
          }).catch(error => {
            console.error("Translation error:", error);
          });
        }
        
        // Store the punctuated version for database but don't accumulate
        setPunctuatedTranscript(completeText);
      }
      
      // Update state
      setLeftoverText(newLeftover);
      
      // Manage leftover timing
      if (newLeftover && !leftoverText) {
        // Starting new leftover text
        setLeftoverStartTime(Date.now());
        console.log(`[PUNCTUATION] Starting leftover timer for: "${newLeftover}"`);
      } else if (!newLeftover) {
        // Leftover text was processed
        setLeftoverStartTime(null);
        console.log(`[PUNCTUATION] Leftover timer reset`);
      }
      
      setLastProcessedText(currentText);
      
      const endTime = Date.now();
      console.log(`[PUNCTUATION] Total processing time: ${endTime - startTime}ms`);
      console.log(`[PUNCTUATION] Processing completed at ${new Date().toLocaleTimeString()}`);
      
    } catch (error) {
      console.error('[PUNCTUATION] Processing error:', error);
    } finally {
      setIsProcessingPunctuation(false);
    }
  };

  // Set up punctuation processing interval
  useEffect(() => {
    if (usePunctuation && isStarted && sourceLanguage) {
      console.log('[PUNCTUATION] Starting 2-second interval');
      punctuationIntervalRef.current = setInterval(() => {
        const currentText = currentTranscriptRef.current;
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[INTERVAL] Triggered at ${timestamp}`);
        console.log(`[INTERVAL] Current text: "${currentText}" (${currentText.length} chars)`);
        console.log(`[INTERVAL] Last processed: "${lastProcessedText}" (${lastProcessedText.length} chars)`);
        console.log(`[INTERVAL] Text changed: ${currentText !== lastProcessedText}`);
        
        if (currentText && currentText !== lastProcessedText) {
          console.log(`[INTERVAL] Calling processPunctuationChunk`);
          processPunctuationChunk(currentText);
        } else {
          console.log(`[INTERVAL] Skipping - no new text`);
        }
      }, 2000); // Process every 2 seconds
      
      return () => {
        console.log('[PUNCTUATION] Cleaning up interval');
        if (punctuationIntervalRef.current) {
          clearInterval(punctuationIntervalRef.current);
        }
      };
    }
  }, [usePunctuation, isStarted, sourceLanguage, lastProcessedText]);

  // Clean up punctuation state when toggle is disabled
  useEffect(() => {
    if (!usePunctuation) {
      setLastProcessedText("");
      setLeftoverText("");
      setLeftoverStartTime(null);
      setPunctuatedTranscript("");
      setTranslations({}); // Clear translations when disabling punctuation
      if (punctuationIntervalRef.current) {
        clearInterval(punctuationIntervalRef.current);
      }
    }
  }, [usePunctuation]);

  // Initialize Web Speech API and handle transcription
  useEffect(() => {
    if (!sourceLanguage || !isStarted) {
      shouldKeepListeningRef.current = false;
      return;
    }

    shouldKeepListeningRef.current = true;

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
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          
          // Update transcript with only the latest final result
          setTranscript(finalTranscript);
          currentTranscriptRef.current = finalTranscript;
          
          // If punctuation is disabled, translate immediately and replace existing translations
          if (!usePunctuation && finalTranscript.trim()) {
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
  }, [sourceLanguage, isStarted, useGpt, translateText]);

  // Start/stop listening
  const startListening = () => {
    setIsStarted(true);
  };

  const stopListening = () => {
    shouldKeepListeningRef.current = false;
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    }
    
    // Clean up punctuation processing
    if (punctuationIntervalRef.current) {
      clearInterval(punctuationIntervalRef.current);
    }
    
    setIsStarted(false);
    setTranscript("");
    setPunctuatedTranscript("");
    setTranslations({});
    setLastProcessedText("");
    setLeftoverText("");
    setLeftoverStartTime(null);
    currentTranscriptRef.current = "";
  };

  // Update the OBS link generation to include the session ID and punctuation setting
  const obsLinkWithSession = `/server-export?session=${sessionIdRef.current}${useGpt ? '&gpt=true' : ''}${usePunctuation ? '&punctuation=true' : ''}`;

  // Always display raw transcript for real-time viewing, punctuation works behind the scenes
  const displayTranscript = transcript;

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
            
            <label className="flex items-center justify-between w-full p-3 rounded-lg bg-gray-800/50 text-white cursor-pointer hover:bg-gray-800/70 transition-colors mb-4">
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

            <label className="flex items-center justify-between w-full p-3 rounded-lg bg-gray-800/50 text-white cursor-pointer hover:bg-gray-800/70 transition-colors mb-4">
              <span>Real-time punctuation restoration</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={usePunctuation}
                  onChange={(e) => setUsePunctuation(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full ${usePunctuation ? 'bg-gray-600' : 'bg-gray-700'} transition-colors`}></div>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transform transition-transform ${usePunctuation ? 'translate-x-6' : ''}`}></div>
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
                  to={obsLinkWithSession}
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
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white text-shadow">Console</h2>
              {usePunctuation && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className={`w-2 h-2 rounded-full ${isProcessingPunctuation ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span>{isProcessingPunctuation ? 'Processing...' : 'Punctuation Active'}</span>
                </div>
              )}
            </div>
            <button 
              onClick={stopListening}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800/70 text-white hover:bg-gray-800 transition-colors"
            >
              Stop &amp; Reset
            </button>
          </div>
          
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
            <div className="p-6 bg-gray-900/60 backdrop-blur-sm rounded-xl shadow-inner border border-gray-800/30">
              <div className="text-sm uppercase text-gray-400 mb-2 font-semibold">
                Original ({LANGUAGES[sourceLanguage as keyof typeof LANGUAGES]})
              </div>
              <p className="text-2xl text-white text-shadow min-h-[3rem]">
                {displayTranscript || "Listening..."}
              </p>
              {usePunctuation && leftoverText && (
                <div className="mt-2 text-sm text-gray-500">
                  Incomplete: {leftoverText}
                </div>
              )}
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
              to={obsLinkWithSession}
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
