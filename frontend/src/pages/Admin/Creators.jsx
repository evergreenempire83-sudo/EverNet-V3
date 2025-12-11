// Add these imports:
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../services/firebase/config';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/firebase/config';

// Replace handleAddCreator function:
const handleAddCreator = async (creatorData) => {
  try {
    setAddingCreator(true);
    
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      creatorData.email,
      creatorData.password
    );
    
    // Update display name
    await updateProfile(userCredential.user, {
      displayName: creatorData.displayName
    });
    
    // Create user document in Firestore
    const userRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userRef, {
      uid: userCredential.user.uid,
      email: creatorData.email,
      displayName: creatorData.displayName,
      role: 'creator',
      status: creatorData.status || 'active',
      totalEarnings: 0,
      lockedBalance: 0,
      availableBalance: 0,
      totalWithdrawn: 0,
      paymentMethod: {
        type: 'paypal',
        paypalEmail: '',
        bankDetails: null
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Call cloud function to set custom claims (if you have it)
    // const setClaims = httpsCallable(functions, 'setCustomClaims');
    // await setClaims({ uid: userCredential.user.uid, role: 'creator' });
    
    toast.success(`Creator ${creatorData.displayName} added successfully`);
    setAddCreatorOpen(false);
    fetchCreators();
  } catch (error) {
    console.error('Error adding creator:', error);
    toast.error(`Failed to add creator: ${error.message}`);
  } finally {
    setAddingCreator(false);
  }
};
