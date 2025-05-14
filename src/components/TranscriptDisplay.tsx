import React, { useEffect, useState } from 'react';

interface TranscriptDisplayProps {
  transcript: string;
  isFinal: boolean;
  language: string;
  languageName: string;
  isOriginal?: boolean;
}

/**
 * Component for displaying transcripts with visual indicators for final/interim status
 */
export function TranscriptDisplay({ 
  transcript, 
  isFinal, 
  language, 
  languageName,
  isOriginal = false
}: TranscriptDisplayProps) {
  // Track animation state
  const [shouldAnimate, setShouldAnimate] = useState(false);
  
  // Trigger animation when transcript is finalized
  useEffect(() => {
    if (isFinal) {
      setShouldAnimate(true);
      const timer = setTimeout(() => setShouldAnimate(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isFinal, transcript]);

  return (
    <div className={`bg-white/10 backdrop-blur-sm p-4 rounded-lg transition-all duration-300 ${
      shouldAnimate ? 'shadow-lg shadow-indigo-500/20 border border-indigo-400/30' : ''
    }`}>
      <div className="flex justify-between items-center mb-1">
        <div className="text-sm font-medium text-gray-300">{languageName}</div>
        
        {/* Status indicator */}
        <div className="flex items-center">
          <div 
            className={`h-2 w-2 rounded-full mr-1 ${
              isFinal ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
            }`} 
            data-testid={`status-indicator-${language}`}
          />
          <span className="text-xs text-gray-400">
            {isFinal ? 'Final' : 'Processing...'}
          </span>
        </div>
      </div>
      
      <div className={`text-white ${isOriginal ? 'text-lg' : 'text-base'} whitespace-pre-wrap break-words`}>
        {transcript || (isOriginal ? "Waiting for speech..." : "")}
      </div>
    </div>
  );
} 