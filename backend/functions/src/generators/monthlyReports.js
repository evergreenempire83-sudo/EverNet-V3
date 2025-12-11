const admin = require('firebase-admin');
const { calculatePremiumViews, calculateEarnings, calculateLockEndDate } = require('../utils/calculations');
const logger = require('../utils/logger');

const db = admin.firestore();

class MonthlyReportGenerator {
  constructor() {
    this.reportsCollection = 'monthly_reports';
    this.usersCollection = 'users';
    this.videosCollection = 'scanned_videos';
    this.settingsCollection = 'settings';
  }

  /**
   * Generate monthly reports for all creators
   */
  async generateMonthlyReports() {
    try {
      logger.info('Starting monthly report generation...');
      
      // Get current month and year
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed
      
      // Calculate previous month (we generate reports for previous month)
      const reportYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const reportMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      
      const monthString = `${reportYear}-${String(reportMonth + 1).padStart(2, '0')}`;
      
      logger.info(`Generating reports for ${monthString}`);
      
      // Get platform settings
      const settingsDoc = await db.collection(this.settingsCollection).doc('app_settings').get();
      const settings = settingsDoc.data();
      
      if (!settings) {
        throw new Error('Platform settings not found');
      }
      
      // Get all creators
      const creatorsSnapshot = await db.collection(this.usersCollection)
        .where('role', '==', 'creator')
        .get();
      
      if (creatorsSnapshot.empty) {
        logger.info('No creators found for report generation');
        return { generated: 0 };
      }
      
      const results = {
        totalCreators: creatorsSnapshot.size,
        reportsGenerated: 0,
        reportsSkipped: 0,
        totalEarnings: 0
      };
      
      // Generate report for each creator
      for (const creatorDoc of creatorsSnapshot.docs) {
        const creator = creatorDoc.data();
        const creatorId = creatorDoc.id;
        
        try {
          const reportGenerated = await this.generateCreatorReport(
            creatorId, 
            reportYear, 
            reportMonth, 
            settings
          );
          
          if (reportGenerated) {
            results.reportsGenerated++;
            results.totalEarnings += reportGenerated.payoutAmount || 0;
          } else {
            results.reportsSkipped++;
          }
          
        } catch (error) {
          logger.error(`Failed to generate report for creator ${creatorId}:`, error);
          results.reportsSkipped++;
        }
      }
      
      logger.info(`Monthly reports generated: ${results.reportsGenerated} successful, ${results.reportsSkipped} skipped`);
      logger.info(`Total earnings: $${results.totalEarnings.toFixed(2)}`);
      
      // Update platform stats
      await this.updatePlatformStats();
      
      return results;
      
    } catch (error) {
      logger.error('Error generating monthly reports:', error);
      throw error;
    }
  }

  /**
   * Generate report for a single creator
   */
  async generateCreatorReport(creatorId, year, month, settings) {
    // Check if report already exists
    const reportId = `${creatorId}_${year}_${String(month + 1).padStart(2, '0')}`;
    const existingReport = await db.collection(this.reportsCollection).doc(reportId).get();
    
    if (existingReport.exists) {
      logger.info(`Report ${reportId} already exists, skipping...`);
      return null;
    }
    
    // Calculate period dates
    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0, 23, 59, 59);
    
    // Get creator's videos for the month
    const videosSnapshot = await db.collection(this.videosCollection)
      .where('creatorId', '==', creatorId)
      .where('isActive', '==', true)
      .get();
    
    if (videosSnapshot.empty) {
      logger.info(`No active videos found for creator ${creatorId}`);
      return null;
    }
    
    const videos = [];
    let totalViews = 0;
    let totalPremiumViews = 0;
    let totalEarnings = 0;
    
    // Process each video
    for (const videoDoc of videosSnapshot.docs) {
      const video = videoDoc.data();
      
      // Reset monthly stats for new month
      const monthlyViews = video.currentMonthViews || 0;
      const monthlyPremiumViews = video.currentMonthPremiumViews || 0;
      const monthlyEarnings = video.currentMonthEarnings || 0;
      
      if (monthlyViews > 0) {
        videos.push({
          videoId: video.videoId,
          views: monthlyViews,
          premiumViews: monthlyPremiumViews,
          earnings: monthlyEarnings
        });
        
        totalViews += monthlyViews;
        totalPremiumViews += monthlyPremiumViews;
        totalEarnings += monthlyEarnings;
      }
      
      // Reset video's monthly stats
      await videoDoc.ref.update({
        currentMonthViews: 0,
        currentMonthPremiumViews: 0,
        currentMonthEarnings: 0,
        updatedAt: new Date()
      });
    }
    
