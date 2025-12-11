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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

// Get all creators
export const getAllCreators = async (filters = {}) => {
  try {
    const creatorsRef = collection(db, 'users');
    let q = query(creatorsRef, where('role', 'in', ['creator', 'admin']));

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters.role && filters.role !== 'all') {
      q = query(q, where('role', '==', filters.role));
    }

    // Apply sorting
    if (filters.sortBy) {
      q = query(q, orderBy(filters.sortBy, filters.sortDirection || 'desc'));
    } else {
      q = query(q, orderBy('displayName'));
    }

    const querySnapshot = await getDocs(q);
    const creators = [];
    
    querySnapshot.forEach((doc) => {
      creators.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: creators };
  } catch (error) {
    console.error('Error fetching creators:', error);
    return { success: false, error: error.message };
  }
};

// Get single creator by ID
export const getCreatorById = async (creatorId) => {
  try {
    const creatorRef = doc(db, 'users', creatorId);
    const creatorDoc = await getDoc(creatorRef);

    if (!creatorDoc.exists()) {
      return { success: false, error: 'Creator not found' };
    }

    return { 
      success: true, 
      data: { id: creatorDoc.id, ...creatorDoc.data() } 
    };
  } catch (error) {
    console.error('Error fetching creator:', error);
    return { success: false, error: error.message };
  }
};

// Update creator
export const updateCreator = async (creatorId, updates) => {
  try {
    const creatorRef = doc(db, 'users', creatorId);
    await updateDoc(creatorRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating creator:', error);
    return { success: false, error: error.message };
  }
};

// Add new creator
export const addCreator = async (creatorData) => {
  try {
    // Validate required fields
    if (!creatorData.email || !creatorData.displayName) {
      return { success: false, error: 'Email and display name are required' };
    }

    const newCreator = {
      ...creatorData,
      uid: `creator_${Date.now()}`,
      totalEarnings: 0,
      lockedBalance: 0,
      availableBalance: 0,
      totalWithdrawn: 0,
      status: creatorData.status || 'active',
      role: creatorData.role || 'creator',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'users'), newCreator);
    
    return { 
      success: true, 
      data: { id: docRef.id, ...newCreator }
    };
  } catch (error) {
    console.error('Error adding creator:', error);
    return { success: false, error: error.message };
  }
};

