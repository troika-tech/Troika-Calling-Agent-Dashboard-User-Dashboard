/**
 * useRecording Hook
 * Centralized hook for recording playback and download functionality
 */

import { useState, useRef, useCallback } from 'react';
import config from '../config';
import { getAuthToken, downloadBlob } from '../utils';

/**
 * Hook for managing recording playback and downloads
 * @returns {Object} Recording utilities
 */
export const useRecording = () => {
  const [playingId, setPlayingId] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  /**
   * Play a recording
   * @param {string} id - Recording/call ID
   * @param {string} recordingUrl - Direct URL to recording
   */
  const play = useCallback((id, recordingUrl) => {
    if (!recordingUrl) {
      setError('No recording URL available');
      return;
    }

    // If same recording is playing, pause it
    if (playingId === id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Create and play new audio
    try {
      setError(null);
      const audio = new Audio(recordingUrl);
      audioRef.current = audio;
      
      audio.play().catch((err) => {
        console.error('Error playing audio:', err);
        setError('Failed to play recording');
        setPlayingId(null);
      });

      audio.onended = () => {
        setPlayingId(null);
      };

      audio.onerror = () => {
        setError('Failed to load recording');
        setPlayingId(null);
      };

      setPlayingId(id);
    } catch (err) {
      console.error('Error creating audio:', err);
      setError('Failed to play recording');
    }
  }, [playingId]);

  /**
   * Stop current playback
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  /**
   * Download recording via backend proxy (avoids CORS issues)
   * @param {string} callId - Call ID for the recording
   * @param {string} filename - Optional custom filename
   * @returns {Promise<boolean>} Success status
   */
  const download = useCallback(async (callId, filename = null) => {
    if (!callId) {
      setError('Call ID is required for download');
      return false;
    }

    try {
      setDownloading(callId);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const apiBaseUrl = config.apiBaseUrl;
      const downloadUrl = `${apiBaseUrl}/api/v1/analytics/calls/${callId}/recording/download`;

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'audio/mpeg, audio/*, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recording: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadFilename = filename || `call_recording_${callId}.mp3`;
      downloadBlob(blob, downloadFilename);

      return true;
    } catch (err) {
      console.error('Error downloading recording:', err);
      setError(err.message || 'Failed to download recording');
      return false;
    } finally {
      setDownloading(null);
    }
  }, []);

  /**
   * Download recording directly from URL (if CORS allows)
   * @param {string} url - Recording URL
   * @param {string} filename - Filename for download
   * @returns {Promise<boolean>} Success status
   */
  const downloadDirect = useCallback(async (url, filename) => {
    if (!url) {
      setError('Recording URL is required');
      return false;
    }

    try {
      setDownloading(url);
      setError(null);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch recording: ${response.status}`);
      }

      const blob = await response.blob();
      downloadBlob(blob, filename || 'recording.mp3');

      return true;
    } catch (err) {
      console.error('Error downloading recording:', err);
      setError(err.message || 'Failed to download recording');
      return false;
    } finally {
      setDownloading(null);
    }
  }, []);

  /**
   * Check if a specific recording is currently playing
   * @param {string} id - Recording ID to check
   * @returns {boolean} True if playing
   */
  const isPlaying = useCallback((id) => {
    return playingId === id;
  }, [playingId]);

  /**
   * Check if a specific recording is being downloaded
   * @param {string} id - Recording ID to check
   * @returns {boolean} True if downloading
   */
  const isDownloading = useCallback((id) => {
    return downloading === id;
  }, [downloading]);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    playingId,
    downloading,
    error,
    
    // Actions
    play,
    stop,
    download,
    downloadDirect,
    
    // Helpers
    isPlaying,
    isDownloading,
    clearError,
  };
};

export default useRecording;


