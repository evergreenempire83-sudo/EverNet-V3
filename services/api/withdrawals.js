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

// Get all withdrawal requests
export const getAllWithdrawalRequests = async (filters = {}) => {
  try {
    const withdrawalsRef = collection(db, 'withdrawal_requests');
    let q = query(withdrawalsRef);

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters.method && filters.method !== 'all') {
      q = query(q, where('method', '==', filters.method));
    }

    if (filters.creatorId && filters.creatorId !== 'all') {
      q = query(q, where('creatorId', '==', filters.creatorId));
    }

    // Apply date range filter
    if (filters.startDate && filters.endDate) {
      q = query(
        q,
        where('requestedAt', '>=', Timestamp.fromDate(new Date(filters.startDate))),
        where('requestedAt', '<=', Timestamp.fromDate(new Date(filters.endDate)))
      );
    }

    // Apply sorting
    if (filters.sortBy) {
      q = query(q, orderBy(filters.sortBy, filters.sortDirection || 'desc'));
    } else {
      q = query(q, orderBy('requestedAt', 'desc'));
    }

    const querySnapshot = await getDocs(q);
    const withdrawals = [];
    
    querySnapshot.forEach((doc) => {
      withdrawals.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: withdrawals };
  } catch (error) {
    console.error('Error fetching withdrawal requests:', error);
    return { success: false, error: error.message };
  }
};

// Get single withdrawal by ID
export const getWithdrawalById = async (withdrawalId) => {
  try {
    const withdrawalRef = doc(db, 'withdrawal_requests', withdrawalId);
    const withdrawalDoc = await getDoc(withdrawalRef);

    if (!withdrawalDoc.exists()) {
      return { success: false, error: 'Withdrawal request not found' };
    }

    return { 
      success: true, 
      data: { id: withdrawalDoc.id, ...withdrawalDoc.data() } 
    };
  } catch (error) {
    console.error('Error fetching withdrawal request:', error);
    return { success: false, error: error.message };
  }
};

// Approve a withdrawal request
export const approveWithdrawal = async (withdrawalId, adminId) => {
  try {
    const withdrawalRef = doc(db, 'withdrawal_requests', withdrawalId);
    const withdrawalDoc = await getDoc(withdrawalRef);
    
    if (!withdrawalDoc.exists()) {
      return { success: false, error: 'Withdrawal request not found' };
    }

    const withdrawal = withdrawalDoc.data();
    
    // Check if withdrawal is still pending
    if (withdrawal.status !== 'pending') {
      return { success: false, error: `Withdrawal is already ${withdrawal.status}` };
    }

    // Check creator's available balance
    const creatorRef = doc(db, 'users', withdrawal.creatorId);
    const creatorDoc = await getDoc(creatorRef);
    
    if (!creatorDoc.exists()) {
      return { success: false, error: 'Creator not found' };
    }

    const creator = creatorDoc.data();
    
    if ((creator.availableBalance || 0) < withdrawal.amount) {
      return { 
        success: false, 
        error: `Insufficient balance. Available: $${(creator.availableBalance || 0).toFixed(2)}` 
      };
    }

    // Update withdrawal status
    await updateDoc(withdrawalRef, {
      status: 'approved',
      processedAt: serverTimestamp(),
      processedBy: adminId
    });

    // Update creator's balance
    await updateDoc(creatorRef, {
      availableBalance: (creator.availableBalance || 0) - withdrawal.amount,
      totalWithdrawn: (creator.totalWithdrawn || 0) + withdrawal.amount
    });

    // Create audit log
    await addDoc(collection(db, 'audit_logs'), {
      action: 'withdrawal_approved',
      userId: adminId,
      targetId: withdrawalId,
      changes: {
        before: { 
          status: 'pending',
          creatorAvailableBalance: creator.availableBalance || 0
        },
        after: { 
          status: 'approved',
          creatorAvailableBalance: (creator.availableBalance || 0) - withdrawal.amount
        }
      },
      timestamp: serverTimestamp()
    });

    return { 
      success: true, 
      message: 'Withdrawal approved successfully',
      data: {
        newBalance: (creator.availableBalance || 0) - withdrawal.amount
      }
    };
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    return { success: false, error: error.message };
  }
};

