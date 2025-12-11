// Add these imports:
import { runTransaction, writeBatch } from 'firebase/firestore';

// Replace handleApproveWithdrawal function:
const handleApproveWithdrawal = async (request) => {
  try {
    setProcessing(request.requestId);
    
    await runTransaction(db, async (transaction) => {
      // 1. Get withdrawal request
      const requestRef = doc(db, 'withdrawal_requests', request.requestId);
      const requestDoc = await transaction.get(requestRef);
      
      if (!requestDoc.exists()) {
        throw new Error('Withdrawal request not found');
      }
      
      const requestData = requestDoc.data();
      
      // 2. Get user data
      const userRef = doc(db, 'users', request.creatorId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      
      // 3. Validate sufficient balance
      if (userData.availableBalance < request.amount) {
        throw new Error('Insufficient balance');
      }
      
      // 4. Update withdrawal request
      transaction.update(requestRef, {
        status: 'approved',
        processedAt: new Date(),
        processedBy: currentUser.uid,
        updatedAt: new Date()
      });
      
      // 5. Update user balance
      transaction.update(userRef, {
        availableBalance: userData.availableBalance - request.amount,
        totalWithdrawn: (userData.totalWithdrawn || 0) + request.amount,
        updatedAt: new Date()
      });
      
      // 6. Create audit log (if audit_logs collection exists)
      try {
        const auditRef = doc(collection(db, 'audit_logs'));
        transaction.set(auditRef, {
          logId: `audit_${Date.now()}`,
          action: 'withdrawal_approved',
          userId: currentUser.uid,
          targetId: request.requestId,
          changes: {
            before: { status: 'pending' },
            after: { status: 'approved', processedAt: new Date() }
          },
          timestamp: new Date()
        });
      } catch (e) {
        console.log('Audit log not created (collection might not exist)');
      }
    });
    
    toast.success('Withdrawal approved successfully');
    fetchWithdrawals();
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    toast.error(`Failed to approve withdrawal: ${error.message}`);
  } finally {
    setProcessing(null);
  }
};

// Replace handleRejectWithdrawal function:
const handleRejectWithdrawal = async (request, reason) => {
  try {
    setProcessing(request.requestId);
    
    const batch = writeBatch(db);
    
    // 1. Update withdrawal request
    const requestRef = doc(db, 'withdrawal_requests', request.requestId);
    batch.update(requestRef, {
      status: 'rejected',
      rejectionReason: reason,
      processedAt: new Date(),
      processedBy: currentUser.uid,
      updatedAt: new Date()
    });
    
    // 2. Create audit log
    const auditRef = doc(collection(db, 'audit_logs'));
    batch.set(auditRef, {
      logId: `audit_${Date.now()}`,
      action: 'withdrawal_rejected',
      userId: currentUser.uid,
      targetId: request.requestId,
      changes: {
        before: { status: 'pending' },
        after: { 
          status: 'rejected', 
          rejectionReason: reason,
          processedAt: new Date() 
        }
      },
      timestamp: new Date()
    });
    
    await batch.commit();
    
    toast.success('Withdrawal rejected');
    fetchWithdrawals();
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    toast.error(`Failed to reject withdrawal: ${error.message}`);
  } finally {
    setProcessing(null);
  }
};
