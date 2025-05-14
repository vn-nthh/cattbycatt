/**
 * Utility functions for implementing the fake isFinal detection feature
 * This detects pauses in speech and marks segments as final after a defined silence period
 */

// Default silence threshold in milliseconds (fallback value)
const DEFAULT_SILENCE_THRESHOLD = 350;

export interface FakeIsFinalDetectorOptions {
  silenceThreshold?: number;
  onSegmentFinalized?: (transcript: string) => void;
}

export class FakeIsFinalDetector {
  private timer: NodeJS.Timeout | null = null;
  private lastTranscript: string = '';
  private silenceThreshold: number;
  private onSegmentFinalized: ((transcript: string) => void) | undefined;

  constructor(options: FakeIsFinalDetectorOptions = {}) {
    this.silenceThreshold = options.silenceThreshold || DEFAULT_SILENCE_THRESHOLD;
    this.onSegmentFinalized = options.onSegmentFinalized;
  }

  /**
   * Process new speech recognition results
   * @param transcript The current interim transcript
   * @param nativeIsFinal Whether the native SpeechRecognition API marked this as final
   * @returns An object with the transcript and a boolean indicating if it's considered final
   */
  processTranscript(transcript: string, nativeIsFinal: boolean): { transcript: string; isFinal: boolean } {
    // Clear any existing timers
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // If the native API already marked it as final, respect that
    if (nativeIsFinal) {
      this.lastTranscript = '';
      return { transcript, isFinal: true };
    }

    // If the transcript hasn't changed, it might be a pause
    if (transcript === this.lastTranscript && transcript.trim() !== '') {
      // Start timer to mark as final after silence threshold
      this.timer = setTimeout(() => {
        if (this.onSegmentFinalized) {
          this.onSegmentFinalized(transcript);
        }
        this.lastTranscript = '';
      }, this.silenceThreshold);
      
      return { transcript, isFinal: false };
    }

    // Update the last transcript and restart the silence detection
    this.lastTranscript = transcript;
    
    // Start timer to mark as final after silence threshold
    this.timer = setTimeout(() => {
      if (this.onSegmentFinalized) {
        this.onSegmentFinalized(transcript);
      }
      this.lastTranscript = '';
    }, this.silenceThreshold);

    return { transcript, isFinal: false };
  }

  /**
   * Reset the detector state
   */
  reset() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.lastTranscript = '';
  }

  /**
   * Update detector configuration
   */
  updateOptions(options: FakeIsFinalDetectorOptions) {
    if (options.silenceThreshold !== undefined) {
      this.silenceThreshold = options.silenceThreshold;
    }
    if (options.onSegmentFinalized !== undefined) {
      this.onSegmentFinalized = options.onSegmentFinalized;
    }
  }
} 