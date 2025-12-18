import React from 'react';
import useInactivityTimeout from '../hooks/useInactivityTimeout';

/**
 * Component that tracks user inactivity and auto-logs out
 * Wrap this around authenticated content
 */
const InactivityTracker = ({ children }) => {
  // Just use the hook - it handles auto-logout internally
  useInactivityTimeout(true);

  return <>{children}</>;
};

export default InactivityTracker;