    // Skip if no earnings for the month
    if (totalEarnings === 0) {
      logger.info(`No earnings for creator ${creatorId} in ${year}-${month + 1}`);
      return null;
    }
    
    // Calculate premium percentage
    const premiumPercentage = totalViews > 0 ? (totalPremiumViews / totalViews) * 100 : 0;
    
    // Create report
    const reportData = {
      reportId,
      creatorId,
      month: `${year}-${String(month + 1).padStart(2, '0')}`,
      periodStart,
      periodEnd,
      totalViews,
      premiumViews: totalPremiumViews,
      premiumPercentage: parseFloat(premiumPercentage.toFixed(2)),
      payoutAmount: parseFloat(totalEarnings.toFixed(2)),
      status: 'locked',
      lockedUntil: calculateLockEndDate(new Date(), settings.lockPeriodDays),
      unlockedAt: null,
      unlockedBy: null,
      videos,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save report
    await db.collection(this.reportsCollection).doc(reportId).set(reportData);
    
    // Update creator's locked balance
    const creatorRef = db.collection(this.usersCollection).doc(creatorId);
    await creatorRef.update({
      lockedBalance: admin.firestore.FieldValue.increment(totalEarnings),
      lastReportDate: new Date(),
      updatedAt: new Date()
    });
    
    logger.info(`Report generated for creator ${creatorId}: $${totalEarnings.toFixed(2)}`);
    
    return reportData;
  }

  /**
   * Unlock expired reports (past 90-day lock period)
   */
  async unlockExpiredReports() {
    try {
      logger.info('Checking for expired reports to unlock...');
      
      const now = new Date();
      const expiredReports = await db.collection(this.reportsCollection)
        .where('status', '==', 'locked')
        .where('lockedUntil', '<=', now)
        .get();
      
      if (expiredReports.empty) {
        logger.info('No expired reports found');
        return { unlocked: 0 };
      }
      
      const results = {
        total: expiredReports.size,
        unlocked: 0,
        totalAmount: 0
      };
      
      for (const reportDoc of expiredReports.docs) {
        try {
          const unlocked = await this.unlockReport(reportDoc.id, 'system');
          if (unlocked) {
            results.unlocked++;
            results.totalAmount += unlocked.amount || 0;
          }
        } catch (error) {
          logger.error(`Failed to unlock report ${reportDoc.id}:`, error);
        }
      }
      
      logger.info(`Unlocked ${results.unlocked} reports, total: $${results.totalAmount.toFixed(2)}`);
      return results;
      
    } catch (error) {
      logger.error('Error unlocking expired reports:', error);
      throw error;
    }
  }

