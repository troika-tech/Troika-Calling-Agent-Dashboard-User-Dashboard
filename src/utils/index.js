/**
 * Shared Utility Functions
 * Centralized utilities to avoid code duplication across components
 */

// ============================================
// DATE & TIME FORMATTING
// ============================================

/**
 * Format duration in seconds to human-readable format
 * @param {number} seconds - Duration in seconds
 * @param {string} format - 'short' (1m 5s), 'padded' (01:05), 'long' (1 min 5 sec)
 * @returns {string} Formatted duration
 */
export const formatDuration = (seconds, format = 'short') => {
  if (!seconds || seconds <= 0) return format === 'padded' ? '00:00' : '0s';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  switch (format) {
    case 'padded':
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    case 'long':
      if (mins > 0) return `${mins} min ${secs} sec`;
      return `${secs} sec`;
    case 'short':
    default:
      if (mins > 0) return `${mins}m ${secs}s`;
      return `${secs}s`;
  }
};

/**
 * Format duration from milliseconds
 * @param {number} milliseconds - Duration in milliseconds
 * @param {string} format - 'short', 'padded', 'long'
 * @returns {string} Formatted duration
 */
export const formatDurationMs = (milliseconds, format = 'short') => {
  if (!milliseconds || milliseconds <= 0) return format === 'padded' ? '00:00' : '0s';
  return formatDuration(Math.floor(milliseconds / 1000), format);
};

/**
 * Format total duration for stats (e.g., "2h 30m" or "45m")
 * @param {number} seconds - Total duration in seconds
 * @returns {string} Formatted duration
 */
export const formatTotalDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '0m';
  
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  
  return `${Math.floor(seconds / 60)}m`;
};

/**
 * Format time only from date string (e.g., "2:30 PM")
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted time
 */
export const formatTimeOnly = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

/**
 * Format date only from date string (e.g., "22 Dec 2025")
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDateOnly = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

/**
 * Format date and time from date string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date and time
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

/**
 * Get relative time (e.g., "5 minutes ago")
 * @param {string|Date} date - Date to compare
 * @returns {string} Relative time string
 */
export const timeAgo = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

// ============================================
// USER & AUTH UTILITIES
// ============================================

/**
 * Get current user from localStorage
 * @returns {Object} User object or empty object
 */
export const getUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return {};
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    return {};
  }
};

/**
 * Get current user ID
 * @returns {string|null} User ID or null
 */
export const getUserId = () => {
  const user = getUser();
  return user._id || user.id || null;
};

/**
 * Get auth token from localStorage
 * @returns {string|null} Auth token or null
 */
export const getAuthToken = () => {
  return localStorage.getItem('authToken') || localStorage.getItem('token') || null;
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export const isAuthenticated = () => {
  return !!getAuthToken() && !!getUserId();
};

/**
 * Clear all auth data from localStorage
 */
export const clearAuthData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('lastActivityTime');
};

// ============================================
// NUMBER FORMATTING
// ============================================

/**
 * Format number with commas (e.g., 1,234,567)
 * @param {number} value - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  return Math.round(value).toLocaleString('en-IN');
};

/**
 * Format credits with label
 * @param {number} value - Credit amount
 * @returns {string} Formatted credits (e.g., "1,234 credits")
 */
export const formatCredits = (value) => {
  if (value === null || value === undefined) return '0 credits';
  const rounded = Math.round(Math.abs(value));
  const prefix = value < 0 ? '-' : '';
  return `${prefix}${rounded.toLocaleString('en-IN')} credits`;
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  // Remove all non-digits except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned;
};

// ============================================
// STATUS UTILITIES
// ============================================

/**
 * Get status configuration for badges
 * @param {string} status - Status string
 * @returns {Object} Status config with colors and label
 */
export const getStatusConfig = (status) => {
  const configs = {
    'completed': {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Completed',
    },
    'in-progress': {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
      label: 'In Progress',
    },
    'failed': {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-500',
      label: 'Failed',
    },
    'initiated': {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      dot: 'bg-yellow-500',
      label: 'Initiated',
    },
    'no-answer': {
      bg: 'bg-zinc-100',
      text: 'text-zinc-700',
      border: 'border-zinc-200',
      dot: 'bg-zinc-500',
      label: 'No Answer',
    },
    'busy': {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      dot: 'bg-orange-500',
      label: 'Busy',
    },
    'pending': {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
      label: 'Pending',
    },
    'cancelled': {
      bg: 'bg-zinc-100',
      text: 'text-zinc-600',
      border: 'border-zinc-200',
      dot: 'bg-zinc-400',
      label: 'Cancelled',
    },
    'active': {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Active',
    },
    'paused': {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      dot: 'bg-yellow-500',
      label: 'Paused',
    },
    'scheduled': {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      dot: 'bg-purple-500',
      label: 'Scheduled',
    },
    'processing': {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
      label: 'Processing',
    },
  };

  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
  return configs[normalizedStatus] || {
    bg: 'bg-zinc-100',
    text: 'text-zinc-600',
    border: 'border-zinc-200',
    dot: 'bg-zinc-400',
    label: status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' ') : 'Unknown',
  };
};

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone to validate
 * @returns {boolean} True if valid
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s-]{10,15}$/;
  return phoneRegex.test(phone);
};

/**
 * Check if date range is valid
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {boolean} True if valid
 */
export const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return true;
  return new Date(startDate) <= new Date(endDate);
};

// ============================================
// MISC UTILITIES
// ============================================

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Download blob as file
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Filename
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Export data to CSV
 * @param {Array} headers - Column headers
 * @param {Array} rows - Data rows
 * @param {string} filename - Filename without extension
 */
export const exportToCSV = (headers, rows, filename) => {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength - 3) + '...';
};


