import { 
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

// Get all monthly reports
export const getAllMonthlyReports = async (filters = {}) => {
  try {
    const reportsRef = collection(db, 'monthly_reports');
    let q = query(reportsRef);

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters.month && filters.month !== 'all') {
      q = query(q, where('month', '==', filters.month));
    }

    if (filters.creatorId && filters.creatorId !== 'all') {
      q = query(q, where('creatorId', '==', filters.creatorId));
    }

    // Apply sorting
    if (filters.sortBy) {
      q = query(q, orderBy(filters.sortBy, filters.sortDirection || 'desc'));
    } else {
      q = query(q, orderBy('month', 'desc'));
    }

    const querySnapshot = await getDocs(q);
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: reports };
  } catch (error) {
    console.error('Error fetching monthly reports:', error);
    return { success: false, error: error.message };
  }
};

// Get single report by ID
export const getMonthlyReportById = async (reportId) => {
  try {
    const reportRef = doc(db, 'monthly_reports', reportId);
    const reportDoc = await getDoc(reportRef);

    if (!reportDoc.exists()) {
      return { success: false, error: 'Report not found' };
    }

    return { 
      success: true, 
      data: { id: reportDoc.id, ...reportDoc.data() } 
    };
  } catch (error) {
    console.error('Error fetching monthly report:', error);
    return { success: false, error: error.message };
  }
};

// Unlock a report
export const unlockMonthlyReport = async (reportId, adminId) => {
  try {
    const reportRef = doc(db, 'monthly_reports', reportId);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return { success: false, error: 'Report not found' };
    }

    const report = reportDoc.data();
    
    // Check if report is still locked
    if (report.status !== 'locked') {
      return { success: false, error: 'Report is already unlocked' };
    }

    // Check if lock period has expired
    const now = new Date();
    if (report.lockedUntil && report.lockedUntil.toDate() > now) {
      return { 
        success: false, 
        error: `Report is still locked until ${report.lockedUntil.toDate().toLocaleDateString()}` 
      };
    }

    // Update report status
    await updateDoc(reportRef, {
      status: 'unlocked',
      unlockedAt: serverTimestamp(),
      unlockedBy: adminId
    });

    // Update creator's balance
    const creatorRef = doc(db, 'users', report.creatorId);
    const creatorDoc = await getDoc(creatorRef);
    
    if (creatorDoc.exists()) {
      const creator = creatorDoc.data();
      await updateDoc(creatorRef, {
        lockedBalance: (creator.lockedBalance || 0) - report.payoutAmount,
        availableBalance: (creator.availableBalance || 0) + report.payoutAmount,
        lastReportDate: serverTimestamp()
      });
    }

    // Create audit log
    await addDoc(collection(db, 'audit_logs'), {
      action: 'report_unlocked',
      userId: adminId,
      targetId: reportId,
      changes: {
        before: { status: 'locked' },
        after: { status: 'unlocked' }
      },
      timestamp: serverTimestamp()
    });

    return { 
      success: true, 
      message: 'Report unlocked successfully' 
    };
  } catch (error) {
    console.error('Error unlocking monthly report:', error);
    return { success: false, error: error.message };
  }
};

