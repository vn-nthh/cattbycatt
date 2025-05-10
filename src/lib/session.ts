/**
 * Utility for managing client-side session identifiers
 */

const SESSION_ID_KEY = 'catt_session_id';

/**
 * Checks if we're running in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Generates a random 6-digit session code
 */
function generateSessionId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Gets the current session ID from localStorage or creates a new one
 * Uses URL parameter if available, falls back to localStorage
 */
export function getSessionId(urlSearchParams?: URLSearchParams): string {
  // First check URL for session parameter
  if (urlSearchParams) {
    const sessionFromUrl = urlSearchParams.get('session');
    if (sessionFromUrl) {
      // If found in URL and we have localStorage, save it
      if (isBrowser()) {
        localStorage.setItem(SESSION_ID_KEY, sessionFromUrl);
      }
      return sessionFromUrl;
    }
  }
  
  // If we're not in a browser, return a fallback session ID
  if (!isBrowser()) {
    return "000000"; // Fallback for SSR
  }
  
  // Check if we already have a session ID
  const existingSessionId = localStorage.getItem(SESSION_ID_KEY);
  
  if (existingSessionId) {
    return existingSessionId;
  }
  
  // Create and store a new session ID
  const newSessionId = generateSessionId();
  localStorage.setItem(SESSION_ID_KEY, newSessionId);
  
  return newSessionId;
} 