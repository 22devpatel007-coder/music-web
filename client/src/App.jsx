/**
 * client/src/App.jsx
 *
 * Entry point for the React application.
 *
 * Responsibilities:
 *   1. Create the React Query client and register it with authStore so logout
 *      can clear user-specific query caches without importing queryClient
 *      directly into the store (avoids circular dependency with api.js).
 *   2. Subscribe to Firebase Auth state changes and keep Zustand authStore in sync.
 *   3. Render the provider tree and application routes.
 *
 * Auth state flow:
 *   Firebase onAuthStateChanged fires on every token refresh (~every 60 min).
 *   getIdTokenResult() is called each time to read the latest custom claims
 *   so that admin status is always up to date without a page reload.
 */

import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import useAuthStore, { registerQueryClient } from './store/authStore';
import AppRoutes from './routes/index';

// ─── React Query client ───────────────────────────────────────────────────────
// Created once at module level so it survives re-renders.
// retry: 1  — retries a failed request once before surfacing an error.
// staleTime: 60_000  — cached data is considered fresh for 60 seconds,
//   reducing redundant refetches on tab focus / component remount.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

// Register with authStore so logout can call removeQueries on user-specific
// keys without pulling queryClient into the store module directly.
registerQueryClient(queryClient);

// ─── App component ────────────────────────────────────────────────────────────

const App = () => {
  const { setUser, setAdmin, setLoading } = useAuthStore();

  useEffect(() => {
    // onAuthStateChanged fires immediately on mount with the current user
    // (or null), and again whenever the auth state changes.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // getIdTokenResult forces a token refresh if the current token has
        // expired, and returns the latest custom claims (including admin).
        const tokenResult = await firebaseUser.getIdTokenResult();
        setUser(firebaseUser);
        // claims.admin is the boolean custom claim set by setAdminClaim.js.
        // !! normalises undefined → false for non-admin users.
        setAdmin(!!tokenResult.claims.admin);
      } else {
        setUser(null);
        setAdmin(false);
      }
      // Always clear the loading flag regardless of auth outcome so the
      // ProtectedRoute and AdminRoute guards can render their decision.
      setLoading(false);
    });

    // Unsubscribe from the Firebase listener when the component unmounts
    // (only happens in development strict mode double-mount).
    return unsubscribe;
  }, [setUser, setAdmin, setLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;