// Delete creator (soft delete by changing status)
export const deleteCreator = async (creatorId) => {
  try {
    const creatorRef = doc(db, 'users', creatorId);
    await updateDoc(creatorRef, {
      status: 'suspended',
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting creator:', error);
    return { success: false, error: error.message };
  }
};

// Bulk update creators
export const bulkUpdateCreators = async (creatorIds, updates) => {
  try {
    const batch = writeBatch(db);

    creatorIds.forEach((creatorId) => {
      const creatorRef = doc(db, 'users', creatorId);
      batch.update(creatorRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error bulk updating creators:', error);
    return { success: false, error: error.message };
  }
};

// Get creator statistics
export const getCreatorStats = async () => {
  try {
    const creatorsRef = collection(db, 'users');
    const q = query(creatorsRef, where('role', 'in', ['creator', 'admin']));
    const querySnapshot = await getDocs(q);

    let totalCreators = 0;
    let activeCreators = 0;
    let suspendedCreators = 0;
    let totalEarnings = 0;
    let totalLocked = 0;
    let totalAvailable = 0;

    querySnapshot.forEach((doc) => {
      const creator = doc.data();
      totalCreators++;
      
      if (creator.status === 'active') {
        activeCreators++;
      } else if (creator.status === 'suspended') {
        suspendedCreators++;
      }

      totalEarnings += creator.totalEarnings || 0;
      totalLocked += creator.lockedBalance || 0;
      totalAvailable += creator.availableBalance || 0;
    });

    return {
      success: true,
      data: {
        totalCreators,
        activeCreators,
        suspendedCreators,
        totalEarnings,
        totalLocked,
        totalAvailable
      }
    };
  } catch (error) {
    console.error('Error fetching creator stats:', error);
    return { success: false, error: error.message };
  }
};

// Search creators
export const searchCreators = async (searchTerm) => {
  try {
    const creatorsRef = collection(db, 'users');
    
    // Note: Firestore doesn't support OR queries easily across multiple fields
    // For production, consider using Algolia or similar for complex searches
    
    let q = query(
      creatorsRef, 
      where('role', 'in', ['creator', 'admin'])
    );

    const querySnapshot = await getDocs(q);
    const creators = [];

    querySnapshot.forEach((doc) => {
      const creator = { id: doc.id, ...doc.data() };
      
      // Client-side filtering for search
      if (
        creator.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creator.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        creators.push(creator);
      }
    });

    return { success: true, data: creators };
  } catch (error) {
    console.error('Error searching creators:', error);
    return { success: false, error: error.message };
  }
};

// Get creator's financial summary
export const getCreatorFinancialSummary = async (creatorId) => {
  try {
    // Get creator data
    const creatorRef = doc(db, 'users', creatorId);
    const creatorDoc = await getDoc(creatorRef);

    if (!creatorDoc.exists()) {
      return { success: false, error: 'Creator not found' };
    }

    const creator = creatorDoc.data();

    // Get recent monthly reports
    const reportsRef = collection(db, 'monthly_reports');
    const q = query(
      reportsRef,
      where('creatorId', '==', creatorId),
      orderBy('month', 'desc'),
      limit(6)
    );

    const reportsSnapshot = await getDocs(q);
    const recentReports = [];
    reportsSnapshot.forEach((doc) => {
      recentReports.push({ id: doc.id, ...doc.data() });
    });

    // Get pending withdrawal requests
    const withdrawalsRef = collection(db, 'withdrawal_requests');
    const wq = query(
      withdrawalsRef,
      where('creatorId', '==', creatorId),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    );

    const withdrawalsSnapshot = await getDocs(wq);
    const pendingWithdrawals = [];
    withdrawalsSnapshot.forEach((doc) => {
      pendingWithdrawals.push({ id: doc.id, ...doc.data() });
    });

    return {
      success: true,
      data: {
        creator: { id: creatorDoc.id, ...creator },
        recentReports,
        pendingWithdrawals,
        summary: {
          totalEarnings: creator.totalEarnings || 0,
          lockedBalance: creator.lockedBalance || 0,
          availableBalance: creator.availableBalance || 0,
          totalWithdrawn: creator.totalWithdrawn || 0,
          lastReportDate: creator.lastReportDate || null
        }
      }
    };
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    return { success: false, error: error.message };
  }
};

// Get creators with new reports (for admin dashboard)
export const getCreatorsWithNewReports = async () => {
  try {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    const reportsRef = collection(db, 'monthly_reports');
    const q = query(
      reportsRef,
      where('status', '==', 'locked'),
      where('lockedUntil', '<', now),
      orderBy('lockedUntil', 'asc')
    );

    const reportsSnapshot = await getDocs(q);
    const creatorsWithNewReports = [];

    for (const doc of reportsSnapshot.docs) {
      const report = { id: doc.id, ...doc.data() };
      
      // Get creator info for each report
      const creatorRef = doc(db, 'users', report.creatorId);
      const creatorDoc = await getDoc(creatorRef);
      
      if (creatorDoc.exists()) {
        creatorsWithNewReports.push({
          reportId: report.id,
          creatorId: report.creatorId,
          creatorName: creatorDoc.data().displayName,
          creatorEmail: creatorDoc.data().email,
          month: report.month,
          payoutAmount: report.payoutAmount,
          lockedUntil: report.lockedUntil,
          daysLocked: Math.floor((now - report.lockedUntil.toDate()) / (1000 * 60 * 60 * 24))
        });
      }
    }

    return { success: true, data: creatorsWithNewReports };
  } catch (error) {
    console.error('Error fetching creators with new reports:', error);
    return { success: false, error: error.message };
  }
};
