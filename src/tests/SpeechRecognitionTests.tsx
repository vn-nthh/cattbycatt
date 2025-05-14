import React from 'react';
// NOTE: You'll need to install vitest and @testing-library/react with:
// npm install --save-dev vitest @testing-library/react @testing-library/react-hooks @testing-library/user-event
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { FeatureToggleProvider, useFeatureToggles } from '../lib/featureToggles';
import { SpeechRecognitionProvider, useSpeechRecognition } from '../components/SpeechRecognitionWrapper';

// Mock the Web Speech API
const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Mock Speech Recognition Event
function createMockSpeechRecognitionEvent(transcript: string, isFinal: boolean) {
  return {
    resultIndex: 0,
    results: {
      length: 1,
      item: () => ({
        isFinal,
        length: 1,
        item: () => ({
          transcript,
          confidence: 0.9,
        }),
        [0]: {
          transcript,
          confidence: 0.9,
        },
      }),
      [0]: {
        isFinal,
        length: 1,
        item: () => ({
          transcript,
          confidence: 0.9,
        }),
        [0]: {
          transcript,
          confidence: 0.9,
        },
      },
    },
  };
}

// Test component to use speech recognition
function TestComponent() {
  const { isListening, transcripts, startListening, stopListening } = useSpeechRecognition();
  const { featureToggles, toggleFeature } = useFeatureToggles();
  
  return (
    <div>
      <div data-testid="listening-state">{isListening ? 'listening' : 'not listening'}</div>
      <div data-testid="transcript">{transcripts?.interim || ''}</div>
      <div data-testid="final-transcript">{transcripts?.final || ''}</div>
      <div data-testid="feature-state">{featureToggles.useFakeIsFinal ? 'enabled' : 'disabled'}</div>
      <button data-testid="toggle-feature" onClick={() => toggleFeature('useFakeIsFinal')}>Toggle Feature</button>
      <button data-testid="start-listening" onClick={() => startListening('en')}>Start</button>
      <button data-testid="stop-listening" onClick={() => stopListening()}>Stop</button>
    </div>
  );
}

