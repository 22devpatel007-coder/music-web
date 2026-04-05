/**
 * client/src/App.jsx
 *
 * BUG 1 FIX: MusicPlayer was removed from the app shell during refactor.
 * It must be rendered here — inside providers, outside route tree —
 * so it persists across all page navigations without unmounting.
 *
 * MusicPlayer returns null when currentSong is null, so rendering it
 * unconditionally here is safe and correct.
 */

import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import useAuthStore, { registerQueryClient } from './store/authStore';
import AppRoutes from './routes/index';
import MusicPlayer from './components/player/MusicPlayer';

// ─── React Query client ───────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

registerQueryClient(queryClient);

// ─── App component ────────────────────────────────────────────────────────────

const App = () => {
  const { setUser, setAdmin, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        setUser(firebaseUser);
        setAdmin(!!tokenResult.claims.admin);
      } else {
        setUser(null);
        setAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setAdmin, setLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/*
          MusicPlayer lives HERE — at the app shell level.
          - Inside QueryClientProvider and BrowserRouter so it can use hooks.
          - Outside AppRoutes so it is never unmounted when routes change.
          - Returns null internally when no song is playing, so no layout cost.
        */}
        <MusicPlayer />
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;