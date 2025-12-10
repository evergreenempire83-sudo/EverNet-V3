import { db } from './config';
import { 
  collection, doc, getDoc, getDocs, addDoc, updateDoc, 
  deleteDoc, query, where, orderBy, limit, Timestamp,
  onSnapshot, DocumentData, setDoc
} from 'firebase/firestore';

// Collections
export const configCollection = collection(db, 'config');
export const creatorsCollection = collection(db, 'creators');
export const videosCollection = collection(db, 'videos');
export const withdrawalsCollection = collection(db, 'withdrawals');
export const notificationsCollection = collection(db, 'notifications');

// Config documents
export const revenueModelDoc = doc(db, 'config/revenueModel');
export const platformSettingsDoc = doc(db, 'config/platformSettings');
export const apiKeysDoc = doc(db, 'config/apiKeys');
export const referralSettingsDoc = doc(db, 'config/referralSettings');
export const withdrawalSettingsDoc = doc(db, 'config/withdrawalSettings');

// Functions
export const getRevenueModel = () => getDoc(revenueModelDoc);
export const updateRevenueModel = (data: any) => updateDoc(revenueModelDoc, data);
export const getCreatorDoc = (creatorId: string) => doc(db, `creators/${creatorId}`);
export const getVideoDoc = (videoId: string) => doc(db, `videos/${videoId}`);
export const getWithdrawalDoc = (withdrawalId: string) => doc(db, `withdrawals/${withdrawalId}`);

// Creator collections
export const getCreatorEarnings = (creatorId: string) => 
  collection(db, `creators/${creatorId}/earnings`);
export const getCreatorWithdrawals = (creatorId: string) =>
  collection(db, `creators/${creatorId}/withdrawals`);
