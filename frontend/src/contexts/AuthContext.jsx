import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase/firebase';
import { login, register, logout } from '../services/firebase/auth';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Listen to user data changes
        const unsubscribeUserData = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              setUserData(data);
              setUser({ 
                ...firebaseUser, 
                ...data,
                role: data.role 
              });
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to user data:', error);
            setLoading(false);
          }
        );

        return () => unsubscribeUserData();
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return unsubscribeAuth;
  }, []);

  const value = {
    user,
    userData,
    loading,
    login: async (email, password) => {
      const result = await login(email, password);
      return result;
    },
    register: async (email, password, userData) => {
      const result = await register(email, password, userData);
      return result;
    },
    logout: async () => {
      await logout();
      setUser(null);
      setUserData(null);
    },
    isAdmin: () => user?.role === 'admin',
    isCreator: () => user?.role === 'creator',
    hasRole: (role) => user?.role === role,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
