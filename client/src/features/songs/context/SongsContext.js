import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import axiosInstance, { extractSongs } from 'shared/utils/axiosInstance';

const SongsContext = createContext({
  songs:        [],
  loading:      true,
  loadingMore:  false,
  error:        null,
  hasMore:      false,
  fetchMore:    () => {},
  refetch:      () => {},
});

export const useSongs = () => {
  const ctx = useContext(SongsContext);
  if (!ctx) {
    console.error('[useSongs] Called outside <SongsProvider>. Returning safe defaults.');
    return { songs: [], loading: false, loadingMore: false, error: 'No provider', hasMore: false, fetchMore: () => {}, refetch: () => {} };
  }
  return ctx;
};

export const SongsProvider = ({ children }) => {
  const [songs,       setSongs]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);
  const [nextCursor,  setNextCursor]  = useState(null);
  const [hasMore,     setHasMore]     = useState(false);

  const retriedRef = useRef(false);

  const fetchSongs = useCallback(async ({ bust = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/songs?limit=30${bust ? `&_=${Date.now()}` : ''}`;
      const res = await axiosInstance.get(url);
      const arr = extractSongs(res.data);
      setSongs(arr);
      setNextCursor(res.data?.nextCursor ?? null);
      setHasMore(res.data?.hasMore ?? false);
      retriedRef.current = false;
    } catch (err) {
      console.error('[SongsContext] fetch failed:', err.message);

      if (err.response?.status === 401 && !retriedRef.current) {
        retriedRef.current = true;
        console.warn('[SongsContext] 401 on /api/songs — retrying in 1s...');
        setTimeout(() => fetchSongs({ bust: true }), 1000);
        return;
      }

      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await axiosInstance.get(`/api/songs?limit=30&cursor=${nextCursor}`);
      const arr = extractSongs(res.data);
      setSongs(prev => [...prev, ...arr]);
      setNextCursor(res.data?.nextCursor ?? null);
      setHasMore(res.data?.hasMore ?? false);
    } catch (err) {
      console.error('[SongsContext] fetchMore failed:', err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextCursor]);

  useEffect(() => {
    const timer = setTimeout(() => fetchSongs(), 0);
    return () => clearTimeout(timer);
  }, [fetchSongs]);

  const refetch = useCallback(() => {
    retriedRef.current = false;
    fetchSongs({ bust: true });
  }, [fetchSongs]);

  return (
    <SongsContext.Provider value={{
      songs, loading, loadingMore, error,
      hasMore, fetchMore, refetch,
    }}>
      {children}
    </SongsContext.Provider>
  );
};

export default SongsContext;