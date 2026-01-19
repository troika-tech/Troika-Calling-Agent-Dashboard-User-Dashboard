/**
 * useIsMobile Hook
 *
 * Custom React hook for detecting mobile platform
 * Returns platform information that components can use for conditional rendering
 */

import { useEffect, useState } from 'react';
import { isMobilePlatform, isAndroid, isIOS, isWeb, getPlatform, isNative } from '../utils/platform';

/**
 * Hook to detect mobile platform
 * @returns {Object} Platform information
 */
export const useIsMobile = () => {
  const [platformInfo, setPlatformInfo] = useState({
    isMobile: isMobilePlatform(),
    isAndroid: isAndroid(),
    isIOS: isIOS(),
    isWeb: isWeb(),
    isNative: isNative(),
    platform: getPlatform(),
  });

  useEffect(() => {
    // Platform detection is synchronous in Capacitor, but we still
    // set it in useEffect to ensure it's available after mount
    setPlatformInfo({
      isMobile: isMobilePlatform(),
      isAndroid: isAndroid(),
      isIOS: isIOS(),
      isWeb: isWeb(),
      isNative: isNative(),
      platform: getPlatform(),
    });
  }, []);

  return platformInfo;
};

/**
 * Hook to detect if viewport is mobile-sized
 * Useful for responsive design on web
 * @param {number} breakpoint - Width breakpoint in pixels (default: 768px)
 * @returns {boolean} True if viewport is smaller than breakpoint
 */
export const useIsMobileViewport = (breakpoint = 768) => {
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== 'undefined' && window.innerWidth < breakpoint
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);

    // Check immediately
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobileViewport;
};
