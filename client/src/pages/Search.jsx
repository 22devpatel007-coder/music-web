import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import Navbar from '../components/Navbar';
import SongList from '../components/SongList';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setSongs([]); return; }
    let active = true;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/api/search?q=${encodeURIComponent(query)}`);
        if (active) setSongs(res.data);
      } catch (err) {
        console.error('Search failed:', err);
      }
      if (active) setLoading(false);
    };
    fetch();
    return () => { active = false; };
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
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 20px 0',
  },
  header: {
    marginBottom: '28px',
  },
  resultInfo: {
    marginBottom: '20px',
  },
  resultText: {
    color: '#9ca3af',
    fontSize: '14px',
  },
  resultQuery: {
    color: '#fff',
    fontWeight: '600',
  },
  resultCount: {
    color: '#6b7280',
  },
  hintText: {
    color: '#6b7280',
    fontSize: '14px',
  },
};

export default Search;