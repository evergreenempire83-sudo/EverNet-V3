const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Set custom claims when user is created
exports.setUserRole = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    try {
      const userData = snap.data();
      const userId = context.params.userId;
      
      // Set custom claims based on role
      await admin.auth().setCustomUserClaims(userId, {
        role: userData.role || 'creator'
      });
      
      console.log(`Custom claims set for user ${userId}: ${userData.role}`);
      return true;
    } catch (error) {
      console.error('Error setting custom claims:', error);
      throw error;
    }
  });

// Update custom claims when user role changes
exports.updateUserRole = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();
      const userId = context.params.userId;
      
      // Check if role changed
      if (beforeData.role !== afterData.role) {
        await admin.auth().setCustomUserClaims(userId, {
          role: afterData.role
        });
        
        console.log(`Custom claims updated for user ${userId}: ${afterData.role}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating custom claims:', error);
      throw error;
    }
  });
