import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';
import { useFeatureToggles } from '../lib/featureToggles';
import { FakeIsFinalDetector } from '../lib/fakeIsFinalDetection';

// Types for Speech Recognition (from App.tsx)
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

// Context for enhanced speech recognition results
type EnhancedTranscriptHandler = (transcript: string, isFinal: boolean) => void;

interface SpeechRecognitionContextType {
  isListening: boolean;
  startListening: (lang: string) => void;
  stopListening: () => void;
  setTranscriptHandler: (handler: EnhancedTranscriptHandler) => void;
  transcripts?: {
    interim: string;
    final: string;
  };
}

const SpeechRecognitionContext = createContext<SpeechRecognitionContextType>({
  isListening: false,
  startListening: () => {},
  stopListening: () => {},
  setTranscriptHandler: () => {},
});

export function SpeechRecognitionProvider({ children }: { children: ReactNode }) {
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('');
  const [transcripts, setTranscripts] = useState<{ interim: string; final: string }>({
    interim: '',
    final: ''
  });
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { featureToggles } = useFeatureToggles();
  
  // Reference to the fake isFinal detector
  const fakeIsFinalDetectorRef = useRef<FakeIsFinalDetector | null>(null);
  
  // Reference to the transcript handler
  const transcriptHandlerRef = useRef<EnhancedTranscriptHandler | null>(null);

  // Initialize fake isFinal detector
  useEffect(() => {
    fakeIsFinalDetectorRef.current = new FakeIsFinalDetector({
      silenceThreshold: featureToggles.fakeIsFinalThreshold,
      onSegmentFinalized: (transcript) => {
        if (transcriptHandlerRef.current && transcript.trim() !== '') {
          transcriptHandlerRef.current(transcript, true);
        }
        setTranscripts(prev => ({
          interim: '',
          final: transcript
        }));
      }
    });

    return () => {
      fakeIsFinalDetectorRef.current?.reset();
    };
  }, []);
  
  // Update the detector when threshold changes
  useEffect(() => {
    if (fakeIsFinalDetectorRef.current) {
      fakeIsFinalDetectorRef.current.updateOptions({
        silenceThreshold: featureToggles.fakeIsFinalThreshold
      });
    }
  }, [featureToggles.fakeIsFinalThreshold]);

  // Set up speech recognition
  useEffect(() => {
    if (!language || !isListening) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.error("Speech Recognition API not supported in this browser");
      return;
    }

    const recognitionInstance = new SpeechRecognitionAPI();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = language;

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        const nativeIsFinal = event.results[i].isFinal;
        
        if (nativeIsFinal) {
          finalTranscript += transcript;
          
          // Always process native final results
          if (transcriptHandlerRef.current && finalTranscript.trim() !== '') {
            transcriptHandlerRef.current(finalTranscript, true);
          }
          
          setTranscripts(prev => ({
            interim: '',
            final: finalTranscript
          }));
        } else {
          interimTranscript += transcript;
          
          // Use fake isFinal detection if feature is enabled
          if (featureToggles.useFakeIsFinal && fakeIsFinalDetectorRef.current) {
            // Process with fake isFinal detector
            fakeIsFinalDetectorRef.current.processTranscript(interimTranscript, false);
            
            // Display interim results
            if (transcriptHandlerRef.current) {
              transcriptHandlerRef.current(interimTranscript, false);
            }
            
            setTranscripts(prev => ({
              ...prev,
              interim: interimTranscript
            }));
          } else {
            // Standard behavior - just pass through interim results
            if (transcriptHandlerRef.current) {
              transcriptHandlerRef.current(interimTranscript, false);
            }
            
            setTranscripts(prev => ({
              ...prev,
              interim: interimTranscript
            }));
          }
        }
      }
    };

    // Handle recognition errors and restarts
    recognitionInstance.onerror = () => {
      if (isListening) {
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
      if (isListening) {
        setTimeout(() => {
          try {
            recognitionInstance.start();
          } catch (error) {
            console.error("Error restarting recognition:", error);
          }
        }, 1000);
      }
    };

    recognitionRef.current = recognitionInstance;
    
    // Start recognition
    try {
      recognitionInstance.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
    }
    
    // Cleanup on unmount or when dependencies change
    return () => {
      try {
        recognitionInstance.stop();
        fakeIsFinalDetectorRef.current?.reset();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    };
  }, [language, isListening, featureToggles.useFakeIsFinal, featureToggles.fakeIsFinalThreshold]);

  // Start listening function
  const startListening = (lang: string) => {
    setLanguage(lang);
    setIsListening(true);
  };

  // Stop listening function
  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }
    fakeIsFinalDetectorRef.current?.reset();
  };

  // Set transcript handler function
  const setTranscriptHandler = (handler: EnhancedTranscriptHandler) => {
    transcriptHandlerRef.current = handler;
  };

  return (
    <SpeechRecognitionContext.Provider 
      value={{ isListening, startListening, stopListening, setTranscriptHandler, transcripts }}
    >
      {children}
    </SpeechRecognitionContext.Provider>
  );
}

// Custom hook to use the speech recognition context
export function useSpeechRecognition() {
  const context = useContext(SpeechRecognitionContext);
  if (context === undefined) {
    throw new Error('useSpeechRecognition must be used within a SpeechRecognitionProvider');
  }
  return context;
} 