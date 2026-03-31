import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../utils/axiosInstance';

// FIX: Was a stub that always returned [] and did nothing.
// Now properly fetches songs from the API with loading + error state.
export default function useSongs() {
  const [songs, setSongs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/api/songs');
      setSongs(res.data);
    } catch (err) {
      console.error('[useSongs] Failed to fetch songs:', err.message);
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  return { songs, loading, error, refetch: fetchSongs };
}