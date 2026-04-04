import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../services/api';
import Navbar from '../components/layout/Navbar';
import SongList from '../components/songs/SongList';
import SearchBar from '../components/search/SearchBar';
import Loader from '../components/ui/Loader';

// FIX: Debounce API calls — previously fired on every query change (every keystroke).
// Now waits 300ms after the user stops typing before hitting the server.
const DEBOUNCE_MS = 300;

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) {
      setSongs([]);
      setLoading(false);
      return;
    }

    // Cancel any pending request
    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/api/search?q=${encodeURIComponent(query)}`);
        // FIX: API now returns { songs, total, query } — extract the array safely.
        // Falls back to plain array for backwards compatibility.
        const results = Array.isArray(res.data) ? res.data : (res.data?.songs ?? []);
        setSongs(results);
      } catch (err) {
        console.error('Search failed:', err);
        setSongs([]);
      }
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.header}>
          <SearchBar />
        </div>
        <div style={styles.resultInfo}>
          {query.length >= 2 ? (
            <p style={styles.resultText}>
              Results for <span style={styles.resultQuery}>"{query}"</span>
              {!loading && <span style={styles.resultCount}> — {songs.length} found</span>}
            </p>
          ) : (
            <p style={styles.hintText}>Type at least 2 characters to search</p>
          )}
        </div>
        {loading ? <Loader /> : <SongList songs={songs} />}
      </div>
      <div style={{ height: 88 }} />
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f0f0f',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '32px 20px 0' },
  header: { marginBottom: '28px' },
  resultInfo: { marginBottom: '20px' },
  resultText: { color: '#9ca3af', fontSize: '14px' },
  resultQuery: { color: '#fff', fontWeight: '600' },
  resultCount: { color: '#6b7280' },
  hintText: { color: '#6b7280', fontSize: '14px' },
};

export default Search;