  /**
   * Unlock a specific report (admin action)
   */
  async unlockReport(reportId, adminId) {
    try {
      logger.info(`Unlocking report ${reportId}...`);
      
      const reportRef = db.collection(this.reportsCollection).doc(reportId);
      const reportDoc = await reportRef.get();
      
      if (!reportDoc.exists) {
        throw new Error(`Report ${reportId} not found`);
      }
      
      const report = reportDoc.data();
      
      if (report.status !== 'locked') {
        throw new Error(`Report ${reportId} is not locked (status: ${report.status})`);
      }
      
      if (new Date() < report.lockedUntil) {
        throw new Error(`Report ${reportId} is still locked until ${report.lockedUntil}`);
      }
      
      const unlockAmount = report.payoutAmount;
      
      // Update report status
      await reportRef.update({
        status: 'unlocked',
        unlockedAt: new Date(),
        unlockedBy: adminId,
        updatedAt: new Date()
      });
      
      // Update creator balance (move from locked to available)
      const creatorRef = db.collection(this.usersCollection).doc(report.creatorId);
      await creatorRef.update({
        lockedBalance: admin.firestore.FieldValue.increment(-unlockAmount),
        availableBalance: admin.firestore.FieldValue.increment(unlockAmount),
        updatedAt: new Date()
      });
      
      // Update platform stats
      await this.updatePlatformStats();
      
      // Create notification for creator
      await this.createUnlockNotification(report.creatorId, report);
      
      // Log the action
      await db.collection('audit_logs').add({
        action: 'report_unlocked',
        userId: adminId,
        targetId: reportId,
        entityType: 'report',
        changes: {
          before: { status: 'locked' },
          after: { status: 'unlocked', unlockedAt: new Date(), unlockedBy: adminId }
        },
        timestamp: new Date(),
        ipAddress: 'system',
        userAgent: 'admin',
        details: `Report ${reportId} unlocked, $${unlockAmount.toFixed(2)} moved to available balance`
      });
      
      logger.info(`Report ${reportId} unlocked successfully: $${unlockAmount.toFixed(2)}`);
      
      return {
        success: true,
        reportId,
        amount: unlockAmount,
        creatorId: report.creatorId
      };
      
    } catch (error) {
      logger.error(`Error unlocking report ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Create notification for unlocked report
   */
  async createUnlockNotification(creatorId, report) {
    try {
      const notificationId = `NOTIF_${Date.now()}`;
      const settingsDoc = await db.collection(this.settingsCollection).doc('app_settings').get();
      const settings = settingsDoc.data();
      
      const message = settings.notificationMessages.reportUnlocked
        .replace('{month}', report.month)
        .replace('{amount}', `$${report.payoutAmount.toFixed(2)}`);
      
      await db.collection('notifications').doc(notificationId).set({
        notificationId,
        title: 'Earnings Unlocked!',
        message,
        category: 'payment',
        priority: 'high',
        createdBy: 'system',
        createdAt: new Date(),
        scheduledFor: new Date(),
        isActive: true,
        isPinned: true,
        targetAudience: 'specific_creators',
        targetCreatorIds: [creatorId],
        excludeCreatorIds: [],
        analytics: {
          totalCreators: 1,
          delivered: 0,
          seen: 0,
          opened: 0,
          engaged: 0,
          deliveryRate: 0,
          openRate: 0,
          engagementRate: 0
        },
        cta: {
          enabled: true,
          buttonText: 'View Earnings',
          actionType: 'link',
          actionValue: '/creator/earnings'
        },
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        autoUnpinAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      
      logger.info(`Notification created for unlocked report to creator ${creatorId}`);
      
    } catch (error) {
      logger.error('Error creating unlock notification:', error);
    }
  }

  /**
   * Update platform stats
   */
  async updatePlatformStats() {
    try {
      // Get all creators for stats
      const creatorsSnapshot = await db.collection(this.usersCollection)
        .where('role', '==', 'creator')
        .get();
      
      let totalLocked = 0;
      let totalAvailable = 0;
      let totalWithdrawn = 0;
      let totalEarnings = 0;
      
      creatorsSnapshot.forEach(doc => {
        const creator = doc.data();
        totalLocked += creator.lockedBalance || 0;
        totalAvailable += creator.availableBalance || 0;
        totalWithdrawn += creator.totalWithdrawn || 0;
        totalEarnings += creator.totalEarnings || 0;
      });
      
      // Get pending withdrawals
      const withdrawalsSnapshot = await db.collection('withdrawal_requests')
        .where('status', '==', 'pending')
        .get();
      
      // Get creators with locked reports from this month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const reportsSnapshot = await db.collection(this.reportsCollection)
        .where('month', '==', currentMonth)
        .where('status', '==', 'locked')
        .get();
      
      const creatorsWithNewReports = new Set();
      reportsSnapshot.forEach(doc => {
        creatorsWithNewReports.add(doc.data().creatorId);
      });
      
      // Update stats
      await db.collection('platform_stats').doc('current').update({
        totalEarnings,
        totalLocked,
        totalAvailable,
        totalWithdrawn,
        pendingWithdrawals: withdrawalsSnapshot.size,
        creatorsWithNewReports: creatorsWithNewReports.size,
        totalActiveCreators: creatorsSnapshot.size,
        lastUpdated: new Date()
      });
      
    } catch (error) {
      logger.error('Error updating platform stats:', error);
    }
  }

  /**
   * Get report statistics
   */
  async getReportStats(timeRange = 'all') {
    try {
      let query = db.collection(this.reportsCollection);
      
      // Apply time filter if needed
      if (timeRange !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (timeRange) {
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(0); // All time
        }
        
        query = query.where('createdAt', '>=', startDate);
      }
      
      const snapshot = await query.get();
      
      let totalReports = 0;
      let lockedReports = 0;
      let unlockedReports = 0;
      let totalPayouts = 0;
      let totalViews = 0;
      
      snapshot.forEach(doc => {
        const report = doc.data();
        totalReports++;
        totalPayouts += report.payoutAmount || 0;
        totalViews += report.totalViews || 0;
        
        if (report.status === 'locked') {
          lockedReports++;
        } else if (report.status === 'unlocked') {
          unlockedReports++;
        }
      });
      
      return {
        timeRange,
        totalReports,
        lockedReports,
        unlockedReports,
        lockedPercentage: totalReports > 0 ? (lockedReports / totalReports) * 100 : 0,
        totalPayouts,
        totalViews,
        averagePayout: totalReports > 0 ? totalPayouts / totalReports : 0
      };
      
    } catch (error) {
      logger.error('Error getting report stats:', error);
      throw error;
    }
  }
}

module.exports = new MonthlyReportGenerator();
