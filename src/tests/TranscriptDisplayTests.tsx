import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TranscriptDisplay } from '../components/TranscriptDisplay';

describe('TranscriptDisplay Tests', () => {
  it('should show a green indicator for final transcripts', () => {
    render(
      <TranscriptDisplay
        transcript="Hello, this is a final transcript"
        isFinal={true}
        language="en"
        languageName="English"
      />
    );
    
    // Check that the status indicator is green (final)
    const statusIndicator = screen.getByTestId('status-indicator-en');
    expect(statusIndicator.className).toContain('bg-green-400');
    expect(statusIndicator.className).not.toContain('animate-pulse');
    
    // Check that the status text says "Final"
    const statusText = screen.getByText('Final');
    expect(statusText).toBeInTheDocument();
  });
  
  it('should show an animated amber indicator for interim transcripts', () => {
    render(
      <TranscriptDisplay
        transcript="Hello, this is an interim transcript"
        isFinal={false}
        language="en"
        languageName="English"
      />
    );
    
    // Check that the status indicator is amber and animated (interim)
    const statusIndicator = screen.getByTestId('status-indicator-en');
    expect(statusIndicator.className).toContain('bg-amber-400');
    expect(statusIndicator.className).toContain('animate-pulse');
    
    // Check that the status text says "Processing..."
    const statusText = screen.getByText('Processing...');
    expect(statusText).toBeInTheDocument();
  });
  
  it('should display the transcript text correctly', () => {
    const testTranscript = "Hello, this is a test transcript";
    render(
      <TranscriptDisplay
        transcript={testTranscript}
        isFinal={true}
        language="en"
        languageName="English"
      />
    );
    
    // Check that the transcript text is displayed
    const transcriptElement = screen.getByText(testTranscript);
    expect(transcriptElement).toBeInTheDocument();
  });
  
  it('should display "Waiting for speech..." when transcript is empty and isOriginal is true', () => {
    render(
      <TranscriptDisplay
        transcript=""
        isFinal={true}
        language="en"
        languageName="English"
        isOriginal={true}
      />
    );
    
    // Check that "Waiting for speech..." is displayed
    const waitingText = screen.getByText("Waiting for speech...");
    expect(waitingText).toBeInTheDocument();
  });
  
  it('should not display "Waiting for speech..." when transcript is empty and isOriginal is false', () => {
    render(
      <TranscriptDisplay
        transcript=""
        isFinal={true}
        language="ja"
        languageName="Japanese"
        isOriginal={false}
      />
    );
    
    // Check that "Waiting for speech..." is not displayed
    const waitingText = screen.queryByText("Waiting for speech...");
    expect(waitingText).not.toBeInTheDocument();
  });
}); 