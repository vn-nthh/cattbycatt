import React, { useEffect, useState, useRef } from "react";
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
  
  // Track previous translation content for change detection
  const prevTranslationsRef = useRef<Record<string, string>>({});
  const [animationKey, setAnimationKey] = useState(0);
  
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
    
    // No need for inline styles as they're now in CSS
    if (isOBSMode) {
      document.body.classList.add('obs-mode');
    }
    
    // Clean up on unmount
    return () => {
      document.title = "Live Caption";
      document.body.classList.remove('obs-mode');
    };
  }, [isOBSMode]);

  // Apply text shadow class based on OBS mode
  const textShadowClass = isOBSMode ? 'obs-text-shadow' : 'text-shadow';

  // Display loading state
  if (!transcriptionData) {
    return (
      <div className="export-view">
        <p className={textShadowClass}>Waiting for transcription...</p>
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
    
  // Check if translations changed
  const translationsJson = JSON.stringify(filteredTranslations);
  const prevTranslationsJson = JSON.stringify(prevTranslationsRef.current);
  
  // Update animation key when translations change (not transcriptions)
  if (translationsJson !== prevTranslationsJson) {
    prevTranslationsRef.current = filteredTranslations;
    // Only use setTimeout in browser environment
    if (typeof window !== 'undefined') {
      // Small delay to ensure DOM updates first
      setTimeout(() => setAnimationKey(prev => prev + 1), 0);
    }
  }

  // Display the transcription data with animation only for translations
  return (
    <div className="export-view">
      {/* Transcript - no animation */}
      {transcriptionData.transcript ? (
        <p className={textShadowClass}>{transcriptionData.transcript}</p>
      ) : (
        <p className={textShadowClass}>Waiting for transcription...</p>
      )}
      
      {/* Translations - with animation */}
      {Object.entries(filteredTranslations).length > 0 && (
        <div className="animate-update" key={animationKey}>
          {Object.entries(filteredTranslations).map(([lang, translation]) => (
            <p key={lang} className={textShadowClass}>{translation}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServerExportView; 