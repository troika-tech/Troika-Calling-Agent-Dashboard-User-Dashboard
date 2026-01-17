# Real Call Recordings

This directory contains actual call recording files for the exhibition demo dashboard.

## Overview

The first 40 calls in the demo are configured to use real recordings instead of placeholder URLs. This directory is where those recording files should be placed.

## Instructions

### 1. File Placement
- Place 30-40 MP3, WAV, or M4A recording files in this directory
- Files should be named according to the convention: `call-001.mp3`, `call-002.mp3`, etc.
- Supported formats: MP3, WAV, M4A

### 2. File Naming Convention
```
call-001.mp3  → Used for call index 0 (first call)
call-002.mp3  → Used for call index 1 (second call)
call-003.mp3  → Used for call index 2 (third call)
...
call-040.mp3  → Used for call index 39 (40th call)
```

### 3. Configuration
- Edit `src/config/realRecordings.js` to map call indices to your file names
- Example:
  ```javascript
  export const REAL_RECORDINGS = {
    0: '/recordings/call-001.mp3',
    1: '/recordings/call-002.mp3',
    2: '/recordings/call-003.mp3',
    // ... add more mappings as needed
  };
  ```

### 4. Fallback Behavior
- If a real recording is not configured for a call, it will fall back to a demo placeholder URL
- Only the first 40 calls (indices 0-39) are flagged for real recordings
- Calls beyond index 39 will always use placeholder URLs

## File Size Recommendations
- Keep individual files under 5MB for optimal loading
- Use MP3 format with 128kbps bitrate for a good balance of quality and size
- Typical 2-3 minute call: ~3-4MB at 128kbps

## Testing
1. Add your recording files to this directory
2. Update the configuration in `src/config/realRecordings.js`
3. Start the dev server: `npm run dev`
4. Navigate to Call Logs and click on the first few calls
5. Verify that the recording player shows the correct file

## Notes
- These files are served statically from the `public` directory
- The `/recordings/` path in URLs maps to this directory
- Files in this directory are not committed to git (excluded via .gitignore)