// Reject a withdrawal request
export const rejectWithdrawal = async (withdrawalId, adminId, reason = '') => {
  try {
    const withdrawalRef = doc(db, 'withdrawal_requests', withdrawalId);
    const withdrawalDoc = await getDoc(withdrawalRef);
    
    if (!withdrawalDoc.exists()) {
      return { success: false, error: 'Withdrawal request not found' };
    }

    const withdrawal = withdrawalDoc.data();
    
    // Check if withdrawal is still pending
    if (withdrawal.status !== 'pending') {
      return { success: false, error: `Withdrawal is already ${withdrawal.status}` };
    }

    // Update withdrawal status
    const updates = {
      status: 'rejected',
      processedAt: serverTimestamp(),
      processedBy: adminId
    };

    if (reason) {
      updates.rejectionReason = reason;
    }

    await updateDoc(withdrawalRef, updates);

    // Create audit log
    await addDoc(collection(db, 'audit_logs'), {
      action: 'withdrawal_rejected',
      userId: adminId,
      targetId: withdrawalId,
      changes: {
        before: { status: 'pending' },
        after: { status: 'rejected', ...(reason && { rejectionReason: reason }) }
      },
      timestamp: serverTimestamp()
    });

    return { 
      success: true, 
      message: 'Withdrawal rejected successfully'
    };
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    return { success: false, error: error.message };
  }
};

