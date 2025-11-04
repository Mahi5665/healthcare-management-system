/**
 * Helper utility functions for the Healthcare Management System
 */

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {string} format - 'short' | 'long' | 'time'
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  
  const options = {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
    time: { hour: '2-digit', minute: '2-digit' }
  };
  
  return d.toLocaleDateString('en-US', options[format]);
};

/**
 * Format date and time together
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Calculate age from date of birth
 * @param {string|Date} dateOfBirth - Date of birth
 * @returns {number} Age in years
 */
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (basic)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

/**
 * Format file size to human readable
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Debounce function to limit rapid function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Get status color for appointment or other status
 * @param {string} status - Status string
 * @returns {string} Tailwind color class
 */
export const getStatusColor = (status) => {
  const colors = {
    pending: 'text-yellow-600 bg-yellow-100',
    approved: 'text-green-600 bg-green-100',
    rejected: 'text-red-600 bg-red-100',
    completed: 'text-blue-600 bg-blue-100',
    cancelled: 'text-gray-600 bg-gray-100'
  };
  
  return colors[status?.toLowerCase()] || 'text-gray-600 bg-gray-100';
};

/**
 * Get metric icon name based on type
 * @param {string} metricType - Type of health metric
 * @returns {string} Icon name
 */
export const getMetricIcon = (metricType) => {
  const icons = {
    heartbeat: 'Heart',
    blood_pressure: 'Activity',
    temperature: 'Thermometer',
    sugar_level: 'Droplet',
    sleep_hours: 'Moon'
  };
  
  return icons[metricType] || 'Activity';
};

/**
 * Check if metric value is in normal range (basic check)
 * @param {string} metricType - Type of metric
 * @param {number} value - Metric value
 * @returns {object} Status object with isNormal and severity
 */
export const checkMetricRange = (metricType, value) => {
  const ranges = {
    heartbeat: { min: 60, max: 100, unit: 'bpm' },
    temperature: { min: 97, max: 99, unit: '°F' },
    sugar_level: { min: 70, max: 140, unit: 'mg/dL' },
    sleep_hours: { min: 7, max: 9, unit: 'hours' }
  };
  
  const range = ranges[metricType];
  if (!range) return { isNormal: true, severity: 'normal' };
  
  const numValue = parseFloat(value);
  
  if (numValue < range.min) {
    return { isNormal: false, severity: 'low' };
  } else if (numValue > range.max) {
    return { isNormal: false, severity: 'high' };
  }
  
  return { isNormal: true, severity: 'normal' };
};

/**
 * Format blood pressure reading
 * @param {string} value - Blood pressure value (e.g., "120/80")
 * @returns {object} Object with systolic and diastolic values
 */
export const parseBloodPressure = (value) => {
  const parts = value.split('/');
  return {
    systolic: parseInt(parts[0]) || 0,
    diastolic: parseInt(parts[1]) || 0
  };
};

/**
 * Generate random color for charts
 * @param {number} index - Index for consistent colors
 * @returns {string} Hex color code
 */
export const getChartColor = (index) => {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16'  // lime
  ];
  
  return colors[index % colors.length];
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

/**
 * Download data as file
 * @param {string} data - Data to download
 * @param {string} filename - File name
 * @param {string} type - MIME type
 */
export const downloadFile = (data, filename, type = 'text/plain') => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Format metric type to readable string
 * @param {string} metricType - Metric type
 * @returns {string} Formatted string
 */
export const formatMetricType = (metricType) => {
  return metricType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Check if date is in the past
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if in past
 */
export const isPastDate = (date) => {
  return new Date(date) < new Date();
};

/**
 * Check if date is today
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if today
 */
export const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  
  return today.toDateString() === checkDate.toDateString();
};

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(date);
};