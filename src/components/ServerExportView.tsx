import React, { useEffect, useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLocation, useSearchParams } from "react-router-dom";
import { getSessionId } from "../lib/session";

const ServerExportView: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isOBSMode = navigator.userAgent.includes('OBS') || searchParams.has('obs');
  
  // Get session ID from search params or fallback to local storage
  const sessionId = getSessionId(searchParams);
  
  // Get transcript data from Convex with automatic polling
  const transcriptionData = useQuery(api.transcription.getTranscription, { 
    sessionId: sessionId
  });
  
  // Store previous translations to detect changes
  const prevTranslationsRef = useRef<Record<string, string>>({});
  const [translationsKey, setTranslationsKey] = useState(0);
  
  // Trigger animation only when translations change
  useEffect(() => {
    if (!transcriptionData?.translations) return;
    
    const currentTranslations = JSON.stringify(transcriptionData.translations);
    const prevTranslations = JSON.stringify(prevTranslationsRef.current);
    
    if (currentTranslations !== prevTranslations) {
      prevTranslationsRef.current = {...transcriptionData.translations};
      setTranslationsKey(prev => prev + 1);
    }
  }, [transcriptionData?.translations]);
  
  // Set the document title and ensure the body has transparent background
  useEffect(() => {
    document.title = isOBSMode ? "OBS Captions" : "Live Caption Export";
    
    // Force transparency on all elements
    document.documentElement.setAttribute('style', 'background: transparent !important');
    document.body.setAttribute('style', 'background: transparent !important');
    
    // Add classes for CSS rules
    document.documentElement.classList.add('route-export');
    document.body.classList.add('route-export');
    
    if (isOBSMode) {
      document.body.classList.add('obs-mode');
    }
    
    // Clean up on unmount
    return () => {
      document.title = "Live Caption";
      document.documentElement.removeAttribute('style');
      document.body.removeAttribute('style');
      document.documentElement.classList.remove('route-export');
      document.body.classList.remove('route-export');
      document.body.classList.remove('obs-mode');
    };
  }, [isOBSMode]);

  // Enhance text visibility with stronger text shadow for OBS
  const textClass = isOBSMode 
    ? "text-4xl text-white obs-text-shadow" 
    : "text-3xl text-white text-shadow";

  // If data is still loading, show a waiting message
  if (!transcriptionData) {
    return (
      <div className="min-h-screen flex flex-col bg-transparent export-view no-scrollbar">
        <div className="flex flex-col gap-8 p-4 text-center">
          <p className={textClass}>Waiting for transcription...</p>
        </div>
      </div>
    );
  }

  // Get filtered translations (excluding source language)
  const filteredTranslations: Record<string, string> = Object.entries(transcriptionData.translations)
    .filter(([lang]) => lang !== transcriptionData.sourceLanguage)
    .reduce((acc, [lang, translation]) => ({
      ...acc,
      [lang]: translation
    }), {});

  // Display the transcription data with consistent spacing
  return (
    <div className="min-h-screen flex flex-col bg-transparent export-view no-scrollbar">
      <div className="flex flex-col p-4 text-center" style={{ gap: '2.5rem' }}>
        {/* Transcript is not animated */}
        {transcriptionData.transcript ? (
          <p className={textClass}>{transcriptionData.transcript}</p>
        ) : (
          <p className={textClass}>Waiting for transcription...</p>
        )}
        
        {/* Translations container with animation */}
        <div key={translationsKey} className="translations-container animate-update">
          {Object.entries(filteredTranslations).map(([lang, translation], index) => (
            <p key={lang} className={`${textClass} translation-item`} style={{ marginBottom: index < Object.keys(filteredTranslations).length - 1 ? '2.5rem' : 0 }}>
              {translation}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServerExportView; 