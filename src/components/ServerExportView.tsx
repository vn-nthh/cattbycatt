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
  
  // Check if punctuation mode is enabled
  const isPunctuationEnabled = searchParams.has('punctuation');
  
  // Local state for handling data
  const [updateTrigger, setUpdateTrigger] = useState(0);
  
  // Track previous translation content for change detection
  const prevTranslationsRef = useRef<Record<string, string>>({});
  const [animationKey, setAnimationKey] = useState(0);
  
  // Sliding window state
  const [windowWidth, setWindowWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [textOffset, setTextOffset] = useState(0);
  const [isInitialRender, setIsInitialRender] = useState(true);
  
  // Get transcript data from Convex
  const transcriptionData = useQuery(api.transcription.getTranscription, { 
    sessionId: sessionId 
  });
  
  // Reset initial render state when transcript changes from empty to having content
  useEffect(() => {
    if (transcriptionData?.transcript && transcriptionData.transcript.trim()) {
      setIsInitialRender(true);
    }
  }, [transcriptionData?.transcript ? transcriptionData.transcript.split(' ').length : 0]);
  
  // Set up window resize handler for sliding window
  useEffect(() => {
    if (!isPunctuationEnabled) return;
    
    const updateWindowWidth = () => {
      const width = window.innerWidth * (2/3); // 2/3 of browser width
      setWindowWidth(width);
    };
    
    updateWindowWidth();
    window.addEventListener('resize', updateWindowWidth);
    return () => window.removeEventListener('resize', updateWindowWidth);
  }, [isPunctuationEnabled]);
  
  // Handle sliding window effect when transcript changes
  useEffect(() => {
    if (!isPunctuationEnabled || !transcriptionData?.transcript || !textRef.current || !containerRef.current) {
      return;
    }
    
    const textElement = textRef.current;
    const containerWidth = windowWidth;
    
    // Use a timeout to ensure the DOM has updated with new text content
    const measureAndPosition = () => {
      const textWidth = textElement.scrollWidth;
      
      // Always start text from the middle of the container
      // As text grows, it will naturally extend to the right first
      // When it exceeds container width, we slide it left to keep newest text visible
      const middleStart = containerWidth / 2;
      
      if (textWidth <= containerWidth) {
        // Text fits entirely - keep it starting from middle
        setTextOffset(middleStart - (textWidth / 2));
      } else {
        // Text is longer than container - slide left to show newest content
        // Keep the rightmost part visible, which means the newest text
        const overflow = textWidth - containerWidth;
        setTextOffset(middleStart - textWidth + (containerWidth / 2));
      }
      
      // After first positioning, enable transitions
      if (isInitialRender) {
        setTimeout(() => setIsInitialRender(false), 100);
      }
    };
    
    // Small delay to ensure text rendering is complete
    const timeoutId = setTimeout(measureAndPosition, 50);
    
    return () => clearTimeout(timeoutId);
  }, [transcriptionData?.transcript, isPunctuationEnabled, windowWidth, isInitialRender]);
  
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

  // Render transcript with sliding window if punctuation is enabled
  const renderTranscript = () => {
    if (!transcriptionData.transcript) {
      return <p className={textShadowClass}>Waiting for transcription...</p>;
    }
    
    if (isPunctuationEnabled) {
      return (
        <div 
          ref={containerRef}
          className="sliding-window-container punctuation-enabled"
          style={{
            width: `${windowWidth}px`,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <p 
            ref={textRef}
            className={`${textShadowClass} sliding-text`}
            style={{
              transform: `translateX(${textOffset}px)`,
              transition: isInitialRender ? 'none' : 'transform 0.3s ease-out',
              whiteSpace: 'nowrap',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            {transcriptionData.transcript}
          </p>
        </div>
      );
    } else {
      // Normal mode: simple centered text, no sliding, no mask
      return <p className={textShadowClass} style={{textAlign: 'center', width: '100%'}}>{transcriptionData.transcript}</p>;
    }
  };

  // Display the transcription data with animation only for translations
  return (
    <div className="export-view">
      {/* Transcript - with sliding window if punctuation enabled */}
      {renderTranscript()}
      
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