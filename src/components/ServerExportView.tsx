import React, { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSearchParams } from "react-router-dom";
import { getSessionId } from "../lib/session";

const ServerExportView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isOBSMode = navigator.userAgent.includes('OBS') || searchParams.has('obs');
  
  // Get session ID from search params or fallback to local storage
  const sessionId = getSessionId(searchParams);
  
  // Local state for handling data
  const [updateTrigger, setUpdateTrigger] = useState(0);
  
  // Get transcript data from Convex
  const transcriptionData = useQuery(api.transcription.getTranscription, { 
    sessionId: sessionId 
  });
  
  // Set up a refresh interval to force re-render
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, isOBSMode ? 300 : 1000);
    
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

  // Display loading state
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
  const filteredTranslations = Object.entries(transcriptionData.translations || {})
    .filter(([lang]) => lang !== transcriptionData.sourceLanguage)
    .reduce<Record<string, string>>((acc, [lang, translation]) => ({
      ...acc,
      [lang]: translation as string
    }), {});

  // Display the transcription data with consistent spacing
  return (
    <div className="min-h-screen flex flex-col bg-transparent export-view no-scrollbar">
      <div className="flex flex-col p-4 text-center" style={{ gap: '2.5rem' }}>
        {/* Transcript */}
        {transcriptionData.transcript ? (
          <p className={textClass}>{transcriptionData.transcript}</p>
        ) : (
          <p className={textClass}>Waiting for transcription...</p>
        )}
        
        {/* Translations container */}
        <div className="translations-container">
          {Object.entries(filteredTranslations).map(([lang, translation], index) => (
            <p 
              key={lang} 
              className={`${textClass} translation-item`} 
              style={{ marginBottom: index < Object.keys(filteredTranslations).length - 1 ? '2.5rem' : 0 }}
            >
              {translation}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServerExportView; 