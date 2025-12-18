import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const ACTIVITY_THROTTLE = 1000; // Throttle activity updates to once per second

/**
 * Hook to track user inactivity and auto-logout after timeout
 * @param {boolean} enabled - Whether the timeout is enabled (should be false on login page)
 */
const useInactivityTimeout = (enabled = true) => {
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const throttleRef = useRef(null);

  // Clear timeout
  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Handle logout due to inactivity
  const handleInactivityLogout = useCallback(() => {
    console.log('[Inactivity] Logging out due to inactivity');
    
    // Clear auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivityTime');
    
    // Set message for login page
    localStorage.setItem('inactivityLogoutMessage', 'Your session has expired due to inactivity. Please log in again.');
    
    // Redirect to login
    window.location.href = '/login';
  }, []);

  // Reset the inactivity timer
  const resetTimer = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem('lastActivityTime', now.toString());

    // Clear existing timeout
    clearTimeoutRef();

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      handleInactivityLogout();
    }, INACTIVITY_TIMEOUT);
  }, [enabled, clearTimeoutRef, handleInactivityLogout]);

  // Throttled activity handler
  const handleActivity = useCallback(() => {
    if (!enabled) return;
    
    // Throttle activity updates
    if (throttleRef.current) return;
    
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
    }, ACTIVITY_THROTTLE);

    resetTimer();
  }, [enabled, resetTimer]);

  // Check for existing session timeout on mount
  useEffect(() => {
    if (!enabled) return;

    const lastActivity = localStorage.getItem('lastActivityTime');
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      
      // If timeout exceeded since last activity, logout immediately
      if (elapsed >= INACTIVITY_TIMEOUT) {
        console.log('[Inactivity] Session expired on page load');
        handleInactivityLogout();
        return;
      }
    }

    // Initialize timer
    resetTimer();
  }, [enabled, handleInactivityLogout, resetTimer]);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Listen for activity in other tabs via localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'lastActivityTime' && e.newValue) {
        lastActivityRef.current = parseInt(e.newValue, 10);
        resetTimer();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      clearTimeoutRef();
      
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [enabled, handleActivity, resetTimer, clearTimeoutRef]);
};

export default useInactivityTimeout;

