import { db } from '../firebase/config';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';

// Fetch admin dashboard statistics
export const fetchAdminDashboardStats = async () => {
  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnapshot.size;
    const creators = usersSnapshot.docs.filter(doc => doc.data().role === 'creator');
    const activeCreators = creators.filter(doc => doc.data().status === 'active');
    
    // Get withdrawal requests
    const withdrawalsSnapshot = await getDocs(collection(db, 'withdrawal_requests'));
    const pendingWithdrawals = withdrawalsSnapshot.docs.filter(doc => doc.data().status === 'pending');
    
    // Get monthly reports
    const reportsSnapshot = await getDocs(collection(db, 'monthly_reports'));
    const lockedReports = reportsSnapshot.docs.filter(doc => doc.data().status === 'locked');
    
    // Calculate totals
    let totalEarnings = 0;
    let totalLocked = 0;
    let totalAvailable = 0;
    let totalWithdrawn = 0;
    let pendingWithdrawalsAmount = 0;
    
    creators.forEach(creator => {
      const data = creator.data();
      totalEarnings += data.totalEarnings || 0;
      totalLocked += data.lockedBalance || 0;
      totalAvailable += data.availableBalance || 0;
      totalWithdrawn += data.totalWithdrawn || 0;
    });
    
    pendingWithdrawals.forEach(withdrawal => {
      pendingWithdrawalsAmount += withdrawal.data().amount || 0;
    });
    
    // Get platform stats if available
    let platformStats = {};
    try {
      const statsDoc = await getDoc(doc(db, 'platform_stats', 'current_stats'));
      if (statsDoc.exists()) {
        platformStats = statsDoc.data();
      }
    } catch (e) {
      console.log('Platform stats not available');
    }
    
    return {
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      totalLocked: parseFloat(totalLocked.toFixed(2)),
      totalAvailable: parseFloat(totalAvailable.toFixed(2)),
      totalWithdrawn: parseFloat(totalWithdrawn.toFixed(2)),
      pendingWithdrawals: pendingWithdrawals.length,
      pendingWithdrawalsAmount: parseFloat(pendingWithdrawalsAmount.toFixed(2)),
      totalActiveCreators: activeCreators.length,
      totalSuspendedCreators: creators.length - activeCreators.length,
      creatorsWithNewReports: lockedReports.length,
      averageEarningsPerCreator: creators.length > 0 
        ? parseFloat((totalEarnings / creators.length).toFixed(2))
        : 0,
      ...platformStats
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

// Fetch creator dashboard statistics
export const fetchCreatorDashboardStats = async (creatorId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', creatorId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // Get videos
    const videosQuery = query(
      collection(db, 'scanned_videos'),
      where('creatorId', '==', creatorId)
    );
    const videosSnapshot = await getDocs(videosQuery);
    const totalVideos = videosSnapshot.size;
    const activeVideos = videosSnapshot.docs.filter(doc => doc.data().isActive).length;
    
    // Get monthly reports
    const reportsQuery = query(
      collection(db, 'monthly_reports'),
      where('creatorId', '==', creatorId)
    );
    const reportsSnapshot = await getDocs(reportsQuery);
    const totalReports = reportsSnapshot.size;
    
    // Get recent withdrawals
    const withdrawalsQuery = query(
      collection(db, 'withdrawal_requests'),
      where('creatorId', '==', creatorId),
      where('status', 'in', ['approved', 'processing'])
    );
    const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
    const recentWithdrawals = withdrawalsSnapshot.docs
      .map(doc => doc.data())
      .sort((a, b) => b.requestedAt - a.requestedAt)
      .slice(0, 5);
    
    // Calculate video performance
    let totalViews = 0;
    let totalPremiumViews = 0;
    videosSnapshot.docs.forEach(doc => {
      const videoData = doc.data();
      totalViews += videoData.totalEverNetViews || 0;
      totalPremiumViews += videoData.totalPremiumViews || 0;
    });
    
    // Get current month earnings
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentMonthReport = reportsSnapshot.docs.find(
      doc => doc.data().month === currentMonth
    );
    const currentMonthEarnings = currentMonthReport 
      ? currentMonthReport.data().payoutAmount || 0
      : 0;
    
    return {
      ...userData,
      totalVideos,
      activeVideos,
      totalReports,
      recentWithdrawals,
      totalViews,
      totalPremiumViews,
      currentMonthEarnings
    };
  } catch (error) {
    console.error('Error fetching creator stats:', error);
    throw error;
  }
};
