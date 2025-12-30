// ============================================
// BACKEND CONFIGURATION
// ============================================
// To switch backends, simply change the BACKEND_MODE value below
// Options: 'NEW', 'OLD', 'LOCALHOST', 'BACKEND_WORKER'
// Using BACKEND_WORKER to connect to the local backend-worker
const BACKEND_MODE = 'BACKEND_WORKER'; // Set to 'BACKEND_WORKER' for local backend-worker, 'LOCALHOST' for local testing

// API URLs
const BACKEND_URLS = {
  NEW: 'https://chat-apiv3.0804.in',      // New backend (Chat-Agent-Backend-V3)
  OLD: 'https://api.0804.in',             // Hosted backend
  LOCALHOST: 'http://localhost:5000',     // Local development (new backend)
  BACKEND_WORKER: 'http://localhost:5000' // Local backend-worker (default port 5000)
};

// ============================================
// DO NOT MODIFY BELOW THIS LINE
// ============================================

// Validate backend mode
if (!BACKEND_URLS[BACKEND_MODE]) {
  console.error(`Invalid BACKEND_MODE: ${BACKEND_MODE}. Must be one of: NEW, OLD, LOCALHOST`);
  throw new Error(`Invalid BACKEND_MODE: ${BACKEND_MODE}`);
}

// Allow override via environment variable (e.g., Vite: VITE_API_BASE_URL)
const ENV_BASE_URL = typeof import.meta !== 'undefined'
  ? import.meta.env?.VITE_API_BASE_URL
  : (process.env?.VITE_API_BASE_URL || process.env?.API_BASE_URL);

// Export the selected URL
export const API_BASE_URL = ENV_BASE_URL || BACKEND_URLS[BACKEND_MODE];

// Export current mode for debugging
export const CURRENT_BACKEND_MODE = BACKEND_MODE;

// Demo mode (kept for compatibility, always false)
export const DEMO_MODE = false;

export default {
  API_BASE_URL,
  BACKEND_MODE,
  BACKEND_URLS,
  CURRENT_BACKEND_MODE,
  DEMO_MODE,
};