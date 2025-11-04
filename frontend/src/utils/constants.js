/**
 * Application-wide constants
 */

// User Roles
export const USER_ROLES = {
  DOCTOR: 'doctor',
  PATIENT: 'patient'
};

// Appointment Statuses
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Health Metric Types
export const METRIC_TYPES = {
  HEARTBEAT: 'heartbeat',
  BLOOD_PRESSURE: 'blood_pressure',
  TEMPERATURE: 'temperature',
  SUGAR_LEVEL: 'sugar_level',
  SLEEP_HOURS: 'sleep_hours'
};

// Metric Units
export const METRIC_UNITS = {
  [METRIC_TYPES.HEARTBEAT]: 'bpm',
  [METRIC_TYPES.BLOOD_PRESSURE]: 'mmHg',
  [METRIC_TYPES.TEMPERATURE]: '°F',
  [METRIC_TYPES.SUGAR_LEVEL]: 'mg/dL',
  [METRIC_TYPES.SLEEP_HOURS]: 'hours'
};

// Normal Ranges for Metrics
export const NORMAL_RANGES = {
  [METRIC_TYPES.HEARTBEAT]: { min: 60, max: 100 },
  [METRIC_TYPES.TEMPERATURE]: { min: 97, max: 99 },
  [METRIC_TYPES.SUGAR_LEVEL]: { min: 70, max: 140 },
  [METRIC_TYPES.SLEEP_HOURS]: { min: 7, max: 9 }
};

// Record Types
export const RECORD_TYPES = {
  XRAY: 'xray',
  LAB_TEST: 'lab_test',
  REPORT: 'report',
  PRESCRIPTION: 'prescription',
  SCAN: 'scan'
};

// Blood Groups
export const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
];

// Gender Options
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' }
];

// File Upload Settings
export const FILE_UPLOAD = {
  MAX_SIZE: 16 * 1024 * 1024, // 16MB in bytes
  ALLOWED_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
  ALLOWED_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.pdf']
};

// API Endpoints (relative paths)
export const API_ENDPOINTS = {
  // Auth
  SIGNUP: '/auth/signup',
  LOGIN: '/auth/login',
  ME: '/auth/me',
  UPDATE_PROFILE: '/auth/update-profile',
  
  // Patient
  HEALTH_METRICS: '/patient/health-metrics',
  MEDICAL_RECORDS: '/patient/medical-records',
  PATIENT_DASHBOARD: '/patient/dashboard-summary',
  ASSIGNED_DOCTORS: '/patient/doctors',
  
  // Doctor
  DOCTOR_PATIENTS: '/doctor/patients',
  DOCTOR_DASHBOARD: '/doctor/dashboard-summary',
  SEARCH_PATIENTS: '/doctor/search-patients',
  
  // Appointments
  APPOINTMENTS: '/appointments',
  UPCOMING_APPOINTMENTS: '/appointments/upcoming',
  
  // Chat
  CHAT: '/chat',
  CHAT_HISTORY: '/chat/history',
  ANALYZE_PATIENT: '/chat/analyze-patient',
  CLEAR_CHAT: '/chat/clear'
};

// Chart Colors
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  INFO: '#06b6d4',
  PURPLE: '#8b5cf6'
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100]
};

// Toast/Notification Durations
export const NOTIFICATION_DURATION = {
  SHORT: 2000,
  MEDIUM: 4000,
  LONG: 6000
};

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'MMM dd, yyyy',
  LONG: 'MMMM dd, yyyy',
  WITH_TIME: 'MMM dd, yyyy HH:mm',
  TIME_ONLY: 'HH:mm'
};

// LocalStorage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language'
};

// Specializations (for doctors)
export const SPECIALIZATIONS = [
  'General Practice',
  'Cardiology',
  'Dermatology',
  'Emergency Medicine',
  'Endocrinology',
  'Gastroenterology',
  'Neurology',
  'Obstetrics & Gynecology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Radiology',
  'Surgery',
  'Urology'
];

// Time Slots for Appointments
export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
];

// Message Types for Chat
export const MESSAGE_TYPES = {
  USER: 'user',
  AI: 'ai',
  SYSTEM: 'system'
};

// Validation Rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 50,
  PHONE_MIN_LENGTH: 10,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100
};

// Feature Flags (for gradual rollout)
export const FEATURES = {
  CHAT_ENABLED: true,
  VIDEO_CONSULTATION: false,
  PRESCRIPTION_MANAGEMENT: false,
  LAB_INTEGRATION: false
};

export default {
  USER_ROLES,
  APPOINTMENT_STATUS,
  METRIC_TYPES,
  METRIC_UNITS,
  NORMAL_RANGES,
  RECORD_TYPES,
  BLOOD_GROUPS,
  GENDER_OPTIONS,
  FILE_UPLOAD,
  API_ENDPOINTS,
  CHART_COLORS,
  PAGINATION,
  NOTIFICATION_DURATION,
  DATE_FORMATS,
  STORAGE_KEYS,
  SPECIALIZATIONS,
  TIME_SLOTS,
  MESSAGE_TYPES,
  VALIDATION,
  FEATURES
};