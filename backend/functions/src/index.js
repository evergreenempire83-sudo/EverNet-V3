const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');

// Initialize Firebase Admin
admin.initializeApp();

// Import modules
const youtubeScanner = require('./scanners/youtubeScanner');
const reportGenerator = require('./generators/monthlyReports');
const notificationDispatcher = require('./generators/notifications');

// HTTP Functions
exports.api = onRequest({
  timeoutSeconds: 60,
  memory: '1GiB',
  cors: true,
}, require('./api'));

// Scheduled Functions
exports.runHourlyScanner = onSchedule('0 * * * *', async () => {
  console.log('Running hourly scanner...');
  await youtubeScanner.scanAllActiveVideos();
});

exports.generateMonthlyReports = onSchedule('0 0 1 * *', async () => {
  console.log('Generating monthly reports...');
  await reportGenerator.generateMonthlyReports();
});

exports.unlockExpiredReports = onSchedule('0 0 * * *', async () => {
  console.log('Checking for expired reports to unlock...');
  await reportGenerator.unlockExpiredReports();
});

// Firestore Triggers
exports.onUserCreate = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snapshot, context) => {
    const userData = snapshot.data();
    const userId = context.params.userId;
    
    // Initialize user stats
    await admin.firestore().collection('users').doc(userId).update({
      totalEarnings: 0,
      lockedBalance: 0,
      availableBalance: 0,
      totalWithdrawn: 0,
      lastReportDate: null,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`User ${userId} initialized`);
  });

exports.onWithdrawalUpdate = functions.firestore
  .document('withdrawal_requests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const requestId = context.params.requestId;
    
    // If status changed to approved
    if (before.status !== 'approved' && after.status === 'approved') {
      const creatorId = after.creatorId;
      const amount = after.amount;
      
      // Update creator's balance
      const creatorRef = admin.firestore().collection('users').doc(creatorId);
      await creatorRef.update({
        availableBalance: admin.firestore.FieldValue.increment(-amount),
        totalWithdrawn: admin.firestore.FieldValue.increment(amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Withdrawal ${requestId} approved, creator ${creatorId} updated`);
    }
  });
