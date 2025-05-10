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
 * Generates a random 6-character session code with digits, uppercase and lowercase letters
 */
function generateSessionId(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
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