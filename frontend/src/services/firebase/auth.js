import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import toast from 'react-hot-toast';

export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      toast.error('User profile not found');
      await signOut(auth);
      return null;
    }
    
    const userData = userDoc.data();
    
    toast.success(`Welcome back, ${userData.displayName || user.email}!`);
    return { ...user, ...userData };
  } catch (error) {
    console.error('Login error:', error);
    
    let message = 'Login failed. Please try again.';
    switch (error.code) {
      case 'auth/user-not-found':
        message = 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later.';
        break;
    }
    
    toast.error(message);
    return null;
  }
};

export const register = async (email, password, userData) => {
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore
    const userDoc = {
      uid: user.uid,
      email: user.email,
      displayName: userData.displayName,
      role: userData.role || 'creator',
      status: 'active',
      totalEarnings: 0,
      lockedBalance: 0,
      availableBalance: 0,
      totalWithdrawn: 0,
      lastReportDate: null,
      paymentMethod: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(doc(db, 'users', user.uid), userDoc);
    
    // Update auth profile
    await updateProfile(user, {
      displayName: userData.displayName
    });
    
    toast.success('Account created successfully!');
    return { ...user, ...userDoc };
  } catch (error) {
    console.error('Registration error:', error);
    
    let message = 'Registration failed. Please try again.';
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Email already registered.';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters.';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address.';
        break;
    }
    
    toast.error(message);
    return null;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    toast.success('Logged out successfully');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    toast.error('Failed to log out');
    return false;
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    toast.success('Password reset email sent!');
    return true;
  } catch (error) {
    console.error('Password reset error:', error);
    toast.error('Failed to send reset email');
    return false;
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    await setDoc(doc(db, 'users', userId), updates, { merge: true });
    toast.success('Profile updated successfully');
    return true;
  } catch (error) {
    console.error('Profile update error:', error);
    toast.error('Failed to update profile');
    return false;
  }
};
