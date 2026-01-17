/**
 * Application Configuration
 * Handles dev and production environment settings
 */

// Detect environment - check if we're in development or production
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

/**
 * Development Backend Configuration
 * Set to 'local' to use local backend via vite proxy (localhost:5000)
 * Set to 'live' to use live backend (https://calling-api.0804.in)
 */
const DEV_BACKEND = 'live'; // Change to 'local' or 'live'
// const DEV_BACKEND = 'local'; // Change to 'local' or 'live'

/**
 * Live Backend URL
 */
const LIVE_BACKEND_URL = 'https://calling-api.0804.in';
//const LIVE_BACKEND_URL = 'http://localhost:5000';

/**
 * Get WebSocket URL based on environment and API URL
 * @returns {string} WebSocket URL
 */
const getWsUrl = () => {
  const apiUrl = getApiBaseUrl();
  
  if (!apiUrl) {
    // Local development with vite proxy - use same host with ws protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  
  // Convert http(s) URL to ws(s) URL
  return apiUrl.replace(/^http/, 'ws');
};

/**
 * Get API Base URL based on environment
 * @returns {string} API base URL
 */
const getApiBaseUrl = () => {
  if (isDevelopment) {
    // Development: Choose between local or live backend
    if (DEV_BACKEND === 'local') {
      // Use local backend via vite proxy
      return ''; // Empty string uses vite proxy to localhost:5000
    } else {
      // Use live backend for testing
      return LIVE_BACKEND_URL;
    }
  }
  
  // Production: Always use live backend
  return LIVE_BACKEND_URL;
};

/**
 * Application Configuration
 */
const config = {
  // Environment
  isDevelopment,
  isProduction,
  mode: isDevelopment ? 'development' : 'production',
  
  // API Configuration
  apiBaseUrl: getApiBaseUrl(),
  
  // WebSocket Configuration
  wsBaseUrl: getWsUrl(),
  
  // Demo Mode Configuration
  demoMode: true, // Change to false to use real API
  demo: {
    // Exhibition stats (impressive numbers for showcase)
    totalCalls: 120000,
    totalCampaigns: 45,
    realRecordingsCount: 40, // First 40 calls will have slots for real recordings

    // Performance metrics (optimized for exhibition impression)
    pickupRate: 78, // 78% pickup rate
    completionRate: 67, // 67% completion rate
    avgDuration: 142, // seconds

    // Cost savings showcase
    creditBalance: 250000,
    avgCallCost: 1.2, // rupees

    // Time period for demo data
    dataStartDate: '2024-10-17', // 3 months ago from today
    dataEndDate: '2026-01-17', // today
  },
  
  // Feature Flags
  features: {
    enableAnalytics: true,
    enableLiveStatus: true,
    enableCallRecording: true,
  },
  
  // API Endpoints (relative to apiBaseUrl)
  endpoints: {
    auth: '/api/v1/auth',
    campaigns: '/api/v1/campaigns',
    calls: '/api/v1/calls',
    analytics: '/api/v1/analytics',
    credits: '/api/v1/credits',
    agents: '/api/v1/agents',
    phones: '/api/v1/phones',
  },
  
  // Logging
  enableLogging: isDevelopment, // Only log in development
};

// Log configuration on first load (only in development)
if (config.enableLogging && typeof window !== 'undefined' && !window.__CONFIG_LOGGED__) {
  window.__CONFIG_LOGGED__ = true;
  console.log('🔧 Application Configuration:');
  console.log('  - Environment:', config.mode);
  console.log('  - API Base URL:', config.apiBaseUrl || '(relative - using vite proxy)');
  console.log('  - WebSocket URL:', config.wsBaseUrl || '(relative - using vite proxy)');
  console.log('  - Demo Mode:', config.demoMode);
  console.log('  - API Mode:', config.demoMode ? 'DEMO (Mock Data)' : 'REAL API');
  if (config.demoMode) {
    console.log('✅ Using mock data - No backend connection needed');
  } else {
    if (config.apiBaseUrl === '' || config.apiBaseUrl.includes('localhost')) {
      console.log('🔗 Using local backend:', config.apiBaseUrl || 'via vite proxy');
    } else {
      console.warn('⚠️ Using production backend:', config.apiBaseUrl);
    }
  }
}

export default config;