describe('Speech Recognition Tests (SR-01 to SR-04)', () => {
  beforeEach(() => {
    // Mock the Web Speech API
    global.SpeechRecognition = vi.fn(() => mockSpeechRecognition) as any;
    global.webkitSpeechRecognition = vi.fn(() => mockSpeechRecognition) as any;
    
    // Reset the mocks
    vi.clearAllMocks();
    
    // Mock timer functions
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  
  it('should only show final transcripts with native isFinal (SR-01)', async () => {
    const { getByTestId } = render(
      <FeatureToggleProvider>
        <SpeechRecognitionProvider>
          <TestComponent />
        </SpeechRecognitionProvider>
      </FeatureToggleProvider>
    );
    
    // Start listening
    await act(async () => {
      getByTestId('start-listening').click();
    });
    
    // Simulate speech recognition event with non-final transcript
    const onResult = mockSpeechRecognition.addEventListener.mock.calls.find(
      call => call[0] === 'result'
    )[1];
    
    await act(async () => {
      onResult(createMockSpeechRecognitionEvent('Hello', false));
    });
    
    // Interim transcript should be updated, but final should be empty
    expect(getByTestId('transcript')).toHaveTextContent('Hello');
    expect(getByTestId('final-transcript')).toHaveTextContent('');
    
    // Simulate speech recognition event with final transcript
    await act(async () => {
      onResult(createMockSpeechRecognitionEvent('Hello world', true));
    });
    
    // Final transcript should now be updated
    expect(getByTestId('final-transcript')).toHaveTextContent('Hello world');
  });
  
  it('should show fake final transcripts after 350ms pause when feature enabled (SR-02)', async () => {
    const { getByTestId } = render(
      <FeatureToggleProvider>
        <SpeechRecognitionProvider>
          <TestComponent />
        </SpeechRecognitionProvider>
      </FeatureToggleProvider>
    );
    
    // Enable fake isFinal feature
    await act(async () => {
      getByTestId('toggle-feature').click();
    });
    
    // Start listening
    await act(async () => {
      getByTestId('start-listening').click();
    });
    
    // Simulate speech recognition event with non-final transcript
    const onResult = mockSpeechRecognition.addEventListener.mock.calls.find(
      call => call[0] === 'result'
    )[1];
    
    await act(async () => {
      onResult(createMockSpeechRecognitionEvent('Hello', false));
    });
    
    // Interim transcript should be updated, but final should be empty
    expect(getByTestId('transcript')).toHaveTextContent('Hello');
    expect(getByTestId('final-transcript')).toHaveTextContent('');
    
    // Advance time by 350ms
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    
    // Final transcript should now be updated due to fake isFinal
    expect(getByTestId('final-transcript')).toHaveTextContent('Hello');
  });
  
  it('should behave similarly for continuous speech in both modes (SR-03)', async () => {
    const { getByTestId } = render(
      <FeatureToggleProvider>
        <SpeechRecognitionProvider>
          <TestComponent />
        </SpeechRecognitionProvider>
      </FeatureToggleProvider>
    );
    
    // Start listening (feature disabled by default)
    await act(async () => {
      getByTestId('start-listening').click();
    });
    
    // Simulate continuous speech recognition events without pauses
    const onResult = mockSpeechRecognition.addEventListener.mock.calls.find(
      call => call[0] === 'result'
    )[1];
    
    // Simulate continuous updates with no final flag
    await act(async () => {
      onResult(createMockSpeechRecognitionEvent('Hello', false));
      vi.advanceTimersByTime(100);
      onResult(createMockSpeechRecognitionEvent('Hello how', false));
      vi.advanceTimersByTime(100);
      onResult(createMockSpeechRecognitionEvent('Hello how are', false));
      vi.advanceTimersByTime(100);
      onResult(createMockSpeechRecognitionEvent('Hello how are you', false));
    });
    
    // Interim transcript should be updated, but final should be empty
    expect(getByTestId('transcript')).toHaveTextContent('Hello how are you');
    expect(getByTestId('final-transcript')).toHaveTextContent('');
    
    // Now enable the feature
    await act(async () => {
      getByTestId('toggle-feature').click();
    });
    
    // Reset transcripts
    await act(async () => {
      getByTestId('stop-listening').click();
      getByTestId('start-listening').click();
    });
    
    // Simulate continuous speech again
    await act(async () => {
      onResult(createMockSpeechRecognitionEvent('Hello', false));
      vi.advanceTimersByTime(100);
      onResult(createMockSpeechRecognitionEvent('Hello how', false));
      vi.advanceTimersByTime(100);
      onResult(createMockSpeechRecognitionEvent('Hello how are', false));
      vi.advanceTimersByTime(100);
      onResult(createMockSpeechRecognitionEvent('Hello how are you', false));
    });
    
    // Behavior should be the same when there are no pauses longer than 350ms
    expect(getByTestId('transcript')).toHaveTextContent('Hello how are you');
    expect(getByTestId('final-transcript')).toHaveTextContent('');
  });
  
  it('should only trigger fake isFinal for pauses 350ms or longer (SR-04)', async () => {
    const { getByTestId } = render(
      <FeatureToggleProvider>
        <SpeechRecognitionProvider>
          <TestComponent />
        </SpeechRecognitionProvider>
      </FeatureToggleProvider>
    );
    
    // Enable fake isFinal feature
    await act(async () => {
      getByTestId('toggle-feature').click();
    });
    
    // Start listening
    await act(async () => {
      getByTestId('start-listening').click();
    });
    
    // Simulate speech recognition event with non-final transcript
    const onResult = mockSpeechRecognition.addEventListener.mock.calls.find(
      call => call[0] === 'result'
    )[1];
    
    // Test with 200ms pause (should not trigger)
    await act(async () => {
      onResult(createMockSpeechRecognitionEvent('Hello', false));
      vi.advanceTimersByTime(200);
    });
    
    // Final transcript should still be empty
    expect(getByTestId('final-transcript')).toHaveTextContent('');
    
    // Test with 350ms pause (should trigger)
    await act(async () => {
      vi.advanceTimersByTime(150); // Total 350ms now
    });
    
    // Final transcript should now be updated
    expect(getByTestId('final-transcript')).toHaveTextContent('Hello');
    
    // Test with 500ms pause
    await act(async () => {
      onResult(createMockSpeechRecognitionEvent('Hello world', false));
      vi.advanceTimersByTime(500);
    });
    
    // Final transcript should be updated again
    expect(getByTestId('final-transcript')).toHaveTextContent('Hello world');
  });
}); 