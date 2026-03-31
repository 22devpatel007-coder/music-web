import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { auth, googleProvider, db } from '../firebase';
import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// How often to proactively refresh the token in the background (every 55 minutes).
// Firebase tokens expire after 60 minutes — this keeps them always fresh.
const REFRESH_INTERVAL_MS = 55 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [likedSongs, setLikedSongs]   = useState([]);

  // Ref to the background refresh timer so we can clear it on logout
  const refreshTimerRef = useRef(null);

  // ─── Background token refresh ───────────────────────────────────────────────
  // Silently forces a token refresh every 55 minutes while the user is logged in.
  // This ensures the token in Firebase's local cache is never stale.
  const startTokenRefreshTimer = useCallback((user) => {
    // Clear any existing timer first
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);

    refreshTimerRef.current = setInterval(async () => {
      try {
        await user.getIdToken(true);
        console.debug('[AuthContext] Background token refresh successful');
      } catch (err) {
        console.error('[AuthContext] Background token refresh failed:', err.message);
        // If background refresh fails, sign the user out cleanly
        await signOut(auth);
      }
    }, REFRESH_INTERVAL_MS);
  }, []);

  const stopTokenRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // ─── Refresh token when tab regains focus ───────────────────────────────────
  // If the user leaves the tab for >60 min, the token expires. This silently
  // refreshes on focus so the very next API call has a valid token.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      const user = auth.currentUser;
      if (!user) return;
      try {
        const tokenResult = await user.getIdTokenResult(false);
        const expiresAt   = new Date(tokenResult.expirationTime).getTime();
        const msLeft      = expiresAt - Date.now();
        if (msLeft < 5 * 60 * 1000) {
          await user.getIdToken(true);
          console.debug('[AuthContext] Token refreshed on tab focus');
        }
      } catch (err) {
        console.error('[AuthContext] Focus refresh failed:', err.message);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ─── Auth state listener ────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // Verify admin status from token claims
          const tokenResult  = await user.getIdTokenResult();
          const hasAdminClaim = tokenResult.claims.role === 'admin';
          const adminEmail    = process.env.REACT_APP_ADMIN_EMAIL;
          setIsAdmin(hasAdminClaim || (!!adminEmail && user.email === adminEmail));

          // Fetch or create the user's Firestore document
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            setLikedSongs(userDoc.data().likedSongs || []);
          } else {
            // Auto-create doc for first-time Google sign-in users
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

          // Start background token refresh timer
          startTokenRefreshTimer(user);

        } catch (err) {
          console.error('[AuthContext] Setup error:', err.message);
          const adminEmail = process.env.REACT_APP_ADMIN_EMAIL;
          setIsAdmin(!!adminEmail && user.email === adminEmail);
          setLikedSongs([]);
          startTokenRefreshTimer(user);
        }
      } else {
        // User signed out — clean up everything
        setIsAdmin(false);
        setLikedSongs([]);
        stopTokenRefreshTimer();
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
      stopTokenRefreshTimer();
    };
  }, [startTokenRefreshTimer, stopTokenRefreshTimer]);

  // ─── Auth actions ───────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(() => signInWithPopup(auth, googleProvider), []);

  const logout = useCallback(async () => {
    stopTokenRefreshTimer();
    await signOut(auth);
  }, [stopTokenRefreshTimer]);

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