// Bulk unlock reports
export const bulkUnlockMonthlyReports = async (reportIds, adminId) => {
  try {
    if (!reportIds || reportIds.length === 0) {
      return { success: false, error: 'No reports selected' };
    }

    const batch = writeBatch(db);
    const successIds = [];
    const failedIds = [];

    for (const reportId of reportIds) {
      try {
        const reportRef = doc(db, 'monthly_reports', reportId);
        const reportDoc = await getDoc(reportRef);
        
        if (!reportDoc.exists()) {
          failedIds.push({ id: reportId, error: 'Report not found' });
          continue;
        }

        const report = reportDoc.data();
        
        // Check if report is locked and ready to unlock
        if (report.status !== 'locked') {
          failedIds.push({ id: reportId, error: 'Report already unlocked' });
          continue;
        }

        // Check lock period
        const now = new Date();
        if (report.lockedUntil && report.lockedUntil.toDate() > now) {
          failedIds.push({ 
            id: reportId, 
            error: `Still locked until ${report.lockedUntil.toDate().toLocaleDateString()}` 
          });
          continue;
        }

        // Update report
        batch.update(reportRef, {
          status: 'unlocked',
          unlockedAt: serverTimestamp(),
          unlockedBy: adminId
        });

        successIds.push(reportId);
      } catch (error) {
        failedIds.push({ id: reportId, error: error.message });
      }
    }

    // Execute batch update
    await batch.commit();

    // Update creator balances for successful unlocks
    for (const reportId of successIds) {
      try {
        const reportRef = doc(db, 'monthly_reports', reportId);
        const reportDoc = await getDoc(reportRef);
        const report = reportDoc.data();

        const creatorRef = doc(db, 'users', report.creatorId);
        const creatorDoc = await getDoc(creatorRef);
        
        if (creatorDoc.exists()) {
          const creator = creatorDoc.data();
          await updateDoc(creatorRef, {
            lockedBalance: (creator.lockedBalance || 0) - report.payoutAmount,
            availableBalance: (creator.availableBalance || 0) + report.payoutAmount
          });
        }

        // Create audit log for each successful unlock
        await addDoc(collection(db, 'audit_logs'), {
          action: 'report_unlocked',
          userId: adminId,
          targetId: reportId,
          changes: {
            before: { status: 'locked' },
            after: { status: 'unlocked' }
          },
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error(`Error updating creator balance for report ${reportId}:`, error);
      }
    }

    return { 
      success: true, 
      data: {
        successful: successIds.length,
        failed: failedIds.length,
        details: {
          successIds,
          failedIds
        }
      }
    };
  } catch (error) {
    console.error('Error bulk unlocking monthly reports:', error);
    return { success: false, error: error.message };
  }
};

// Get reports by creator
export const getMonthlyReportsByCreator = async (creatorId, filters = {}) => {
  try {
    const reportsRef = collection(db, 'monthly_reports');
    let q = query(reportsRef, where('creatorId', '==', creatorId));

    if (filters.status && filters.status !== 'all') {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters.month && filters.month !== 'all') {
      q = query(q, where('month', '==', filters.month));
    }

    q = query(q, orderBy('month', 'desc'));

    const querySnapshot = await getDocs(q);
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: reports };
  } catch (error) {
    console.error('Error fetching creator monthly reports:', error);
    return { success: false, error: error.message };
  }
};

// Get reports ready to unlock
export const getReportsReadyToUnlock = async () => {
  try {
    const now = Timestamp.now();
    const reportsRef = collection(db, 'monthly_reports');
    
    const q = query(
      reportsRef,
      where('status', '==', 'locked'),
      where('lockedUntil', '<=', now),
      orderBy('lockedUntil', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: reports };
  } catch (error) {
    console.error('Error fetching reports ready to unlock:', error);
    return { success: false, error: error.message };
  }
};

// Generate monthly report stats
export const getMonthlyReportStats = async () => {
  try {
    const reportsRef = collection(db, 'monthly_reports');
    const q = query(reportsRef);
    const querySnapshot = await getDocs(q);

    let totalReports = 0;
    let lockedReports = 0;
    let unlockedReports = 0;
    let totalLockedAmount = 0;
    let totalUnlockedAmount = 0;
    let readyToUnlock = 0;

    const now = new Date();

    querySnapshot.forEach((doc) => {
      const report = doc.data();
      totalReports++;
      
      if (report.status === 'locked') {
        lockedReports++;
        totalLockedAmount += report.payoutAmount || 0;
        
        // Check if ready to unlock
        if (report.lockedUntil && report.lockedUntil.toDate() <= now) {
          readyToUnlock++;
        }
      } else if (report.status === 'unlocked') {
        unlockedReports++;
        totalUnlockedAmount += report.payoutAmount || 0;
      }
    });

    return {
      success: true,
      data: {
        totalReports,
        lockedReports,
        unlockedReports,
        totalLockedAmount,
        totalUnlockedAmount,
        readyToUnlock,
        averagePayout: totalReports > 0 
          ? (totalLockedAmount + totalUnlockedAmount) / totalReports 
          : 0
      }
    };
  } catch (error) {
    console.error('Error fetching monthly report stats:', error);
    return { success: false, error: error.message };
  }
};

// Generate monthly report
export const generateMonthlyReport = async (creatorId, month) => {
  try {
    // Check if report already exists
    const reportId = `${creatorId}_${month.replace('-', '_')}`;
    const existingReportRef = doc(db, 'monthly_reports', reportId);
    const existingReportDoc = await getDoc(existingReportRef);

    if (existingReportDoc.exists()) {
      return { 
        success: false, 
        error: 'Monthly report already exists for this creator and month' 
      };
    }

    // Get all scanned videos for the creator in the specified month
    const videosRef = collection(db, 'scanned_videos');
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    
    const q = query(
      videosRef,
      where('creatorId', '==', creatorId),
      where('lastScanned', '>=', Timestamp.fromDate(startDate)),
      where('lastScanned', '<=', Timestamp.fromDate(endDate))
    );

    const querySnapshot = await getDocs(q);
    const videos = [];
    let totalViews = 0;
    let totalPremiumViews = 0;
    let totalEarnings = 0;

    querySnapshot.forEach((doc) => {
      const video = doc.data();
      videos.push({
        videoId: video.videoId,
        title: video.title,
        views: video.totalYouTubeViews || 0,
        premiumViews: video.totalPremiumViews || 0,
        earnings: video.currentMonthEarnings || 0,
        premiumPercentage: video.premiumPercentage || 7
      });

      totalViews += video.totalYouTubeViews || 0;
      totalPremiumViews += video.totalPremiumViews || 0;
      totalEarnings += video.currentMonthEarnings || 0;
    });

    // Calculate lock period (90 days from now)
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

    // Create new monthly report
    const newReport = {
      reportId,
      creatorId,
      month,
      payoutAmount: totalEarnings,
      status: 'locked',
      lockedUntil: Timestamp.fromDate(lockedUntil),
      videos,
      totalViews,
      totalPremiumViews,
      createdAt: serverTimestamp()
    };

    await setDoc(existingReportRef, newReport);

    // Update creator's locked balance
    const creatorRef = doc(db, 'users', creatorId);
    const creatorDoc = await getDoc(creatorRef);
    
    if (creatorDoc.exists()) {
      const creator = creatorDoc.data();
      await updateDoc(creatorRef, {
        lockedBalance: (creator.lockedBalance || 0) + totalEarnings,
        totalEarnings: (creator.totalEarnings || 0) + totalEarnings,
        lastReportDate: serverTimestamp()
      });
    }

    // Create audit log
    await addDoc(collection(db, 'audit_logs'), {
      action: 'monthly_report_generated',
      userId: 'system',
      targetId: reportId,
      changes: {
        before: null,
        after: newReport
      },
      timestamp: serverTimestamp()
    });

    return { 
      success: true, 
      data: newReport,
      message: 'Monthly report generated successfully'
    };
  } catch (error) {
    console.error('Error generating monthly report:', error);
    return { success: false, error: error.message };
  }
};

// Get report breakdown by month
export const getReportsByMonth = async (year, month) => {
  try {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const reportsRef = collection(db, 'monthly_reports');
    
    const q = query(
      reportsRef,
      where('month', '==', monthStr),
      orderBy('payoutAmount', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: reports };
  } catch (error) {
    console.error('Error fetching reports by month:', error);
    return { success: false, error: error.message };
  }
};

// Get reports summary for dashboard
export const getReportsSummary = async () => {
  try {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString().slice(0, 7);

    const reportsRef = collection(db, 'monthly_reports');
    
    // Get current month reports
    const currentMonthQ = query(
      reportsRef,
      where('month', '==', currentMonth)
    );
    
    // Get last month reports
    const lastMonthQ = query(
      reportsRef,
      where('month', '==', lastMonth)
    );

    const [currentMonthSnapshot, lastMonthSnapshot] = await Promise.all([
      getDocs(currentMonthQ),
      getDocs(lastMonthQ)
    ]);

    const currentMonthReports = [];
    const lastMonthReports = [];

    currentMonthSnapshot.forEach((doc) => {
      currentMonthReports.push(doc.data());
    });

    lastMonthSnapshot.forEach((doc) => {
      lastMonthReports.push(doc.data());
    });

    const currentMonthTotal = currentMonthReports.reduce((sum, r) => sum + r.payoutAmount, 0);
    const lastMonthTotal = lastMonthReports.reduce((sum, r) => sum + r.payoutAmount, 0);

    return {
      success: true,
      data: {
        currentMonth: {
          month: currentMonth,
          totalReports: currentMonthReports.length,
          totalAmount: currentMonthTotal,
          lockedAmount: currentMonthReports
            .filter(r => r.status === 'locked')
            .reduce((sum, r) => sum + r.payoutAmount, 0),
          unlockedAmount: currentMonthReports
            .filter(r => r.status === 'unlocked')
            .reduce((sum, r) => sum + r.payoutAmount, 0)
        },
        lastMonth: {
          month: lastMonth,
          totalReports: lastMonthReports.length,
          totalAmount: lastMonthTotal,
          lockedAmount: lastMonthReports
            .filter(r => r.status === 'locked')
            .reduce((sum, r) => sum + r.payoutAmount, 0),
          unlockedAmount: lastMonthReports
            .filter(r => r.status === 'unlocked')
            .reduce((sum, r) => sum + r.payoutAmount, 0)
        },
        monthOverMonthChange: lastMonthTotal > 0 
          ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
          : 100
      }
    };
  } catch (error) {
    console.error('Error fetching reports summary:', error);
    return { success: false, error: error.message };
  }
};
