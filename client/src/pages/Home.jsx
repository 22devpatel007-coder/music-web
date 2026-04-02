import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import axiosInstance from '../utils/axiosInstance';
import Navbar from '../components/Navbar';
import SongList from '../components/SongList';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylist } from '../context/PlaylistContext';

const fmtDuration = (secs) => {
  if (!secs && secs !== 0) return null;
  const n = Number(secs);
  if (isNaN(n) || n <= 0) return null;
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const Home = () => {
  const [songs,       setSongs]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeGenre, setActiveGenre] = useState('All');

  // Use adminPlaylists from context instead of fetching separately
  // This avoids the compound Firestore query that needs a composite index
  const { adminPlaylists } = usePlaylist();

  const { recentlyPlayed, playSong, currentSong, isPlaying } = usePlayer();

  /* ── Fetch songs ─────────────────────────────────────────────────────────── */
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

  /* ── Derived data ────────────────────────────────────────────────────────── */
  const genres = useMemo(() => {
    const g = new Set(songs.map((s) => s.genre).filter(Boolean));
    return ['All', ...Array.from(g).sort()];
  }, [songs]);

  const filtered = useMemo(
    () => (activeGenre === 'All' ? songs : songs.filter((s) => s.genre === activeGenre)),
    [songs, activeGenre]
  );

  // Admin-featured songs — max 10, newest first
  const featuredSongs = useMemo(
    () => songs.filter((s) => s.featured === true).slice(0, 10),
    [songs]
  );

  // Recently played songs that exist in the current library
  const recentSongs = useMemo(() => {
    if (!recentlyPlayed.length || !songs.length) return [];
    return recentlyPlayed
      .map((rp) => songs.find((s) => s.id === (rp.id || rp)))
      .filter(Boolean)
      .slice(0, 10);
  }, [recentlyPlayed, songs]);

  // Featured playlists — only show isFeatured ones from adminPlaylists
  // adminPlaylists already fetched in PlaylistContext with no compound index needed
  const featuredPlaylists = useMemo(
    () => adminPlaylists.filter((p) => p.isFeatured === true),
    [adminPlaylists]
  );

  if (loading) return <Loader />;

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>

        {/* Page header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.heading}>Your Library</h1>
            <p style={styles.subheading}>{songs.length} songs available</p>
          </div>
          <SearchBar />
        </div>

        {/* ── Featured / Pinned Songs ─────────────────────────────────────── */}
        {featuredSongs.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <StarIcon />
              Featured
            </h2>
            <div style={styles.featuredGrid}>
              {featuredSongs.map((song) => {
                const active = currentSong?.id === song.id;
                const dur    = fmtDuration(song.duration);
                return (
                  <div
                    key={song.id}
                    onClick={() => playSong(song, featuredSongs)}
                    style={{
                      ...styles.featuredCard,
                      outline: active ? '2px solid #22c55e' : '2px solid transparent',
                    }}
                  >
                    <div style={styles.featuredImgWrap}>
                      <img
                        src={song.coverUrl || 'https://placehold.co/120x120/1a1a1a/555?text=♪'}
                        alt={song.title}
                        style={styles.featuredImg}
                        onError={(e) => { e.target.src = 'https://placehold.co/120x120/1a1a1a/555?text=♪'; }}
                      />
                      <div style={styles.featuredOverlay}>
                        {active && isPlaying ? <PauseIcon /> : <PlayIconSmall />}
                      </div>
                    </div>
                    <div style={styles.featuredInfo}>
                      <p style={{ ...styles.featuredTitle, color: active ? '#22c55e' : '#fff' }}>
                        {song.title}
                      </p>
                      <p style={styles.featuredArtist}>{song.artist}</p>
                      <div style={styles.featuredMeta}>
                        <span style={styles.featuredGenre}>{song.genre}</span>
                        {dur && <span style={styles.featuredDur}>{dur}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Recently Played ─────────────────────────────────────────────── */}
        {recentSongs.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <ClockIcon />
              Recently Played
            </h2>
            <div style={styles.recentScroll}>
              {recentSongs.map((song) => (
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
                    onError={(e) => { e.target.src = 'https://placehold.co/40x40/111/555?text=♪'; }}
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

        {/* ── Library Playlists (admin-created, isFeatured) ───────────────── */}
        {featuredPlaylists.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <PlaylistIcon />
              Featured Playlists
            </h2>
            <div style={styles.recentScroll}>
              {featuredPlaylists.map((pl) => (
                <Link
                  key={pl.id}
                  to={`/playlists/${pl.id}`}
                  style={{ ...styles.recentChip, textDecoration: 'none' }}
                >
                  {pl.coverUrl
                    ? <img src={pl.coverUrl} alt={pl.name} style={styles.recentCover}
                        onError={(e) => { e.target.src = 'https://placehold.co/36x36/1a1a1a/555?text=♪'; }} />
                    : <div style={{ ...styles.recentCover, background: '#2d2d2d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: 14 }}>♪</div>
                  }
                  <div style={styles.recentInfo}>
                    <p style={styles.recentTitle}>{pl.name}</p>
                    <p style={styles.recentArtist}>{pl.songIds?.length || 0} songs</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Genre Pills ─────────────────────────────────────────────────── */}
        {genres.length > 1 && (
          <div style={styles.pillsRow}>
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setActiveGenre(g)}
                style={{ ...styles.pill, ...(activeGenre === g ? styles.pillActive : {}) }}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {/* ── Song grid ───────────────────────────────────────────────────── */}
        <SongList songs={filtered} />
      </div>
      <div style={{ height: 88 }} />
    </div>
  );
};

/* ── Icons ────────────────────────────────────────────────────────────────── */
const StarIcon      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" style={{ marginRight: 6, color: '#f59e0b' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const ClockIcon     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const PlaylistIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const PlayIconSmall = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="#000"><path d="M8 5.14v14l11-7-11-7z"/></svg>;
const PauseIcon     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="#000"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>;

/* ── Styles ──────────────────────────────────────────────────────────────── */
const styles = {
  page:      { minHeight: '100vh', background: '#0f0f0f', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '32px 20px 0' },
  header:    { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  heading:   { color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 4 },
  subheading:{ color: '#6b7280', fontSize: 13 },

  section:      { marginBottom: 28 },
  sectionTitle: { display: 'flex', alignItems: 'center', color: '#9ca3af', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 },

  featuredGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 },
  featuredCard:  { display: 'flex', alignItems: 'center', gap: 12, background: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: 10, padding: 10, cursor: 'pointer', transition: 'background 0.15s, outline 0.15s', overflow: 'hidden' },
  featuredImgWrap:{ position: 'relative', flexShrink: 0 },
  featuredImg:   { width: 52, height: 52, borderRadius: 8, objectFit: 'cover', display: 'block' },
  featuredOverlay:{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' },
  featuredInfo:  { flex: 1, minWidth: 0 },
  featuredTitle: { fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 },
  featuredArtist:{ color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 5 },
  featuredMeta:  { display: 'flex', alignItems: 'center', gap: 6 },
  featuredGenre: { background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 500 },
  featuredDur:   { color: '#4b5563', fontSize: 11 },

  recentScroll: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none', msOverflowStyle: 'none' },
  recentChip:   { display: 'flex', alignItems: 'center', gap: 10, background: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: 8, padding: '8px 12px 8px 8px', cursor: 'pointer', flexShrink: 0, minWidth: 160, maxWidth: 200, transition: 'background 0.15s' },
  recentCover:  { width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 },
  recentInfo:   { minWidth: 0 },
  recentTitle:  { color: '#fff', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  recentArtist: { color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

  pillsRow:   { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  pill:       { background: '#1a1a1a', border: '1px solid #2d2d2d', color: '#9ca3af', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' },
  pillActive: { background: 'rgba(34,197,94,0.1)', borderColor: '#22c55e', color: '#22c55e' },
};

export default Home;