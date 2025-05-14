import { useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import ServerExportView from "./components/ServerExportView";
import ConvexDiagnostic from "./components/ConvexDiagnostic";
import { getSessionId } from "./lib/session";
import { FeatureToggleProvider } from "./lib/featureToggles";
import { SpeechRecognitionProvider } from "./components/SpeechRecognitionWrapper";
import { SettingsPanel } from "./components/SettingsPanel";
import { useSpeechRecognition } from "./components/SpeechRecognitionWrapper";
import { TranscriptDisplay } from "./components/TranscriptDisplay";

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
      {showDiagnostic && <ConvexDiagnostic />}
    </>
  );
}

function MainApp() {
  return (
    <FeatureToggleProvider>
      <SpeechRecognitionProvider>
        <div className="min-h-screen flex flex-col bg-transparent">
          <main className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-3xl mx-auto">
              <Content />
            </div>
          </main>
          <div className="absolute top-4 right-4">
            <SettingsPanel />
          </div>
          <Toaster />
        </div>
      </SpeechRecognitionProvider>
    </FeatureToggleProvider>
  );
}

function Content() {
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [useGpt, setUseGpt] = useState(false);
  const translateText = useAction(api.translate.translateText);
  const sessionIdRef = useRef<string>(getSessionId());

  // Local state for transcript and translations
  const [transcript, setTranscript] = useState<string>("");
  const [isTranscriptFinal, setIsTranscriptFinal] = useState<boolean>(true);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translationStatus, setTranslationStatus] = useState<Record<string, boolean>>({});
  
  // Add FakeIsFinalQueueIntegration component to connect fake isFinal events to the queue

  // Update to use the Convex mutation to store transcriptions
  const storeTranscription = useMutation(api.transcription.storeTranscription);
  
  // Get speech recognition context
  const { isListening, startListening, stopListening, setTranscriptHandler } = useSpeechRecognition();
  
  // Set up the transcript handler
  useEffect(() => {
    const handleTranscript = async (newTranscript: string, isFinal: boolean) => {
      setTranscript(newTranscript);
      setIsTranscriptFinal(isFinal);
      
      if (isFinal && newTranscript.trim()) {
        // Send for translation immediately
        const targetLanguages = Object.keys(LANGUAGES).filter(lang => lang !== sourceLanguage);
        
        // Set all translations to pending
        const pendingStatus = targetLanguages.reduce(
          (acc, lang) => ({ ...acc, [lang]: false }),
          {}
        );
        setTranslationStatus(pendingStatus);
        
        try {
          const translationsResult = await Promise.all(
            targetLanguages.map(targetLang =>
              translateText({
                text: newTranscript.trim(),
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
          
          // Set all translations to final
          const finalStatus = targetLanguages.reduce(
            (acc, lang) => ({ ...acc, [lang]: true }),
            {}
          );
          setTranslationStatus(finalStatus);
        } catch (error) {
          console.error("Translation error:", error);
        }
      }
    };
    
    setTranscriptHandler(handleTranscript);
  }, [sourceLanguage, useGpt, translateText, setTranscriptHandler]);
  
  // Store transcriptions in Convex when they change
  useEffect(() => {
    if (transcript) {
      storeTranscription({
        transcript,
        translations,
        sourceLanguage,
        sessionId: sessionIdRef.current
      }).catch(error => {
        console.error("Error storing transcription:", error);
      });
    }
  }, [transcript, translations, sourceLanguage, storeTranscription]);

  // Start/stop listening based on UI state
  useEffect(() => {
    if (isStarted && sourceLanguage && !isListening) {
      startListening(sourceLanguage);
    } else if (!isStarted && isListening) {
      stopListening();
    }
  }, [isStarted, sourceLanguage, isListening, startListening, stopListening]);

  // Start/stop listening
  const onStartListening = () => {
    setIsStarted(true);
  };

  const onStopListening = () => {
    setIsStarted(false);
  };

  // Update the OBS link generation to include the session ID
  const obsLinkWithSession = `/server-export?session=${sessionIdRef.current}${useGpt ? '&gpt=true' : ''}`;

  // OBS View Link component
  const ObsViewLink = () => (
    <a 
      href={obsLinkWithSession} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-gray-400 hover:text-gray-300 transition-colors mt-4 justify-center"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
      </svg>
      <span>Open OBS View</span>
    </a>
  );

  return (
    <div className="w-full rounded-lg overflow-hidden shadow-xl bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-lg p-6">
      {!sourceLanguage ? (
        <div className="flex flex-col items-center gap-8">
          <h1 className="text-3xl font-bold text-center text-white text-shadow">CATT by Catt</h1>
          <h2 className="text-xl text-center text-gray-300">Real-time Captioning And Translating Tool</h2>
          
          <div className="mt-6">
            <h3 className="text-xl font-medium text-center text-white mb-6">Choose Your Language</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => setSourceLanguage(code)}
                  className="px-4 py-3 rounded-lg text-white bg-gray-800/80 hover:bg-gray-700/90 transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center mt-4">
            <label className="inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={useGpt} 
                onChange={() => setUseGpt(!useGpt)} 
                className="sr-only peer" 
              />
              <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-300">Use GPT-4 Nano for translation</span>
            </label>
          </div>
          
          <ObsViewLink />
        </div>
      ) : !isStarted ? (
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-bold text-center text-white text-shadow mb-2">CATT by Catt</h1>
          <p className="text-gray-300 mb-8">Real-time Captioning And Translating Tool</p>
          
          <div className="flex flex-col gap-6 w-full items-center">
            <div className="flex items-center gap-4 text-white">
              <div className="flex flex-col">
                <span className="font-medium">Source Language:</span>
                <span className="text-sm">{LANGUAGES[sourceLanguage as keyof typeof LANGUAGES]}</span>
              </div>
              <button
                onClick={() => setSourceLanguage("")}
                className="px-3 py-1 rounded-md text-sm bg-gray-800/70 hover:bg-gray-700 transition-colors"
              >
                Change
              </button>
              
              <div className="flex items-center ml-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={useGpt} 
                    onChange={() => setUseGpt(!useGpt)} 
                    className="sr-only peer" 
                  />
                  <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-3 text-sm font-medium">Use GPT</span>
                </label>
              </div>
            </div>
            
            <div className="flex flex-col items-center mt-2">
              <button
                onClick={onStartListening}
                className="px-8 py-4 rounded-full text-lg font-bold bg-gray-800 text-white shadow-lg hover:bg-gray-700 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50"
              >
                Start Listening
              </button>
              <p className="text-sm text-gray-300 mt-2">Click to start speech recognition</p>
            </div>
          </div>
          
          <ObsViewLink />
        </div>
      ) : (
        <div className="flex flex-col h-[70vh] max-h-[700px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white text-shadow">Console</h2>
            <button 
              onClick={onStopListening}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800/70 text-white hover:bg-gray-800 transition-colors"
            >
              Stop & Reset
            </button>
          </div>
          
          <div className="flex-1 overflow-auto mb-4 space-y-4">
            {/* Source language transcript */}
            <TranscriptDisplay
              transcript={transcript}
              isFinal={isTranscriptFinal}
              language={sourceLanguage}
              languageName={LANGUAGES[sourceLanguage as keyof typeof LANGUAGES]}
              isOriginal={true}
            />
            
            {/* Translations */}
            {Object.entries(translations).map(([language, text]) => (
              <TranscriptDisplay
                key={language}
                transcript={text}
                isFinal={translationStatus[language] || false}
                language={language}
                languageName={LANGUAGES[language as keyof typeof LANGUAGES]}
                isOriginal={false}
              />
            ))}
          </div>
          
          <ObsViewLink />
        </div>
      )}
    </div>
  );
}

export default App;
