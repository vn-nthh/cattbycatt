/**
 * Utility for managing client-side session identifiers
 */

const SESSION_ID_KEY = 'catt_session_id';

/**
 * Generates a random 6-digit session code
 */
function generateSessionId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Gets the current session ID from localStorage or creates a new one
 */
export function getSessionId(): string {
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