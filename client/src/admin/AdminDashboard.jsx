import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import Navbar from '../components/Navbar';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ songs: 0, users: 0 });
  const [recentSongs, setRecentSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [songsRes, usersRes] = await Promise.all([
          axiosInstance.get('/api/songs'),
          axiosInstance.get('/api/users'),
        ]);
        setStats({ songs: songsRes.data.length, users: usersRes.data.length });
        setRecentSongs(songsRes.data.slice(0, 6));
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h1 style={styles.heading}>Dashboard</h1>
          <p style={styles.subheading}>Overview of your MeloStream platform</p>
        </div>

        {/* Stat Cards */}
        <div style={styles.statsRow}>
          <StatCard label="Total Songs" value={loading ? '…' : stats.songs} icon="🎵" />
          <StatCard label="Registered Users" value={loading ? '…' : stats.users} icon="👤" />
        </div>

        {/* Quick Links */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Quick Actions</h2>
          <div style={styles.actionsRow}>
            <ActionLink to="/admin/upload" primary label="Upload Song" desc="Add new music" icon="↑" />
            <ActionLink to="/admin/songs" label="Manage Songs" desc="View & delete tracks" icon="♪" />
            <ActionLink to="/admin/users" label="View Users" desc="All registered accounts" icon="◎" />
          </div>
        </div>

        {/* Recent uploads */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Recent Uploads</h2>
          {recentSongs.length === 0 ? (
            <p style={styles.empty}>No songs uploaded yet.</p>
          ) : (
            <div style={styles.recentList}>
              {recentSongs.map(song => (
                <div key={song.id} style={styles.recentItem}>
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    style={styles.recentCover}
                    onError={e => { e.target.src = 'https://placehold.co/48x48/111/555?text=♪'; }}
                  />
                  <div style={styles.recentInfo}>
                    <p style={styles.recentTitle}>{song.title}</p>
                    <p style={styles.recentArtist}>{song.artist}</p>
                  </div>
                  <span style={styles.recentGenre}>{song.genre}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }) => (
  <div style={styles.statCard}>
    <div style={styles.statIconWrap}>{icon}</div>
    <div>
      <p style={styles.statValue}>{value}</p>
      <p style={styles.statLabel}>{label}</p>
    </div>
  </div>
);

const ActionLink = ({ to, label, desc, icon, primary }) => (
  <Link to={to} style={{ ...styles.actionCard, ...(primary ? styles.actionCardPrimary : {}) }}>
    <div style={{ ...styles.actionIcon, ...(primary ? styles.actionIconPrimary : {}) }}>{icon}</div>
    <div>
      <p style={{ ...styles.actionLabel, ...(primary ? styles.actionLabelPrimary : {}) }}>{label}</p>
      <p style={styles.actionDesc}>{desc}</p>
    </div>
  </Link>
);

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
  pageHeader: { marginBottom: '28px' },
  heading: {
    color: '#fff',
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '-0.3px',
    marginBottom: '4px',
  },
  subheading: { color: '#6b7280', fontSize: '13px' },

  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '14px',
    marginBottom: '32px',
  },
  statCard: {
    background: '#1a1a1a',
    border: '1px solid #2d2d2d',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  statIconWrap: {
    width: '44px',
    height: '44px',
    background: 'rgba(34,197,94,0.1)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  statValue: {
    color: '#22c55e',
    fontSize: '28px',
    fontWeight: '800',
    letterSpacing: '-1px',
    lineHeight: 1,
    marginBottom: '4px',
  },
  statLabel: { color: '#6b7280', fontSize: '12px' },

  section: { marginBottom: '32px' },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: '14px',
  },

  actionsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
  },
  actionCard: {
    background: '#1a1a1a',
    border: '1px solid #2d2d2d',
    borderRadius: '12px',
    padding: '18px',
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    transition: 'border-color 0.2s',
  },
  actionCardPrimary: {
    background: 'rgba(34,197,94,0.08)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  actionIcon: {
    width: '34px',
    height: '34px',
    background: '#2d2d2d',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    color: '#9ca3af',
    fontWeight: '700',
  },
  actionIconPrimary: { background: '#22c55e', color: '#000' },
  actionLabel: { color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '2px' },
  actionLabelPrimary: { color: '#22c55e' },
  actionDesc: { color: '#6b7280', fontSize: '12px' },

  recentList: {
    background: '#1a1a1a',
    border: '1px solid #2d2d2d',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  recentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #2d2d2d',
  },
  recentCover: {
    width: '40px',
    height: '40px',
    borderRadius: '7px',
    objectFit: 'cover',
    background: '#111',
    flexShrink: 0,
  },
  recentInfo: { flex: 1, minWidth: 0 },
  recentTitle: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  recentArtist: { color: '#6b7280', fontSize: '11px' },
  recentGenre: {
    background: 'rgba(34,197,94,0.1)',
    color: '#22c55e',
    border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '500',
    flexShrink: 0,
  },
  empty: { color: '#6b7280', fontSize: '14px' },
};

export default AdminDashboard;