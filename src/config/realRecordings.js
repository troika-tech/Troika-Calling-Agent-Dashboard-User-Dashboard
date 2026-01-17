/**
 * Real Recordings Configuration
 * Maps call indices (0-39) to actual recording file URLs
 *
 * Instructions:
 * 1. Place your MP3/WAV/M4A files in public/recordings/
 * 2. Update the URLs below to match your file names
 * 3. Naming convention: call-001.mp3, call-002.mp3, etc.
 */

// Map of call index to recording URL
// First 40 calls (indices 0-39) are flagged for real recordings
export const REAL_RECORDINGS = {
  // Example entries - update these with your actual file names
  0: '/recordings/call-001.mp3',
  1: '/recordings/call-002.mp3',
  2: '/recordings/call-003.mp3',

  // Add entries for calls 4-39 as needed:
  // 3: '/recordings/call-004.mp3',
  // 4: '/recordings/call-005.mp3',
  // ... continue up to index 39 for call-040.mp3
};

/**
 * Get real recording URL for a call index
 * @param {number} callIndex - The index of the call (0-based)
 * @returns {string|null} - Recording URL or null if not configured
 */
export const getRealRecordingUrl = (callIndex) => {
  return REAL_RECORDINGS[callIndex] || null;
};

/**
 * Check if a call index has a real recording configured
 * @param {number} callIndex - The index of the call (0-based)
 * @returns {boolean} - True if real recording is configured
 */
export const hasRealRecording = (callIndex) => {
  return callIndex in REAL_RECORDINGS;
};

/**
 * Get total count of configured real recordings
 * @returns {number} - Number of real recordings configured
 */
export const getRealRecordingsCount = () => {
  return Object.keys(REAL_RECORDINGS).length;
};

export default {
  REAL_RECORDINGS,
  getRealRecordingUrl,
  hasRealRecording,
  getRealRecordingsCount,
};
