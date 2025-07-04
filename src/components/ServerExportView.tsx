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
  const [windowHeight, setWindowHeight] = useState(0);
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
      const textHeight = textElement.scrollHeight;
      
      // Get computed styles to calculate proper height including descenders
      const computedStyle = window.getComputedStyle(textElement);
      const fontSize = parseFloat(computedStyle.fontSize);
      const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.4;
      
      // Update container height to fit text with extra padding for descenders
      // Use the larger of measured height or calculated line height, plus extra padding
      const calculatedHeight = Math.max(lineHeight, textHeight);
      const dynamicHeight = Math.max(calculatedHeight + 24, 60); // Extra 24px for descenders and padding
      setWindowHeight(dynamicHeight);
      
      // Text should stay centered until it touches the bounding box
      // Only then should it start sliding to keep newest content visible
      
      if (textWidth <= containerWidth) {
        // Text fits entirely - keep it centered
        setTextOffset((containerWidth - textWidth) / 2);
      } else {
        // Text is longer than container - slide to show the rightmost (newest) part
        // Position so the right edge of text aligns with right edge of container
        setTextOffset(containerWidth - textWidth);
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
      return <p className={`${textShadowClass} transcript-line transcript-empty`}>Waiting for transcription...</p>;
    }
    
    const transcriptClasses = `${textShadowClass} transcript-line transcript-${transcriptionData.sourceLanguage || 'unknown'}`;
    
    if (isPunctuationEnabled) {
      return (
        <div 
          ref={containerRef}
          className="sliding-window-container punctuation-enabled"
          style={{
            width: `${windowWidth}px`,
            height: `${windowHeight}px`,
            overflowX: 'hidden',
            overflowY: 'visible',
            position: 'relative',
            minHeight: '60px', // Ensure minimum height even before measurement
          }}
        >
          <p 
            ref={textRef}
            className={`${transcriptClasses} sliding-text`}
            style={{
              transition: isInitialRender ? 'none' : 'transform 0.3s ease-out',
              whiteSpace: 'nowrap',
              position: 'absolute',
              top: '50%',
              left: 0,
              transform: `translateX(${textOffset}px) translateY(-50%)`, // Center vertically and apply horizontal offset
              lineHeight: '1.4',
            }}
          >
            {transcriptionData.transcript}
          </p>
        </div>
      );
    } else {
      // Normal mode: simple centered text, no sliding, no mask
      return <p className={transcriptClasses} style={{textAlign: 'center', width: '100%'}}>{transcriptionData.transcript}</p>;
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
          {Object.entries(filteredTranslations).map(([lang, translation], index) => (
            <p 
              key={lang} 
              className={`${textShadowClass} translation-line translation-${lang} translation-line-${index + 1}`}
              data-language={lang}
              data-line-index={index + 1}
            >
              {translation}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServerExportView; 