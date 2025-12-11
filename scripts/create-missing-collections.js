const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAF3tkafh0Tq13G3of8SUaWQDvPFohxcE4",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "evernetmusic.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "evernetmusic",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "evernetmusic.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1061505207436",
  appId: process.env.FIREBASE_APP_ID || "1:1061505207436:web:5ff254924dabd1adefffa9",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-S8BZEVZSTL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createMissingCollections() {
  console.log('🚀 Creating missing Firebase collections...\n');
  
  const collections = [
    {
      name: 'fraud_violations',
      id: 'sample_violation',
      data: {
        violationId: 'sample_violation',
        creatorId: 'sample_creator_id',
        videoId: 'sample_video_id',
        type: 'low_volume',
        severity: 'low',
        status: 'pending',
        detectedAt: serverTimestamp(),
        reviewedBy: null,
        reviewedAt: null,
        actionTaken: 'warning',
        notes: 'Sample violation for testing',
        evidence: [],
        resolvedAt: null
      }
    },
    {
      name: 'platform_stats',
      id: 'current_stats',
      data: {
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
        lastUpdated: serverTimestamp(),
        updatedBy: 'system'
      }
    },
    {
      name: 'settings',
      id: 'app_settings',
      data: {
        id: 'app_settings',
        payoutRatePer1000: 0.30,
        premiumPercentage: 7,
        minimumWithdrawal: 50.00,
        lockPeriodDays: 90,
        taxRate: 0.15,
        scanFrequency: 'daily',
        scanBatchSize: 100,
        maxRetries: 3,
        enableEmailNotifications: true,
        enablePushNotifications: true,
        maxLoginAttempts: 5,
        sessionTimeoutMinutes: 60,
        notificationMessages: {
          report_generated: 'Your monthly report for {month} has been generated. Amount: ${amount}',
          withdrawal_approved: 'Your withdrawal of ${amount} has been approved and processed',
          withdrawal_rejected: 'Your withdrawal of ${amount} was rejected. Reason: {reason}',
          account_suspended: 'Your account has been suspended. Contact support for details.',
          welcome: 'Welcome to Evernet Music! Start by adding your YouTube videos.'
        },
        youtubeApiKey: 'AIzaSyASLlsaMOnRfcwFt_9FrBBfsAGFXgJAsOs',
        youtubeQuotaLimit: 10000,
        emailTemplates: {
          subject_report: 'Your Evernet Music Monthly Report - {month}',
          subject_withdrawal: 'Withdrawal Update - Evernet Music',
          subject_welcome: 'Welcome to Evernet Music!',
          subject_password_reset: 'Reset Your Evernet Music Password'
        },
        updatedAt: serverTimestamp(),
        updatedBy: 'system'
      }
    },
    {
      name: 'notifications',
      id: 'sample_notification',
      data: {
        notificationId: 'sample_notification',
        title: 'Welcome to Evernet Music!',
        message: 'Your account has been created successfully. Start by adding your YouTube videos.',
        category: 'system',
        type: 'broadcast',
        targetAudience: 'all_creators',
        creatorIds: [],
        priority: 'normal',
        createdBy: 'system',
        createdAt: serverTimestamp(),
        scheduledFor: null,
        sentAt: serverTimestamp(),
        status: 'sent',
        metadata: {}
      }
    },
    {
      name: 'creator_notifications',
      id: 'sample_creator_sample_notification',
      data: {
        id: 'sample_creator_sample_notification',
        creatorId: 'sample_creator_id',
        notificationId: 'sample_notification',
        title: 'Welcome to Evernet Music!',
        message: 'Your account has been created successfully.',
        category: 'system',
        priority: 'normal',
        deliveredAt: serverTimestamp(),
        seenAt: null,
        openedAt: null,
        clickedAt: null,
        isRead: false,
        isArchived: false,
        actionTaken: 'none'
      }
    },
    {
      name: 'notification_analytics',
      id: 'sample_analytics',
      data: {
        id: 'sample_notification_sample_creator_timestamp',
        notificationId: 'sample_notification',
        creatorId: 'sample_creator_id',
        action: 'delivered',
        timestamp: serverTimestamp(),
        deviceInfo: {
          platform: 'web',
          browser: 'Chrome',
          os: 'Windows'
        },
        location: {
          country: 'US',
          city: 'New York',
          timezone: 'America/New_York'
        },
        sessionId: 'sample_session_id'
      }
    }
  ];

  for (const collection of collections) {
    try {
      const docRef = doc(db, collection.name, collection.id);
      await setDoc(docRef, collection.data);
      console.log(`✅ ${collection.name} collection created`);
    } catch (error) {
      console.log(`ℹ️ ${collection.name} collection might already exist:`, error.message);
    }
  }
  
  console.log('\n🎉 All collections have been created or already exist!');
  process.exit(0);
}

createMissingCollections().catch(console.error);
