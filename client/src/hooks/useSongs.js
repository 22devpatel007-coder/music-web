// This hook is kept for backward compatibility only.
// Prefer useSongs() from context/SongsContext.js which handles pagination.
import { useEffect, useState, useCallback } from 'react';
import axiosInstance, { extractSongs } from '../utils/axiosInstance';

export default function useSongs() {
  const [songs,   setSongs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/api/songs?limit=30');
      setSongs(extractSongs(res.data));
    } catch (err) {
      console.error('[useSongs] Failed to fetch songs:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSongs(); }, [fetchSongs]);

  return { songs, loading, error, refetch: fetchSongs };
}