const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Generate monthly reports on 1st of every month
exports.generateMonthlyReports = functions.pubsub
  .schedule('0 0 1 * *') // 00:00 on 1st of month
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('Starting monthly report generation...');
      
      // Get previous month (YYYY-MM format)
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-indexed
      
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const reportMonth = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
      
      // Get all creators
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('role', '==', 'creator')
        .where('status', '==', 'active')
        .get();
      
      if (usersSnapshot.empty) {
        console.log('No active creators found');
        return null;
      }
      
      const batch = admin.firestore().batch();
      const reportsGenerated = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const creatorId = userDoc.id;
        const userData = userDoc.data();
        
        // Get creator's videos for the month
        const videosSnapshot = await admin.firestore()
          .collection('scanned_videos')
          .where('creatorId', '==', creatorId)
          .where('isActive', '==', true)
          .get();
        
        // Calculate monthly earnings from videos
        let totalViews = 0;
        let totalPremiumViews = 0;
        let totalEarnings = 0;
        const videoBreakdown = [];
        
        for (const videoDoc of videosSnapshot.docs) {
          const videoData = videoDoc.data();
          const monthEarnings = videoData.currentMonthEarnings || 0;
          
          if (monthEarnings > 0) {
            totalViews += videoData.totalEverNetViews || 0;
            totalPremiumViews += videoData.totalPremiumViews || 0;
            totalEarnings += monthEarnings;
            
            videoBreakdown.push({
              videoId: videoData.videoId,
              title: videoData.title,
              views: videoData.totalEverNetViews || 0,
              premiumViews: videoData.totalPremiumViews || 0,
              earnings: monthEarnings
            });
            
            // Reset current month earnings for next month
            const videoRef = admin.firestore()
              .collection('scanned_videos')
              .doc(videoDoc.id);
            
            batch.update(videoRef, {
              currentMonthEarnings: 0,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
        
        if (totalEarnings > 0) {
          // Create monthly report
          const reportId = `${creatorId}_${reportMonth}`;
          const reportRef = admin.firestore()
            .collection('monthly_reports')
            .doc(reportId);
          
          // Calculate lock period (90 days from now)
          const lockedUntil = new Date();
          lockedUntil.setDate(lockedUntil.getDate() + 90);
          
          batch.set(reportRef, {
            reportId,
            creatorId,
            month: reportMonth,
            payoutAmount: totalEarnings,
            status: 'locked',
            lockedUntil: admin.firestore.Timestamp.fromDate(lockedUntil),
            unlockedAt: null,
            unlockedBy: null,
            videos: videoBreakdown,
            totalViews,
            totalPremiumViews,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // Update creator's locked balance
          const userRef = admin.firestore().collection('users').doc(creatorId);
          batch.update(userRef, {
            lockedBalance: admin.firestore.FieldValue.increment(totalEarnings),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          reportsGenerated.push({
            creatorId,
            reportMonth,
            amount: totalEarnings
          });
        }
      }
      
      // Commit all changes
      await batch.commit();
      
      // Send notifications for generated reports
      await sendReportNotifications(reportsGenerated);
      
      console.log(`Monthly reports generated: ${reportsGenerated.length} reports`);
      return null;
    } catch (error) {
      console.error('Error generating monthly reports:', error);
      throw error;
    }
  });

// Send notifications for generated reports
async function sendReportNotifications(reports) {
  try {
    for (const report of reports) {
      const notificationRef = admin.firestore().collection('notifications').doc();
      await notificationRef.set({
        notificationId: notificationRef.id,
        title: 'Monthly Report Generated',
        message: `Your monthly report for ${report.reportMonth} has been generated. Amount: $${report.amount.toFixed(2)}`,
        category: 'report',
        type: 'targeted',
        targetAudience: 'specific_creators',
        creatorIds: [report.creatorId],
        priority: 'normal',
        createdBy: 'system',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        metadata: {
          reportMonth: report.reportMonth,
          amount: report.amount
        }
      });
    }
  } catch (error) {
    console.error('Error sending report notifications:', error);
  }
              }
