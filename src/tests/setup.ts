import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll } from 'vitest';

// Define types needed for Web Speech API mock
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechGrammarList {
  length: number;
  item(index: number): any;
  addFromURI(src: string, weight?: number): void;
  addFromString(string: string, weight?: number): void;
}

interface SpeechRecognitionError extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  // Event handlers
  onstart: ((ev: Event) => any) | null;
  onresult: ((ev: SpeechRecognitionEvent) => any) | null;
  onend: ((ev: Event) => any) | null;
  onerror: ((ev: SpeechRecognitionError) => any) | null;
  onaudiostart: ((ev: Event) => any) | null;
  onaudioend: ((ev: Event) => any) | null;
  onnomatch: ((ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((ev: Event) => any) | null;
  onsoundend: ((ev: Event) => any) | null;
  onspeechstart: ((ev: Event) => any) | null;
  onspeechend: ((ev: Event) => any) | null;
  
  // Properties
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  grammars: SpeechGrammarList;
  
  // Methods
  start(): void;
  stop(): void;
  abort(): void;
}

// Enhanced Mock for Web Speech API
class MockSpeechRecognition implements SpeechRecognition {
  // Event handlers
  onstart: ((ev: Event) => any) | null = null;
  onresult: ((ev: SpeechRecognitionEvent) => any) | null = null;
  onend: ((ev: Event) => any) | null = null;
  onerror: ((ev: SpeechRecognitionError) => any) | null = null;
  onaudiostart: ((ev: Event) => any) | null = null;
  onaudioend: ((ev: Event) => any) | null = null;
  onnomatch: ((ev: SpeechRecognitionEvent) => any) | null = null;
  onsoundstart: ((ev: Event) => any) | null = null;
  onsoundend: ((ev: Event) => any) | null = null;
  onspeechstart: ((ev: Event) => any) | null = null;
  onspeechend: ((ev: Event) => any) | null = null;
  
  // Properties
  continuous: boolean = false;
  interimResults: boolean = true;
  lang: string = 'en-US';
  maxAlternatives: number = 1;
  grammars: SpeechGrammarList = {
    length: 0,
    item: () => null,
    addFromURI: () => {},
    addFromString: () => {},
  } as SpeechGrammarList;
  
  private eventListeners: Record<string, Array<EventListenerOrEventListenerObject>> = {
    start: [],
    end: [],
    result: [],
    error: [],
    audiostart: [],
    audioend: [],
    nomatch: [],
    soundstart: [],
    soundend: [],
    speechstart: [],
    speechend: [],
  };
  
  private isListening: boolean = false;
  
  // Methods
  start(): void {
    this.isListening = true;
    
    // Trigger the start event
    const event = new Event('start');
    if (this.onstart) this.onstart(event);
    this.dispatchEvent(event);
  }
  
  stop(): void {
    this.isListening = false;
    
    // Trigger the end event
    const event = new Event('end');
    if (this.onend) this.onend(event);
    this.dispatchEvent(event);
  }
  
  abort(): void {
    this.isListening = false;
    
    // Trigger the end event
    const event = new Event('end');
    if (this.onend) this.onend(event);
    this.dispatchEvent(event);
  }
  
  // Utility method to simulate speech recognition results
  simulateResult(transcript: string, isFinal: boolean): void {
    if (!this.isListening) return;
    
    // Create result object
    const resultItem = {
      transcript,
      confidence: 0.9,
    };
    
    const result = {
      isFinal,
      length: 1,
      item: (index: number) => resultItem,
      0: resultItem,
    };
    
    const results = {
      length: 1,
      item: (index: number) => result,
      0: result,
    };
    
    // Create and dispatch the result event - fixing typing issue
    const event = new Event('result') as unknown as SpeechRecognitionEvent;
    
    // Add custom properties to the event
    Object.defineProperties(event, {
      resultIndex: { value: 0 },
      results: { value: results }
    });
    
    if (this.onresult) this.onresult(event);
    this.dispatchEvent(event);
  }
  
  // EventTarget methods
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }
  
  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners[event.type] || [];
    
    for (const listener of listeners) {
      if (typeof listener === 'function') {
        listener(event);
      } else if (listener && typeof listener.handleEvent === 'function') {
        listener.handleEvent(event);
      }
    }
    
    return !event.defaultPrevented;
  }
  
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (!this.eventListeners[type]) return;
    
    this.eventListeners[type] = this.eventListeners[type].filter(l => l !== listener);
  }
}

// Create a LocalStorage mock with proper typings
interface LocalStorageMock {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  _store: Record<string, string>;
}

// Set up global mocks
beforeAll(() => {
  // Mock the Web Speech API
  (globalThis as any).SpeechRecognition = MockSpeechRecognition;
  (globalThis as any).webkitSpeechRecognition = MockSpeechRecognition;
  
  // Mock localStorage for toggle persistence
  const localStorageMock: LocalStorageMock = {
    _store: {},
    getItem(key: string) {
      return this._store[key] || null;
    },
    setItem(key: string, value: string) {
      this._store[key] = value;
    },
    removeItem(key: string) {
      delete this._store[key];
    },
    clear() {
      this._store = {};
    }
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
});

// Cleanup after all tests
afterAll(() => {
  vi.clearAllMocks();
}); 