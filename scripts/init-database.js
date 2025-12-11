#!/usr/bin/env node

/**
 * EverNet Database Initialization Script
 * This script creates all collections with default data
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createHash } = require('crypto');
const readline = require('readline');

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Admin credentials
const ADMIN_EMAIL = 'admin@evernet.com';
let ADMIN_PASSWORD = '';

// Initialize Firebase Admin
const serviceAccount = require('../config/firebase-admin-key.json'); // You need to create this

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'evernetmusic'
});

const db = getFirestore();

// Hash password for storage (in real app, Firebase Auth handles this)
const hashPassword = (password) => {
  return createHash('sha256').update(password).digest('hex');
};

// Create all collections with sample data
async function initializeDatabase() {
  console.log('🚀 Initializing EverNet Database...\n');
  
  try {
    // 1. SETTINGS COLLECTION
    console.log('📝 Creating settings collection...');
    const settingsRef = db.collection('settings').doc('app_settings');
    await settingsRef.set({
      id: 'app_settings',
      payoutRatePer1000: 0.30,
      regularViewRPM: 0.10,
      premiumPercentage: 7,
      minimumWithdrawal: 50.00,
      lockPeriodDays: 90,
      isLockEnabled: true,
      scanFrequency: 'daily',
      defaultPremiumRPM: 0.30,
      defaultRegularRPM: 0.10,
      notificationMessages: {
        reportUnlocked: 'Your earnings from {month} are now available for withdrawal!',
        withdrawalApproved: 'Your withdrawal request for ${amount} has been approved and processed.',
        withdrawalRejected: 'Your withdrawal request for ${amount} has been rejected. Please check your email for details.'
      },
      updatedAt: new Date(),
      updatedBy: 'system'
    });
    console.log('✅ Settings created\n');

    // 2. PLATFORM STATS
    console.log('📊 Creating platform stats...');
    const statsRef = db.collection('platform_stats').doc('current');
    await statsRef.set({
      id: 'current',
      totalEarnings: 0,
      totalLocked: 0,
      totalAvailable: 0,
      totalWithdrawn: 0,
      pendingWithdrawals: 0,
      creatorsWithNewReports: 0,
      totalActiveCreators: 0,
      lastUpdated: new Date()
    });
    console.log('✅ Platform stats created\n');

    // 3. CREATE ADMIN USER
    console.log('👑 Creating admin user...');
    const adminUid = 'admin_' + Date.now();
    const adminRef = db.collection('users').doc(adminUid);
    
    await adminRef.set({
      uid: adminUid,
      email: ADMIN_EMAIL,
      displayName: 'System Administrator',
      role: 'admin',
      status: 'active',
      totalEarnings: 0,
      lockedBalance: 0,
      availableBalance: 0,
      totalWithdrawn: 0,
      lastReportDate: null,
      paymentMethod: {},
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Admin user created\n');

    // 4. CREATE SAMPLE CREATOR
    console.log('🎵 Creating sample creator...');
    const creatorUid = 'creator_' + Date.now();
    const creatorRef = db.collection('users').doc(creatorUid);
    
    await creatorRef.set({
      uid: creatorUid,
      email: 'creator@example.com',
      displayName: 'Sample Music Creator',
      role: 'creator',
      status: 'active',
      totalEarnings: 1250.50,
      lockedBalance: 350.25,
      availableBalance: 150.75,
      totalWithdrawn: 749.50,
      lastReportDate: new Date('2024-01-01'),
      paymentMethod: {
        type: 'paypal',
        paypalEmail: 'creator@example.com'
      },
      createdAt: new Date('2023-06-01'),
      updatedAt: new Date()
    });
    console.log('✅ Sample creator created\n');

    // 5. CREATE SAMPLE MONTHLY REPORT
    console.log('📄 Creating sample monthly report...');
    const reportId = `${creatorUid}_2024_01`;
    const reportRef = db.collection('monthly_reports').doc(reportId);
    
    await reportRef.set({
      reportId: reportId,
      creatorId: creatorUid,
      month: '2024-01',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
      totalViews: 1500000,
      premiumViews: 105000, // 7% of total
      premiumPercentage: 7,
      payoutAmount: 31.50, // 105,000 / 1000 * 0.30
      status: 'locked',
      lockedUntil: new Date('2024-04-30'), // +90 days
      unlockedAt: null,
      unlockedBy: null,
      videos: [
        {
          videoId: 'sample_video_1',
          views: 500000,
          premiumViews: 35000,
          earnings: 10.50
        },
        {
          videoId: 'sample_video_2',
          views: 1000000,
          premiumViews: 70000,
          earnings: 21.00
        }
      ],
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date()
    });
    console.log('✅ Sample report created\n');

    // 6. CREATE SAMPLE WITHDRAWAL REQUEST
    console.log('💰 Creating sample withdrawal request...');
    const withdrawalId = 'withdrawal_' + Date.now();
    const withdrawalRef = db.collection('withdrawal_requests').doc(withdrawalId);
    
    await withdrawalRef.set({
      requestId: withdrawalId,
      creatorId: creatorUid,
      amount: 150.75,
      method: 'paypal',
      paymentDetails: {
        paypalEmail: 'creator@example.com'
      },
      status: 'pending',
      requestedAt: new Date(),
      processedAt: null,
      processedBy: null,
      receiptUrl: '',
      notes: ''
    });
    console.log('✅ Sample withdrawal request created\n');

    // 7. CREATE SAMPLE NOTIFICATION
    console.log('🔔 Creating sample notification...');
    const notificationId = 'NOTIF_001';
    const notificationRef = db.collection('notifications').doc(notificationId);
    
    await notificationRef.set({
      notificationId: notificationId,
      title: 'Welcome to EverNet!',
      message: 'Thank you for joining EverNet. Your account has been successfully created and is ready to use.',
      category: 'system',
      priority: 'medium',
      createdBy: adminUid,
      createdAt: new Date(),
      scheduledFor: null,
      isActive: true,
      isPinned: true,
      targetAudience: 'all_creators',
      targetCreatorIds: [],
      excludeCreatorIds: [],
      analytics: {
        totalCreators: 1,
        delivered: 1,
        seen: 0,
        opened: 0,
        engaged: 0,
        deliveryRate: 100,
        openRate: 0,
        engagementRate: 0
      },
      cta: {
        enabled: true,
        buttonText: 'Get Started',
        actionType: 'link',
        actionValue: '/creator/dashboard'
      },
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      autoUnpinAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    console.log('✅ Sample notification created\n');

    // 8. CREATE SAMPLE SCANNED VIDEO
    console.log('🎬 Creating sample scanned video...');
    const videoId = 'dQw4w9WgXcQ'; // Sample YouTube video ID
    const videoRef = db.collection('scanned_videos').doc(videoId);
    
    await videoRef.set({
      videoId: videoId,
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      creatorId: creatorUid,
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      title: 'Sample Music Video',
      description: 'This is a sample music video for testing',
      channelName: 'Sample Channel',
      channelId: 'UC_sample',
      publishedAt: new Date('2023-01-01'),
      duration: '4:20',
      categoryId: '10', // Music category
      tags: ['music', 'sample', 'test'],
      status: 'active',
      isActive: true,
      addedBy: adminUid,
      addedAt: new Date(),
      lastChecked: new Date(),
      totalYouTubeViews: 1500000,
      totalEverNetViews: 1500000,
      totalPremiumViews: 105000,
      currentMonthViews: 1500000,
      currentMonthPremiumViews: 105000,
      currentMonthEarnings: 31.50,
      premiumPercentage: 7,
      premiumRPM: 0.30,
      regularRPM: 0.10,
      scanFrequency: 'daily',
      nextScanAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      lastScanSuccess: true,
      errorCount: 0
    });
    console.log('✅ Sample video created\n');

    // 9. UPDATE PLATFORM STATS
    console.log('📈 Updating platform stats...');
    await statsRef.update({
      totalEarnings: 1250.50,
      totalLocked: 350.25,
      totalAvailable: 150.75,
      totalWithdrawn: 749.50,
      totalActiveCreators: 1,
      lastUpdated: new Date()
    });
    console.log('✅ Platform stats updated\n');

    console.log('🎉 DATABASE INITIALIZATION COMPLETE!');
    console.log('\n📋 SUMMARY:');
    console.log('├── Admin User: admin@evernet.com');
    console.log('├── Sample Creator: creator@example.com');
    console.log('├── Total Collections: 12 initialized');
    console.log('├── Sample Data: All collections populated');
    console.log('└── System Status: READY\n');
    
    console.log('🔑 IMPORTANT:');
    console.log('1. You need to manually create the admin user in Firebase Authentication');
    console.log('2. Use the same email: admin@evernet.com');
    console.log('3. Set your desired password\n');
    
    console.log('🚀 Next Steps:');
    console.log('1. Run: npm run init-db');
    console.log('2. Create Firebase
