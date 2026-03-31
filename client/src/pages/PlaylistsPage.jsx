import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import { usePlaylist } from '../context/PlaylistContext';
import CreatePlaylistModal from '../components/CreatePlaylistModal';

const PlaylistsPage = () => {
  const { playlists, loading, deletePlaylist } = usePlaylist();
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = async (id) => {
    await deletePlaylist(id);
    setConfirmDelete(null);
  };

  if (loading) return <Loader />;

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>

        <div style={styles.header}>
          <div>
            <h1 style={styles.heading}>Your Playlists</h1>
            <p style={styles.sub}>{playlists.length} playlists</p>
          </div>
          <button style={styles.createBtn} onClick={() => setShowCreate(true)}>
            + New Playlist
          </button>
        </div>

        <div style={styles.divider} />

        {playlists.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyTitle}>No playlists yet</p>
            <p style={styles.emptySub}>Create one to organise your favourite songs.</p>
            <button style={styles.createBtn} onClick={() => setShowCreate(true)}>
              Create your first playlist
            </button>
          </div>
        ) : (
          <div className="playlist-grid">
            {playlists.map(pl => (
              <PlaylistCard
                key={pl.id}
                playlist={pl}
                onDelete={() => setConfirmDelete(pl.id)}
                confirmingDelete={confirmDelete === pl.id}
                onCancelDelete={() => setConfirmDelete(null)}
                onConfirmDelete={() => handleDelete(pl.id)}
              />
            ))}
          </div>
        )}
      </div>
      <div style={{ height: 88 }} />

      {showCreate && (
        <CreatePlaylistModal onClose={() => setShowCreate(false)} />
      )}

      <style>{`
        .playlist-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        @media (min-width: 480px) { .playlist-grid { grid-template-columns: repeat(3,1fr); } }
        @media (min-width: 768px) { .playlist-grid { grid-template-columns: repeat(4,1fr); } }
        @media (min-width: 1024px){ .playlist-grid { grid-template-columns: repeat(5,1fr); } }
      `}</style>
    </div>
  );
};

const PlaylistCard = ({ playlist, onDelete, confirmingDelete, onCancelDelete, onConfirmDelete }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ ...cardStyles.card, background: hovered ? '#222' : '#1a1a1a' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={`/playlists/${playlist.id}`} style={{ textDecoration: 'none' }}>
        <div style={cardStyles.imgWrap}>
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.name} style={cardStyles.img}
              onError={e => { e.target.src = 'https://placehold.co/200x200/1a1a1a/555?text=♪'; }} />
          ) : (
            <div style={cardStyles.placeholder}>♪</div>
          )}
          <div style={{ ...cardStyles.overlay, opacity: hovered ? 1 : 0 }}>
            <div style={cardStyles.playBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                <path d="M8 5.14v14l11-7-11-7z"/>
              </svg>
            </div>
          </div>
        </div>
        <div style={cardStyles.info}>
          <p style={cardStyles.name}>{playlist.name}</p>
          <p style={cardStyles.count}>{playlist.songIds?.length || 0} songs</p>
        </div>
      </Link>

      <div style={cardStyles.actions}>
        {confirmingDelete ? (
          <>
            <button onClick={onConfirmDelete} style={cardStyles.btnDanger}>Delete</button>
            <button onClick={onCancelDelete} style={cardStyles.btnCancel}>Cancel</button>
          </>
        ) : (
          <button onClick={onDelete} style={cardStyles.btnDelete}>Delete</button>
        )}
      </div>
    </div>
  );
};

const styles = {
  page:      { minHeight: '100vh', background: '#0f0f0f', fontFamily: "'Inter', sans-serif" },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '36px 20px 0' },
  header:    { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  heading:   { color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 4 },
  sub:       { color: '#6b7280', fontSize: 13 },
  divider:   { height: 1, background: '#2d2d2d', marginBottom: 28 },
  createBtn: { background: '#22c55e', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  empty:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 20px', textAlign: 'center' },
  emptyTitle:{ color: '#fff', fontSize: 16, fontWeight: 600 },
  emptySub:  { color: '#6b7280', fontSize: 13 },
};

const cardStyles = {
  card:        { background: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: 12, overflow: 'hidden', transition: 'background 0.2s', fontFamily: "'Inter', sans-serif" },
  imgWrap:     { position: 'relative', width: '100%', paddingBottom: '100%', background: '#111' },
  img:         { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  placeholder: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#4b5563' },
  overlay:     { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' },
  playBtn:     { width: 44, height: 44, background: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  info:        { padding: '12px 14px 8px' },
  name:        { color: '#fff', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 },
  count:       { color: '#6b7280', fontSize: 12 },
  actions:     { display: 'flex', gap: 6, padding: '0 14px 12px' },
  btnDelete:   { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' },
  btnDanger:   { background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnCancel:   { background: '#2d2d2d', color: '#9ca3af', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' },
};

export default PlaylistsPage;