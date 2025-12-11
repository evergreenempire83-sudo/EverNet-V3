// App constants
export const APP_NAME = 'EverNet Admin System';
export const COMPANY_NAME = 'EverNet Music';
export const SUPPORT_EMAIL = 'support@evergreenempireltd.com';

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  CREATOR: 'creator'
};

// User statuses
export const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
};

// Report statuses
export const REPORT_STATUS = {
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
  PENDING: 'pending'
};

// Withdrawal statuses
export const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSING: 'processing'
};

// Payment methods
export const PAYMENT_METHODS = {
  PAYPAL: 'paypal',
  BANK: 'bank'
};

// Violation types
export const VIOLATION_TYPES = {
  LOW_VOLUME: 'low_volume',
  WRONG_SOUND: 'wrong_sound',
  DUPLICATE: 'duplicate'
};

// Notification categories
export const NOTIFICATION_CATEGORIES = {
  ANNOUNCEMENT: 'announcement',
  PAYMENT: 'payment',
  SYSTEM: 'system',
  REPORT: 'report',
  VIOLATION: 'violation'
};

// Financial constants
export const FINANCIAL_CONSTANTS = {
  PAYOUT_RATE_PER_1000: 0.30, // $0.30 per 1000 premium views
  PREMIUM_PERCENTAGE: 7, // 7% of views are premium
  MINIMUM_WITHDRAWAL: 50.00,
  LOCK_PERIOD_DAYS: 90,
  SCAN_FREQUENCY: 'daily',
  TAX_RATE: 0.15 // 15% tax rate
};

// Date formats
export const DATE_FORMATS = {
  SHORT: 'MMM dd, yyyy',
  MEDIUM: 'MMM dd, yyyy HH:mm',
  LONG: 'EEEE, MMMM dd, yyyy',
  TIME: 'HH:mm:ss',
  MONTH_YEAR: 'MMMM yyyy',
  ISO: 'yyyy-MM-dd'
};

// Color constants
export const COLORS = {
  NAVY_PRIMARY: '#0A2463',
  NAVY_DARK: '#071845',
  NAVY_LIGHT: '#1E3A8A',
  GOLD_PRIMARY: '#FFD700',
  GOLD_DARK: '#D4AF37',
  GOLD_LIGHT: '#FFE55C',
  WHITE: '#FFFFFF',
  GRAY_50: '#F9FAFB',
  GRAY_100: '#F3F4F6',
  GRAY_200: '#E5E7EB',
  GRAY_300: '#D1D5DB',
  GRAY_400: '#9CA3AF',
  GRAY_500: '#6B7280',
  GRAY_600: '#4B5563',
  GRAY_700: '#374151',
  GRAY_800: '#1F2937',
  GRAY_900: '#111827',
  GREEN_500: '#10B981',
  RED_500: '#EF4444',
  YELLOW_500: '#F59E0B',
  BLUE_500: '#3B82F6',
  PURPLE_500: '#8B5CF6'
};

// Status colors
export const STATUS_COLORS = {
  SUCCESS: COLORS.GREEN_500,
  ERROR: COLORS.RED_500,
  WARNING: COLORS.YELLOW_500,
  INFO: COLORS.BLUE_500
};

// Breakpoints for responsive design
export const BREAKPOINTS = {
  MOBILE: 640,
  TABLET: 768,
  LAPTOP: 1024,
  DESKTOP: 1280,
  XL: 1536
};

// Storage constants
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'evernet_auth_token',
  USER_DATA: 'evernet_user_data',
  THEME: 'evernet_theme',
  LANGUAGE: 'evernet_language',
  RECENT_SEARCHES: 'evernet_recent_searches'
};

// API endpoints
export const API_ENDPOINTS = {
  YOUTUBE_API: 'https://www.googleapis.com/youtube/v3',
  FIREBASE_AUTH: 'https://identitytoolkit.googleapis.com/v1',
  // Add more as needed
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  AUTH_ERROR: 'Authentication failed. Please login again.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  RATE_LIMIT: 'Too many requests. Please try again later.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Created successfully!',
  UPDATED: 'Updated successfully!',
  DELETED: 'Deleted successfully!',
  SAVED: 'Saved successfully!',
  SENT: 'Sent successfully!',
  APPROVED: 'Approved successfully!',
  REJECTED: 'Rejected successfully!'
};

// Validation rules
export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  URL: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
  PHONE: /^\+?[\d\s-()]{10,}$/,
  ZIP_CODE: /^\d{5}(-\d{4})?$/
};

// Default settings
export const DEFAULT_SETTINGS = {
  PAYOUT_RATE_PER_1000: FINANCIAL_CONSTANTS.PAYOUT_RATE_PER_1000,
  PREMIUM_PERCENTAGE: FINANCIAL_CONSTANTS.PREMIUM_PERCENTAGE,
  MINIMUM_WITHDRAWAL: FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL,
  LOCK_PERIOD_DAYS: FINANCIAL_CONSTANTS.LOCK_PERIOD_DAYS,
  SCAN_FREQUENCY: FINANCIAL_CONSTANTS.SCAN_FREQUENCY,
  TAX_RATE: FINANCIAL_CONSTANTS.TAX_RATE,
  TIMEZONE: 'UTC',
  CURRENCY: 'USD',
  LANGUAGE: 'en',
  DATE_FORMAT: DATE_FORMATS.MEDIUM,
  ITEMS_PER_PAGE: 10,
  AUTO_REFRESH: true,
  NOTIFICATIONS_ENABLED: true,
  EMAIL_NOTIFICATIONS: true
};

// Local storage keys
export const LOCAL_STORAGE_KEYS = {
  THEME: 'evernet-theme',
  LANGUAGE: 'evernet-language',
  SIDEBAR_COLLAPSED: 'evernet-sidebar-collapsed',
  TABLE_PREFERENCES: 'evernet-table-preferences',
  FILTERS: 'evernet-filters'
};

// Animation durations
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000
};

// Chart colors
export const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1'  // Indigo
];

// Export these for use in other files
export default {
  APP_NAME,
  USER_ROLES,
  FINANCIAL_CONSTANTS,
  COLORS,
  BREAKPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  DEFAULT_SETTINGS,
  CHART_COLORS
};
