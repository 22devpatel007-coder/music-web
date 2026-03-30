import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase';
import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [isAdmin, setIsAdmin]           = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          const hasAdminClaim = tokenResult.claims.role === 'admin';
          const adminEmail    = process.env.REACT_APP_ADMIN_EMAIL;
          const isAdminEmail  = adminEmail && user.email === adminEmail;
          setIsAdmin(hasAdminClaim || !!isAdminEmail);
        } catch (err) {
          console.error('Failed to get token claims:', err.message);
          const adminEmail = process.env.REACT_APP_ADMIN_EMAIL;
          setIsAdmin(adminEmail && user.email === adminEmail);
        }
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ── Google sign-in (used by Login + Register) ──────────────────────────────
  const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = () => signOut(auth);

  const value = { currentUser, isAdmin, loading, logout, signInWithGoogle };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};