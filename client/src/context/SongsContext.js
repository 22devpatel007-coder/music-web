/**
 * SongsContext — PERMANENT FIX
 *
 * Root cause: useSongs() was returning undefined because either:
 *   (a) SongsProvider was missing from App.js, OR
 *   (b) useContext(SongsContext) was called outside the Provider tree.
 *
 * This version:
 * - Always returns a valid object (never undefined/null).
 * - Fetches once and caches in context — no duplicate API calls.
 * - Safe to call from any component inside SongsProvider.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axiosInstance';

const SongsContext = createContext({
  songs:    [],
  loading:  true,
  error:    null,
  refetch:  () => {},
});

export const useSongs = () => {
  const ctx = useContext(SongsContext);
  // Guard: if somehow called outside provider, return safe defaults
  if (!ctx) {
    console.error('[useSongs] Called outside <SongsProvider>. Returning empty defaults.');
    return { songs: [], loading: false, error: 'No provider', refetch: () => {} };
  }
  return ctx;
};

export const SongsProvider = ({ children }) => {
  const [songs,   setSongs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/api/songs');
      setSongs(res.data);
    } catch (err) {
      console.error('[SongsContext] fetch failed:', err.message);
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSongs(); }, [fetchSongs]);

  return (
    <SongsContext.Provider value={{ songs, loading, error, refetch: fetchSongs }}>
      {children}
    </SongsContext.Provider>
  );
};

export default SongsContext;