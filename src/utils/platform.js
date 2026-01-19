/**
 * Platform Detection Utilities
 *
 * Detects whether the app is running on web, Android, or iOS
 * Uses Capacitor's getPlatform() API for accurate platform detection
 */

import { Capacitor } from '@capacitor/core';

/**
 * Check if running on a mobile platform (Android or iOS)
 * @returns {boolean}
 */
export const isMobilePlatform = () => {
  const platform = Capacitor.getPlatform();
  return platform === 'android' || platform === 'ios';
};

/**
 * Check if running on Android
 * @returns {boolean}
 */
export const isAndroid = () => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Check if running on iOS
 * @returns {boolean}
 */
export const isIOS = () => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Check if running on web
 * @returns {boolean}
 */
export const isWeb = () => {
  return Capacitor.getPlatform() === 'web';
};

/**
 * Get the current platform name
 * @returns {'web' | 'android' | 'ios'}
 */
export const getPlatform = () => {
  return Capacitor.getPlatform();
};

/**
 * Check if the app is running natively (installed as APK/IPA)
 * @returns {boolean}
 */
export const isNative = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Check if specific Capacitor plugin is available
 * @param {string} pluginName - Name of the plugin to check
 * @returns {boolean}
 */
export const isPluginAvailable = (pluginName) => {
  return Capacitor.isPluginAvailable(pluginName);
};
