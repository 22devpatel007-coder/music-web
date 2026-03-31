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

const REFRESH_INTERVAL_MS = 55 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [likedSongs, setLikedSongs]   = useState([]);

  const refreshTimerRef = useRef(null);

  const startTokenRefreshTimer = useCallback((user) => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(async () => {
      try { await user.getIdToken(true); }
      catch (err) {
        console.error('[AuthContext] Token refresh failed:', err.message);
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // STEP 1: Set user immediately — page can start rendering right away
      setCurrentUser(user);

      if (user) {
        // STEP 2: Show the page first, load extra data in background
        setLoading(false);

        // STEP 3: Fetch Firestore doc + token claim in background
        // User already sees the page — this just fills in liked songs + admin status
        try {
          const [tokenResult, userDocSnap] = await Promise.all([
            // FIX: getIdToken(false) uses CACHED token — no network call needed
            // unless the token is about to expire. Much faster than getIdTokenResult()
            user.getIdTokenResult(false).catch(() => null),
            getDoc(doc(db, 'users', user.uid)).catch(() => null),
          ]);

          // Set admin status from cached token claim
          if (tokenResult) {
            setIsAdmin(tokenResult.claims.role === 'admin');
          }

          // Set liked songs
          if (userDocSnap && userDocSnap.exists()) {
            setLikedSongs(userDocSnap.data().likedSongs || []);
          } else if (userDocSnap !== null) {
            // First time Google sign-in — create user doc
            await setDoc(doc(db, 'users', user.uid), {
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
          // Background fetch failed — safe defaults already set, user is still logged in
          console.warn('[AuthContext] Background setup failed:', err.message);
        }

        startTokenRefreshTimer(user);
      } else {
        // Logged out
        setIsAdmin(false);
        setLikedSongs([]);
        stopTokenRefreshTimer();
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      stopTokenRefreshTimer();
    };
  }, [startTokenRefreshTimer, stopTokenRefreshTimer]);

  // Tab focus token refresh
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      const user = auth.currentUser;
      if (!user) return;
      try {
        const tokenResult = await user.getIdTokenResult(false);
        const msLeft = new Date(tokenResult.expirationTime).getTime() - Date.now();
        if (msLeft < 5 * 60 * 1000) await user.getIdToken(true);
      } catch (err) {
        console.error('[AuthContext] Focus refresh failed:', err.message);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const signInWithGoogle = useCallback(() => signInWithPopup(auth, googleProvider), []);

  const logout = useCallback(async () => {
    stopTokenRefreshTimer();
    await signOut(auth);
  }, [stopTokenRefreshTimer]);

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAdmin,
      loading,
      logout,
      signInWithGoogle,
      likedSongs,
      setLikedSongs,
    }}>
      {loading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
};

const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh',
    background: '#0f0f0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '16px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  }}>
    <div style={{
      width: '36px', height: '36px',
      border: '3px solid #2d2d2d',
      borderTop: '3px solid #22c55e',
      borderRadius: '50%',
      animation: 'spin 0.75s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ color: '#6b7280', fontSize: '13px' }}>Loading MeloStream…</p>
  </div>
);