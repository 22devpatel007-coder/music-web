import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';

const MusicList = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => { fetchSongs(); }, []);

  const fetchSongs = async () => {
    try {
      const res = await axiosInstance.get('/api/songs');
      setSongs(res.data);
    } catch (err) {
      console.error('Failed to fetch songs:', err);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await axiosInstance.delete(`/api/songs/${id}`);
      setSongs(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setDeletingId(null);
    setConfirmId(null);
  };

  if (loading) return <Loader />;

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h1 style={styles.heading}>Manage Songs</h1>
          <p style={styles.subheading}>{songs.length} tracks in library</p>
        </div>

        {songs.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>♪</div>
            <p style={styles.emptyTitle}>No songs yet</p>
            <p style={styles.emptyDesc}>Upload your first track from the admin dashboard.</p>
          </div>
        ) : (
          <div style={styles.table}>
            {/* Header */}
            <div style={styles.tableHeader}>
              <span style={{ ...styles.col, flex: 2 }}>Song</span>
              <span style={{ ...styles.col, flex: 1 }}>Artist</span>
              <span style={{ ...styles.col, flex: 1 }}>Genre</span>
              <span style={{ ...styles.col, width: 120, flex: 'none' }}>Actions</span>
            </div>
            {/* Rows */}
            {songs.map(song => (
              <div key={song.id} style={styles.tableRow}>
                <div style={{ ...styles.cellFlex, flex: 2, minWidth: 0 }}>
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    style={styles.cover}
                    onError={e => { e.target.src = 'https://placehold.co/40x40/111/555?text=♪'; }}
                  />
                  <span style={styles.songTitle}>{song.title}</span>
                </div>
                <span style={{ ...styles.cellText, flex: 1, color: '#9ca3af' }}>{song.artist}</span>
                <div style={{ flex: 1 }}>
                  <span style={styles.badge}>{song.genre}</span>
                </div>
                <div style={{ width: 120, flex: 'none', display: 'flex', gap: '8px' }}>
                  {confirmId === song.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(song.id)}
                        disabled={deletingId === song.id}
                        style={{ ...styles.btnDanger, opacity: deletingId === song.id ? 0.6 : 1 }}
                      >
                        {deletingId === song.id ? '…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        style={styles.btnCancel}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmId(song.id)}
                      style={styles.btnDelete}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '32px 20px 80px',
  },
  pageHeader: { marginBottom: '24px' },
  heading: {
    color: '#fff',
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '-0.3px',
    marginBottom: '4px',
  },
  subheading: { color: '#6b7280', fontSize: '13px' },

  table: {
    background: '#1a1a1a',
    border: '1px solid #2d2d2d',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    borderBottom: '1px solid #2d2d2d',
  },
  col: {
    color: '#4b5563',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #1f1f1f',
    transition: 'background 0.15s',
  },
  cellFlex: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
    overflow: 'hidden',
  },
  cellText: {
    fontSize: '13px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cover: {
    width: '38px',
    height: '38px',
    borderRadius: '6px',
    objectFit: 'cover',
    background: '#111',
    flexShrink: 0,
  },
  songTitle: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badge: {
    background: 'rgba(34,197,94,0.1)',
    color: '#22c55e',
    border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '500',
  },
  btnDelete: {
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  },
  btnDanger: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  btnCancel: {
    background: '#2d2d2d',
    color: '#9ca3af',
    border: 'none',
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  empty: {
    textAlign: 'center',
    padding: '80px 20px',
  },
  emptyIcon: {
    width: '56px',
    height: '56px',
    background: '#1a1a1a',
    border: '1px solid #2d2d2d',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    margin: '0 auto 16px',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '6px',
  },
  emptyDesc: {
    color: '#6b7280',
    fontSize: '13px',
  },
};

export default MusicList;