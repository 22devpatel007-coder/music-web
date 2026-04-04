import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { auth, googleProvider, db } from '../../../firebase';
import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const REFRESH_INTERVAL_MS = 55 * 60 * 1000;

// PERMANENT FIX: If onAuthStateChanged never fires (bad Firebase config,
// network timeout, etc.), this safety timeout forces loading=false after
// 8 seconds so the app never hangs on the loading screen forever.
const AUTH_TIMEOUT_MS = 8000;

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [likedSongs, setLikedSongs]   = useState([]);
  const [authError, setAuthError]     = useState(null);

  const refreshTimerRef = useRef(null);
  const authTimeoutRef  = useRef(null);

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
    // PERMANENT FIX: Safety timeout — if Firebase never calls back
    // (misconfigured env vars, blocked network, extension interference),
    // we stop the loading spinner so the user sees the login page
    // instead of being stuck forever.
    authTimeoutRef.current = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('[AuthContext] Auth timeout — Firebase did not respond in 8s. Check your .env REACT_APP_FIREBASE_* variables.');
          setAuthError('Firebase did not respond. Check your environment configuration.');
        }
        return false;
      });
    }, AUTH_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Clear the safety timeout — Firebase responded normally
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }

      setCurrentUser(user);

      if (user) {
        // PERMANENT FIX: Set loading=false immediately so the page renders.
        // Background data (liked songs, admin status) loads asynchronously
        // without blocking the UI.
        setLoading(false);

        try {
          const [tokenResult, userDocSnap] = await Promise.all([
            user.getIdTokenResult(false).catch(() => null),
            getDoc(doc(db, 'users', user.uid)).catch(() => null),
          ]);

          if (tokenResult) {
            setIsAdmin(tokenResult.claims.role === 'admin');
          }

          if (userDocSnap && userDocSnap.exists()) {
            setLikedSongs(userDocSnap.data().likedSongs || []);
          } else if (userDocSnap !== null) {
            // First-time Google sign-in — create user doc
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
          // Non-fatal — user is still logged in, just missing liked songs / admin flag
          console.warn('[AuthContext] Background data fetch failed:', err.message);
        }

        startTokenRefreshTimer(user);
      } else {
        // Logged out
        setIsAdmin(false);
        setLikedSongs([]);
        stopTokenRefreshTimer();
        setLoading(false);
      }
    },
    // PERMANENT FIX: Handle Firebase auth errors (e.g. API key invalid).
    // Without this second argument, auth errors are silent and loading
    // stays true forever.
    (error) => {
      console.error('[AuthContext] onAuthStateChanged error:', error.code, error.message);
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
      setAuthError(`Firebase Auth error: ${error.message}`);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      stopTokenRefreshTimer();
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    };
  }, [startTokenRefreshTimer, stopTokenRefreshTimer]);

  // Tab-focus token refresh
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
      authError,
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
    <p style={{ color: '#4b5563', fontSize: '11px' }}>
      Taking too long?{' '}
      <span
        onClick={() => window.location.reload()}
        style={{ color: '#22c55e', cursor: 'pointer', textDecoration: 'underline' }}
      >
        Refresh
      </span>
    </p>
  </div>
);