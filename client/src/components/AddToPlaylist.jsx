import { useState } from 'react';
import { usePlaylist } from '../context/PlaylistContext';
import CreatePlaylistModal from './CreatePlaylistModal';

const AddToPlaylist = ({ song, onClose }) => {
  const { playlists, addSongToPlaylist } = usePlaylist();
  const [showCreate, setShowCreate] = useState(false);
  const [added, setAdded]           = useState({});

  const handleAdd = async (playlistId) => {
    await addSongToPlaylist(playlistId, song.id);
    setAdded(prev => ({ ...prev, [playlistId]: true }));
  };

  if (showCreate) {
    return (
      <CreatePlaylistModal
        onClose={() => setShowCreate(false)}
        navigateOnCreate={false}
      />
    );
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Add to playlist</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.songRow}>
          <img src={song.coverUrl} alt={song.title} style={styles.songCover}
            onError={e => { e.target.src = 'https://placehold.co/40x40/111/555?text=♪'; }} />
          <div>
            <p style={styles.songTitle}>{song.title}</p>
            <p style={styles.songArtist}>{song.artist}</p>
          </div>
        </div>

        <div style={styles.divider} />

        <button style={styles.newBtn} onClick={() => setShowCreate(true)}>
          + New playlist
        </button>

        <div style={styles.list}>
          {playlists.length === 0 && (
            <p style={styles.empty}>No playlists yet.</p>
          )}
          {playlists.map(pl => {
            const alreadyIn = pl.songIds?.includes(song.id);
            const justAdded = added[pl.id];
            return (
              <div key={pl.id} style={styles.plRow}>
                <div style={styles.plInfo}>
                  <p style={styles.plName}>{pl.name}</p>
                  <p style={styles.plCount}>{pl.songIds?.length || 0} songs</p>
                </div>
                <button
                  onClick={() => handleAdd(pl.id)}
                  disabled={alreadyIn || justAdded}
                  style={{
                    ...styles.addBtn,
                    opacity: (alreadyIn || justAdded) ? 0.5 : 1,
                    color: justAdded ? '#22c55e' : '#4ade80',
                  }}
                >
                  {alreadyIn ? 'Added' : justAdded ? '✓ Added' : 'Add'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles = {
  backdrop:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 },
  modal:      { background: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380, fontFamily: "'Inter', sans-serif" },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:      { color: '#fff', fontSize: 16, fontWeight: 700 },
  closeBtn:   { background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16, padding: 4 },
  songRow:    { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  songCover:  { width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 },
  songTitle:  { color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 2 },
  songArtist: { color: '#6b7280', fontSize: 11 },
  divider:    { height: 1, background: '#2d2d2d', marginBottom: 12 },
  newBtn:     { background: 'none', border: '1px dashed #2d2d2d', borderRadius: 8, color: '#9ca3af', fontSize: 13, padding: '8px 14px', cursor: 'pointer', width: '100%', textAlign: 'left', marginBottom: 8, fontFamily: 'inherit' },
  list:       { maxHeight: 260, overflowY: 'auto' },
  empty:      { color: '#6b7280', fontSize: 13, padding: '16px 0', textAlign: 'center' },
  plRow:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1f1f1f' },
  plInfo:     { minWidth: 0 },
  plName:     { color: '#fff', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  plCount:    { color: '#6b7280', fontSize: 11 },
  addBtn:     { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', fontWeight: 500 },
};

export default AddToPlaylist;