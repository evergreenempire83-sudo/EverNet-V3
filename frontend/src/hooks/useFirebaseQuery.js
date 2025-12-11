import { useState, useEffect } from 'react';
import { onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export const useFirebaseQuery = (collectionRef, options = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Build query
    let q = collectionRef;
    
    if (options.where) {
      q = query(q, where(...options.where));
    }
    
    if (options.orderBy) {
      q = query(q, orderBy(...options.orderBy));
    }
    
    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(docs);
        setSnapshot(querySnapshot);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore query error:', err);
        setError(err);
        setLoading(false);
        if (options.showError) {
          toast.error('Failed to load data');
        }
      }
    );

    return () => unsubscribe();
  }, [collectionRef, JSON.stringify(options)]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, snapshot };
};

// Hook for single document
export const useFirebaseDocument = (docRef) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setData({
            id: docSnapshot.id,
            ...docSnapshot.data()
          });
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firestore document error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [docRef]);

  return { data, loading, error };
};
