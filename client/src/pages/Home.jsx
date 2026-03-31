import { useState, useEffect, useMemo } from 'react';
import axiosInstance from '../utils/axiosInstance';
import Navbar from '../components/Navbar';
import SongList from '../components/SongList';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';
import { usePlayer } from '../context/PlayerContext';

const Home = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState('All');
  const { recentlyPlayed, playSong } = usePlayer();

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

  const genres = useMemo(() => {
    const g = new Set(songs.map(s => s.genre).filter(Boolean));
    return ['All', ...Array.from(g).sort()];
  }, [songs]);

  const filtered = useMemo(() => {
    if (activeGenre === 'All') return songs;
    return songs.filter(s => s.genre === activeGenre);
  }, [songs, activeGenre]);

  // Recently played songs that exist in the current library
  const recentSongs = useMemo(() => {
    if (!recentlyPlayed.length || !songs.length) return [];
    return recentlyPlayed
      .map(rp => songs.find(s => s.id === (rp.id || rp)))
      .filter(Boolean)
      .slice(0, 10);
  }, [recentlyPlayed, songs]);

  if (loading) return <Loader />;

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.heading}>Your Library</h1>
            <p style={styles.subheading}>{songs.length} songs available</p>
          </div>
          <SearchBar />
        </div>

        {/* Recently Played */}
        {recentSongs.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Recently Played
            </h2>
            <div style={styles.recentScroll}>
              {recentSongs.map(song => (
                <div
                  key={song.id}
                  onClick={() => playSong(song, recentSongs)}
                  style={styles.recentChip}
                  title={`${song.title} — ${song.artist}`}
                >
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    style={styles.recentCover}
                    onError={e => { e.target.src = 'https://placehold.co/40x40/111/555?text=♪'; }}
                  />
                  <div style={styles.recentInfo}>
                    <p style={styles.recentTitle}>{song.title}</p>
                    <p style={styles.recentArtist}>{song.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Genre Pills */}
        {genres.length > 1 && (
          <div style={styles.pillsRow}>
            {genres.map(g => (
              <button
                key={g}
                onClick={() => setActiveGenre(g)}
                style={{
                  ...styles.pill,
                  ...(activeGenre === g ? styles.pillActive : {}),
                }}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        <SongList songs={filtered} />
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
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: '16px', marginBottom: '24px',
  },
  heading: {
    color: '#fff', fontSize: '22px', fontWeight: '700',
    letterSpacing: '-0.3px', marginBottom: '4px',
  },
  subheading: { color: '#6b7280', fontSize: '13px' },

  section: { marginBottom: '28px' },
  sectionTitle: {
    display: 'flex', alignItems: 'center',
    color: '#9ca3af', fontSize: '12px', fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px',
  },
  recentScroll: {
    display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px',
    scrollbarWidth: 'none', msOverflowStyle: 'none',
  },
  recentChip: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: '8px',
    padding: '8px 12px 8px 8px', cursor: 'pointer', flexShrink: 0,
    minWidth: '160px', maxWidth: '200px', transition: 'background 0.15s',
  },
  recentCover: {
    width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0,
  },
  recentInfo: { minWidth: 0 },
  recentTitle: {
    color: '#fff', fontSize: '12px', fontWeight: '600',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  recentArtist: {
    color: '#6b7280', fontSize: '11px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },

  pillsRow: {
    display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px',
  },
  pill: {
    background: '#1a1a1a', border: '1px solid #2d2d2d',
    color: '#9ca3af', borderRadius: '20px', padding: '6px 14px',
    fontSize: '13px', fontWeight: '500', cursor: 'pointer',
    transition: 'all 0.15s', fontFamily: 'inherit',
  },
  pillActive: {
    background: 'rgba(34,197,94,0.1)', borderColor: '#22c55e',
    color: '#22c55e',
  },
};

export default Home;