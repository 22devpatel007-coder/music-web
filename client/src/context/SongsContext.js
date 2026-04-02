import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import axiosInstance from '../utils/axiosInstance';

const SongsContext = createContext({
  songs:   [],
  loading: true,
  error:   null,
  refetch: () => {},
});

export const useSongs = () => {
  const ctx = useContext(SongsContext);
  if (!ctx) {
    console.error('[useSongs] Called outside <SongsProvider>. Returning safe defaults.');
    return { songs: [], loading: false, error: 'No provider', refetch: () => {} };
  }
  return ctx;
};

export const SongsProvider = ({ children }) => {
  const [songs,   setSongs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Track whether we've already done a cache-busted retry to avoid loops
  const retriedRef = useRef(false);

  const fetchSongs = useCallback(async ({ bust = false } = {}) => {
    setLoading(true);
    setError(null);
    const url = bust
      ? `/api/songs?_=${Date.now()}`
      : '/api/songs';

    try {
      const res = await axiosInstance.get(url);

      if (!Array.isArray(res.data)) {
        // Genuine 304 empty body — retry once
        if (!retriedRef.current) {
          retriedRef.current = true;
          fetchSongs({ bust: true });
        } else {
          setSongs([]);
          setLoading(false);
        }
        return;
      }

      // res.data is a valid array (including empty) — accept it
      retriedRef.current = false;
      setSongs(res.data);
    } catch (err) {
      console.error('[SongsContext] fetch failed:', err.message);

      // PERMANENT FIX: On 401, the token may not have been ready.
      // Retry once with a short delay to let AuthContext settle.
      if (err.response?.status === 401 && !retriedRef.current) {
        retriedRef.current = true;
        console.warn('[SongsContext] 401 on /api/songs — retrying in 1s...');
        setTimeout(() => fetchSongs({ bust: true }), 1000);
        return;
      }

      setError(err.message);
    } finally {
      // Only clear loading if we're not about to retry
      if (retriedRef.current === false || bust) {
        setLoading(false);
      }
    }
  }, []);

  // PERMANENT FIX: Use a tiny setTimeout(0) so the fetch always starts
  // *after* AuthContext's onAuthStateChanged has had a chance to fire and
  // set the token. Without this, the fetch can race ahead of the token on
  // cold loads.
  useEffect(() => {
    const timer = setTimeout(() => fetchSongs(), 0);
    return () => clearTimeout(timer);
  }, [fetchSongs]);

  // Public refetch — always cache-busts so callers get fresh data
  const refetch = useCallback(() => {
    retriedRef.current = false;
    fetchSongs({ bust: true });
  }, [fetchSongs]);

  return (
    <SongsContext.Provider value={{ songs, loading, error, refetch }}>
      {children}
    </SongsContext.Provider>
  );
};

export default SongsContext;