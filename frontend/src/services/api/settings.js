import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Get app settings
export const getAppSettings = async () => {
  try {
    const settingsRef = doc(db, 'settings', 'app_settings');
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      return settingsDoc.data();
    } else {
      // Create default settings if they don't exist
      const defaultSettings = getDefaultSettings();
      await setDoc(settingsRef, defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    console.error('Error getting app settings:', error);
    // Return default settings if error
    return getDefaultSettings();
  }
};

// Update app settings
export const updateAppSettings = async (settings) => {
  try {
    const settingsRef = doc(db, 'settings', 'app_settings');
    await updateDoc(settingsRef, {
      ...settings,
      updatedAt: new Date(),
      updatedBy: 'admin' // In real app, pass current user ID
    });
    return true;
  } catch (error) {
    console.error('Error updating app settings:', error);
    throw error;
  }
};

// Get default settings
const getDefaultSettings = () => ({
  id: 'app_settings',
  // Financial
  payoutRatePer1000: 0.30,
  premiumPercentage: 7,
  minimumWithdrawal: 50.00,
  lockPeriodDays: 90,
  taxRate: 0.15,
  
  // Scanning
  scanFrequency: 'daily',
  scanBatchSize: 100,
  maxRetries: 3,
  
  // Notifications
  enableEmailNotifications: true,
  enablePushNotifications: true,
  
  // Security
  maxLoginAttempts: 5,
  sessionTimeoutMinutes: 60,
  
  // Messages
  notificationMessages: {
    report_generated: 'Your monthly report for {month} has been generated. Amount: ${amount}',
    withdrawal_approved: 'Your withdrawal of ${amount} has been approved and processed',
    withdrawal_rejected: 'Your withdrawal of ${amount} was rejected. Reason: {reason}',
    account_suspended: 'Your account has been suspended. Contact support for details.',
    welcome: 'Welcome to Evernet Music! Start by adding your YouTube videos.'
  },
  
  // YouTube API
  youtubeApiKey: 'AIzaSyASLlsaMOnRfcwFt_9FrBBfsAGFXgJAsOs',
  youtubeQuotaLimit: 10000,
  
  // Email Templates
  emailTemplates: {
    subject_report: 'Your Evernet Music Monthly Report - {month}',
    subject_withdrawal: 'Withdrawal Update - Evernet Music',
    subject_welcome: 'Welcome to Evernet Music!',
    subject_password_reset: 'Reset Your Evernet Music Password'
  },
  
  updatedAt: new Date(),
  updatedBy: 'system'
});

// Get platform stats
export const getPlatformStats = async () => {
  try {
    const statsRef = doc(db, 'platform_stats', 'current_stats');
    const statsDoc = await getDoc(statsRef);
    
    if (statsDoc.exists()) {
      return statsDoc.data();
    } else {
      // Create default stats if they don't exist
      const defaultStats = getDefaultPlatformStats();
      await setDoc(statsRef, defaultStats);
      return defaultStats;
    }
  } catch (error) {
    console.error('Error getting platform stats:', error);
    return getDefaultPlatformStats();
  }
};

// Update platform stats
export const updatePlatformStats = async (stats) => {
  try {
    const statsRef = doc(db, 'platform_stats', 'current_stats');
    await updateDoc(statsRef, {
      ...stats,
      lastUpdated: new Date(),
      updatedBy: 'system'
    });
    return true;
  } catch (error) {
    console.error('Error updating platform stats:', error);
    throw error;
  }
};

const getDefaultPlatformStats = () => ({
  id: 'current_stats',
  totalEarnings: 0,
  totalLocked: 0,
  totalAvailable: 0,
  totalWithdrawn: 0,
  pendingWithdrawals: 0,
  pendingWithdrawalsAmount: 0,
  creatorsWithNewReports: 0,
  totalActiveCreators: 0,
  totalSuspendedCreators: 0,
  totalVideos: 0,
  totalViews: 0,
  totalPremiumViews: 0,
  thisMonthEarnings: 0,
  lastMonthEarnings: 0,
  averageEarningsPerCreator: 0,
  lastUpdated: new Date(),
  updatedBy: 'system'
});
