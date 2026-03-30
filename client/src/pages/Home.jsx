import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import Navbar from '../components/Navbar';
import SongList from '../components/SongList';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';

const Home = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const res = await axiosInstance.get('/api/songs');
        setSongs(res.data);
      } catch (err) {
        console.error('Failed to fetch songs:', err);
      }
      setLoading(false);
    };
    fetchSongs();
  }, []);

  if (loading) return <Loader />;

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        {/* Header row */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.heading}>Your Library</h1>
            <p style={styles.subheading}>{songs.length} songs available</p>
          </div>
          <SearchBar />
        </div>
        <SongList songs={songs} />
      </div>
      {/* bottom padding for player */}
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
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '28px',
  },
  heading: {
    color: '#fff',
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '-0.3px',
    marginBottom: '4px',
  },
  subheading: {
    color: '#6b7280',
    fontSize: '13px',
  },
};

export default Home;