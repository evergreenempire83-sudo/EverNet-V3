import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';

// Send notification to creator
export const sendNotification = async (notificationData) => {
  try {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notificationRef = doc(db, 'notifications', notificationId);
    
    await setDoc(notificationRef, {
      ...notificationData,
      notificationId,
      createdAt: serverTimestamp(),
      status: 'sent'
    });
    
    // If targeted to specific creators, create creator notifications
    if (notificationData.type === 'targeted' && notificationData.creatorIds) {
      await createCreatorNotifications(notificationId, notificationData.creatorIds, notificationData);
    }
    
    return notificationId;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

// Create creator-specific notifications
const createCreatorNotifications = async (notificationId, creatorIds, notificationData) => {
  const batch = [];
  
  creatorIds.forEach(creatorId => {
    const creatorNotifId = `${creatorId}_${notificationId}`;
    const creatorNotifRef = doc(db, 'creator_notifications', creatorNotifId);
    
    batch.push(setDoc(creatorNotifRef, {
      id: creatorNotifId,
      creatorId,
      notificationId,
      title: notificationData.title,
      message: notificationData.message,
      category: notificationData.category,
      priority: notificationData.priority,
      deliveredAt: serverTimestamp(),
      seenAt: null,
      openedAt: null,
      clickedAt: null,
      isRead: false,
      isArchived: false,
      actionTaken: 'none'
    }));
  });
  
  try {
    await Promise.all(batch);
  } catch (error) {
    console.error('Error creating creator notifications:', error);
    throw error;
  }
};

// Get notifications for a creator
export const getCreatorNotifications = async (creatorId, limitCount = 20) => {
  try {
    const notificationsQuery = query(
      collection(db, 'creator_notifications'),
      where('creatorId', '==', creatorId),
      orderBy('deliveredAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(notificationsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId, creatorId) => {
  try {
    const creatorNotifId = `${creatorId}_${notificationId}`;
    const notificationRef = doc(db, 'creator_notifications', creatorNotifId);
    
    await updateDoc(notificationRef, {
      isRead: true,
      seenAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark notification as opened (clicked)
export const markNotificationAsOpened = async (notificationId, creatorId) => {
  try {
    const creatorNotifId = `${creatorId}_${notificationId}`;
    const notificationRef = doc(db, 'creator_notifications', creatorNotifId);
    
    await updateDoc(notificationRef, {
      openedAt: serverTimestamp(),
      clickedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as opened:', error);
    throw error;
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async (creatorId) => {
  try {
    const notificationsQuery = query(
      collection(db, 'creator_notifications'),
      where('creatorId', '==', creatorId),
      where('isRead', '==', false)
    );
    
    const snapshot = await getDocs(notificationsQuery);
    return snapshot.size;
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
};

// Delete notification
export const deleteNotification = async (notificationId, creatorId) => {
  try {
    const creatorNotifId = `${creatorId}_${notificationId}`;
    const notificationRef = doc(db, 'creator_notifications', creatorNotifId);
    
    await updateDoc(notificationRef, {
      isArchived: true
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};