// Bulk process withdrawals
export const bulkProcessWithdrawals = async (withdrawalIds, action, adminId, reason = '') => {
  try {
    if (!withdrawalIds || withdrawalIds.length === 0) {
      return { success: false, error: 'No withdrawals selected' };
    }

    if (!['approved', 'rejected'].includes(action)) {
      return { success: false, error: 'Invalid action' };
    }

    const batch = writeBatch(db);
    const successIds = [];
    const failedIds = [];
    const creatorUpdates = {};

    // First, validate all withdrawals
    for (const withdrawalId of withdrawalIds) {
      try {
        const withdrawalRef = doc(db, 'withdrawal_requests', withdrawalId);
        const withdrawalDoc = await getDoc(withdrawalRef);
        
        if (!withdrawalDoc.exists()) {
          failedIds.push({ id: withdrawalId, error: 'Withdrawal not found' });
          continue;
        }

        const withdrawal = withdrawalDoc.data();
        
        // Check if withdrawal is pending
        if (withdrawal.status !== 'pending') {
          failedIds.push({ id: withdrawalId, error: `Already ${withdrawal.status}` });
          continue;
        }

        // For approvals, check creator balance
        if (action === 'approved') {
          const creatorRef = doc(db, 'users', withdrawal.creatorId);
          const creatorDoc = await getDoc(creatorRef);
          
          if (!creatorDoc.exists()) {
            failedIds.push({ id: withdrawalId, error: 'Creator not found' });
            continue;
          }

          const creator = creatorDoc.data();
          
          if ((creator.availableBalance || 0) < withdrawal.amount) {
            failedIds.push({ 
              id: withdrawalId, 
              error: `Insufficient balance: $${(creator.availableBalance || 0).toFixed(2)}` 
            });
            continue;
          }

          // Track creator balance updates
          if (!creatorUpdates[withdrawal.creatorId]) {
            creatorUpdates[withdrawal.creatorId] = {
              currentBalance: creator.availableBalance || 0,
              totalWithdrawn: creator.totalWithdrawn || 0,
              withdrawals: []
            };
          }
          creatorUpdates[withdrawal.creatorId].withdrawals.push(withdrawal);
        }

        // Mark for batch update
        const updateData = {
          status: action,
          processedAt: serverTimestamp(),
          processedBy: adminId
        };

        if (action === 'rejected' && reason) {
          updateData.rejectionReason = reason;
        }

        batch.update(withdrawalRef, updateData);
        successIds.push(withdrawalId);
      } catch (error) {
        failedIds.push({ id: withdrawalId, error: error.message });
      }
    }

    // Execute batch update for withdrawals
    await batch.commit();

    // Process creator balance updates for approvals
    if (action === 'approved') {
      const creatorBatch = writeBatch(db);
      
      for (const [creatorId, data] of Object.entries(creatorUpdates)) {
        const totalAmount = data.withdrawals.reduce((sum, w) => sum + w.amount, 0);
        
        const creatorRef = doc(db, 'users', creatorId);
        creatorBatch.update(creatorRef, {
          availableBalance: data.currentBalance - totalAmount,
          totalWithdrawn: data.totalWithdrawn + totalAmount
        });
      }

      await creatorBatch.commit();
    }

    // Create audit logs for successful actions
    for (const withdrawalId of successIds) {
      await addDoc(collection(db, 'audit_logs'), {
        action: `withdrawal_${action}`,
        userId: adminId,
        targetId: withdrawalId,
        changes: {
          before: { status: 'pending' },
          after: { status: action, ...(action === 'rejected' && reason && { rejectionReason: reason }) }
        },
        timestamp: serverTimestamp()
      });
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
    console.error('Error bulk processing withdrawals:', error);
    return { success: false, error: error.message };
  }
};

// Get withdrawals by creator
export const getWithdrawalsByCreator = async (creatorId, filters = {}) => {
  try {
    const withdrawalsRef = collection(db, 'withdrawal_requests');
    let q = query(withdrawalsRef, where('creatorId', '==', creatorId));

    if (filters.status && filters.status !== 'all') {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters.method && filters.method !== 'all') {
      q = query(q, where('method', '==', filters.method));
    }

    // Apply date range filter
    if (filters.startDate && filters.endDate) {
      q = query(
        q,
        where('requestedAt', '>=', Timestamp.fromDate(new Date(filters.startDate))),
        where('requestedAt', '<=', Timestamp.fromDate(new Date(filters.endDate)))
      );
    }

    q = query(q, orderBy('requestedAt', 'desc'));

    const querySnapshot = await getDocs(q);
    const withdrawals = [];
    
    querySnapshot.forEach((doc) => {
      withdrawals.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: withdrawals };
  } catch (error) {
    console.error('Error fetching creator withdrawals:', error);
    return { success: false, error: error.message };
  }
};

// Get withdrawal statistics
export const getWithdrawalStats = async (period = 'all') => {
  try {
    const withdrawalsRef = collection(db, 'withdrawal_requests');
    let q = query(withdrawalsRef);

    // Apply period filter
    if (period !== 'all') {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      if (startDate) {
        q = query(q, where('requestedAt', '>=', Timestamp.fromDate(startDate)));
      }
    }

    const querySnapshot = await getDocs(q);

    let totalWithdrawals = 0;
    let pendingWithdrawals = 0;
    let approvedWithdrawals = 0;
    let rejectedWithdrawals = 0;
    let totalPendingAmount = 0;
    let totalApprovedAmount = 0;
    let totalRejectedAmount = 0;
    let methodBreakdown = {
      paypal: { count: 0, amount: 0 },
      bank: { count: 0, amount: 0 }
    };

    querySnapshot.forEach((doc) => {
      const withdrawal = doc.data();
      totalWithdrawals++;
      
      // Status breakdown
      if (withdrawal.status === 'pending') {
        pendingWithdrawals++;
        totalPendingAmount += withdrawal.amount || 0;
      } else if (withdrawal.status === 'approved') {
        approvedWithdrawals++;
        totalApprovedAmount += withdrawal.amount || 0;
      } else if (withdrawal.status === 'rejected') {
        rejectedWithdrawals++;
        totalRejectedAmount += withdrawal.amount || 0;
      }

      // Method breakdown
      if (withdrawal.method === 'paypal') {
        methodBreakdown.paypal.count++;
        methodBreakdown.paypal.amount += withdrawal.amount || 0;
      } else if (withdrawal.method === 'bank') {
        methodBreakdown.bank.count++;
        methodBreakdown.bank.amount += withdrawal.amount || 0;
      }
    });

    return {
      success: true,
      data: {
        totalWithdrawals,
        pendingWithdrawals,
        approvedWithdrawals,
        rejectedWithdrawals,
        totalPendingAmount,
        totalApprovedAmount,
        totalRejectedAmount,
        methodBreakdown,
        averageWithdrawal: totalWithdrawals > 0 
          ? (totalPendingAmount + totalApprovedAmount + totalRejectedAmount) / totalWithdrawals 
          : 0
      }
    };
  } catch (error) {
    console.error('Error fetching withdrawal stats:', error);
    return { success: false, error: error.message };
  }
};

// Create a withdrawal request (for creator portal)
export const createWithdrawalRequest = async (creatorId, amount, method, paymentDetails) => {
  try {
    // Validate minimum withdrawal amount
    if (amount < FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL) {
      return { 
        success: false, 
        error: `Minimum withdrawal amount is $${FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL.toFixed(2)}` 
      };
    }

    // Check creator's available balance
    const creatorRef = doc(db, 'users', creatorId);
    const creatorDoc = await getDoc(creatorRef);
    
    if (!creatorDoc.exists()) {
      return { success: false, error: 'Creator not found' };
    }

    const creator = creatorDoc.data();
    
    if ((creator.availableBalance || 0) < amount) {
      return { 
        success: false, 
        error: `Insufficient balance. Available: $${(creator.availableBalance || 0).toFixed(2)}` 
      };
    }

    // Check payment method
    if (!['paypal', 'bank'].includes(method)) {
      return { success: false, error: 'Invalid payment method' };
    }

    // Validate payment details based on method
    if (method === 'paypal' && !paymentDetails.paypalEmail) {
      return { success: false, error: 'PayPal email is required' };
    }

    if (method === 'bank') {
      if (!paymentDetails.bankName || !paymentDetails.accountNumber || !paymentDetails.routingNumber) {
        return { success: false, error: 'All bank details are required' };
      }
    }

    // Generate request ID
    const requestId = `WDR${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create withdrawal request
    const withdrawalData = {
      requestId,
      creatorId,
      amount: parseFloat(amount.toFixed(2)),
      method,
      status: 'pending',
      requestedAt: serverTimestamp(),
      paymentDetails,
      creatorAvailableBalance: creator.availableBalance || 0
    };

    const docRef = await addDoc(collection(db, 'withdrawal_requests'), withdrawalData);

    // Create audit log
    await addDoc(collection(db, 'audit_logs'), {
      action: 'withdrawal_requested',
      userId: creatorId,
      targetId: docRef.id,
      changes: {
        before: null,
        after: withdrawalData
      },
      timestamp: serverTimestamp()
    });

    return { 
      success: true, 
      data: { id: docRef.id, ...withdrawalData },
      message: 'Withdrawal request submitted successfully'
    };
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    return { success: false, error: error.message };
  }
};

// Update withdrawal receipt
export const updateWithdrawalReceipt = async (withdrawalId, receiptUrl) => {
  try {
    const withdrawalRef = doc(db, 'withdrawal_requests', withdrawalId);
    const withdrawalDoc = await getDoc(withdrawalRef);
    
    if (!withdrawalDoc.exists()) {
      return { success: false, error: 'Withdrawal request not found' };
    }

    await updateDoc(withdrawalRef, {
      receiptUrl,
      updatedAt: serverTimestamp()
    });

    return { 
      success: true, 
      message: 'Receipt updated successfully'
    };
  } catch (error) {
    console.error('Error updating withdrawal receipt:', error);
    return { success: false, error: error.message };
  }
};

// Get pending withdrawals count for dashboard
export const getPendingWithdrawalsCount = async () => {
  try {
    const withdrawalsRef = collection(db, 'withdrawal_requests');
    const q = query(withdrawalsRef, where('status', '==', 'pending'));
    
    const querySnapshot = await getDocs(q);
    const count = querySnapshot.size;

    // Calculate total pending amount
    let totalAmount = 0;
    querySnapshot.forEach((doc) => {
      const withdrawal = doc.data();
      totalAmount += withdrawal.amount || 0;
    });

    return {
      success: true,
      data: {
        count,
        totalAmount,
        averageAmount: count > 0 ? totalAmount / count : 0
      }
    };
  } catch (error) {
    console.error('Error fetching pending withdrawals count:', error);
    return { success: false, error: error.message };
  }
};

// Get recent withdrawals for dashboard
export const getRecentWithdrawals = async (limitCount = 10) => {
  try {
    const withdrawalsRef = collection(db, 'withdrawal_requests');
    const q = query(withdrawalsRef, orderBy('requestedAt', 'desc'), limit(limitCount));
    
    const querySnapshot = await getDocs(q);
    const withdrawals = [];
    
    querySnapshot.forEach((doc) => {
      withdrawals.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: withdrawals };
  } catch (error) {
    console.error('Error fetching recent withdrawals:', error);
    return { success: false, error: error.message };
  }
};
