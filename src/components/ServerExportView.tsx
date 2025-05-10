import React, { useEffect, useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLocation } from "react-router-dom";
import { getSessionId } from "../lib/session";

// Code for debugging
const ServerExportView: React.FC = () => {
  const location = useLocation();
  const isOBSMode = navigator.userAgent.includes('OBS') || location.search.includes('obs=true');
  const sessionIdRef = useRef<string>(getSessionId());
  
  // Get transcript data from Convex with automatic polling
  try {
    const transcriptionData = useQuery(api.transcription.getTranscription, { 
      sessionId: sessionIdRef.current 
    });
    console.log("Transcription data:", transcriptionData);
    
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
    
    // Set up a refresh interval based on OBS mode (as a backup to ensure updates)
    useEffect(() => {
      // This interval is just a safety measure; useQuery handles refreshes automatically
      const interval = setInterval(() => {
        // Force a re-render periodically
        console.log("Refresh interval tick");
      }, isOBSMode ? 300 : 1000); // 300ms for OBS, 1000ms for regular view
      
      return () => clearInterval(interval);
    }, [isOBSMode]);
    
    // Set the document title and ensure the body has transparent background
    useEffect(() => {
      document.title = isOBSMode ? "OBS Captions" : "Live Caption Export";
      
      // Apply transparent background styles
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflow = 'hidden';

      if (isOBSMode) {
        document.body.classList.add('obs-mode');
      }
      
      // Clean up on unmount
      return () => {
        document.title = "Live Caption";
        document.body.style.backgroundColor = ''; 
        document.documentElement.style.backgroundColor = '';
        document.body.style.margin = '';
        document.body.style.padding = '';
        document.body.style.overflow = '';
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
  } catch (error) {
    console.error("Error in ServerExportView:", error);
    return (
      <div className="min-h-screen flex flex-col bg-transparent export-view no-scrollbar">
        <div className="flex flex-col gap-8 p-4 text-center">
          <p className="text-3xl text-white text-shadow">Error loading transcription data.</p>
          <p className="text-xl text-white text-shadow">Please check console for details.</p>
        </div>
      </div>
    );
  }
};

export default ServerExportView; 