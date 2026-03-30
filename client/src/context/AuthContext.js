import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, googleProvider, db } from '../firebase';
import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [isAdmin, setIsAdmin]           = useState(false);
  const [likedSongs, setLikedSongs]     = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // Check admin claim
          const tokenResult = await user.getIdTokenResult();
          const hasAdminClaim = tokenResult.claims.role === 'admin';
          const adminEmail    = process.env.REACT_APP_ADMIN_EMAIL;
          const isAdminEmail  = adminEmail && user.email === adminEmail;
          setIsAdmin(hasAdminClaim || !!isAdminEmail);

          // Fetch user doc for likedSongs
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setLikedSongs(userDoc.data().likedSongs || []);
          } else {
            // Auto-create user doc for Google sign-in users
            await setDoc(userRef, {
              uid:         user.uid,
              email:       user.email,
              displayName: user.displayName || '',
              role:        'user',
              likedSongs:  [],
              createdAt:   serverTimestamp(),
            }, { merge: true });
            setLikedSongs([]);
          }
        } catch (err) {
          console.error('Auth setup failed:', err.message);
          const adminEmail = process.env.REACT_APP_ADMIN_EMAIL;
          setIsAdmin(adminEmail && user.email === adminEmail);
          setLikedSongs([]);
        }
      } else {
        setIsAdmin(false);
        setLikedSongs([]);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(() => signInWithPopup(auth, googleProvider), []);
  const logout = useCallback(() => signOut(auth), []);

  const value = {
    currentUser,
    isAdmin,
    loading,
    logout,
    signInWithGoogle,
    likedSongs,
    setLikedSongs,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};