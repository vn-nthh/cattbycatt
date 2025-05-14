# Integration Examples for Fake isFinal Feature

## App Component Integration

To integrate the fake isFinal feature into the existing application, you need to wrap your app with the providers and use the new speech recognition context. Here's an example of how to modify the existing App component structure:

```tsx
// In App.tsx or a high-level component
import { FeatureToggleProvider } from './lib/featureToggles';
import { SpeechRecognitionProvider } from './components/SpeechRecognitionWrapper';
import { SettingsPanel } from './components/SettingsPanel';

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
```

## Content Component Integration

Modify the Content component to use the new speech recognition context:

```tsx
// In Content.tsx or where speech recognition is used
import { useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { useSpeechRecognition } from './components/SpeechRecognitionWrapper';
import { getSessionId } from "./lib/session";

function Content() {
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [useGpt, setUseGpt] = useState(false);
  const translateText = useAction(api.translate.translateText);
  const sessionIdRef = useRef<string>(getSessionId());

  // Local state for transcript and translations
  const [transcript, setTranscript] = useState<string>("");
  const [translations, setTranslations] = useState<Record<string, string>>({});

  // Update to use the Convex mutation to store transcriptions
  const storeTranscription = useMutation(api.transcription.storeTranscription);
  
  // Get speech recognition context
  const { isListening, startListening, stopListening, setTranscriptHandler } = useSpeechRecognition();

  // Set up the transcript handler
  useEffect(() => {
    const handleTranscript = async (newTranscript: string, isFinal: boolean) => {
      setTranscript(newTranscript);
      
      if (isFinal && newTranscript.trim()) {
        // Send for translation immediately
        const targetLanguages = Object.keys(LANGUAGES).filter(lang => lang !== sourceLanguage);
        
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

  // Start/stop listening functions that update UI state
  const onStartListening = () => {
    setIsStarted(true);
  };

  const onStopListening = () => {
    setIsStarted(false);
  };

  // Rest of component remains the same...
}
```

## Implementation Notes

1. The integration preserves all existing functionality while adding the toggleable feature
2. No existing code is modified, only new components and wrappers are added
3. The feature is off by default, so there's no impact on existing functionality

## Rollback Procedure

If you need to roll back this feature, you can simply:

1. Remove the `FeatureToggleProvider` and `SpeechRecognitionProvider` wrappers
2. Remove the `SettingsPanel` component
3. Revert to directly using the Web Speech API as in the original implementation

All new files can be safely removed without affecting existing functionality. 