import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

const SongCard = ({ song, songList }) => {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { currentUser, likedSongs, setLikedSongs } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [liking, setLiking] = useState(false);
  const isActive = currentSong?.id === song.id;
  const isLiked = likedSongs.includes(song.id);

  const handlePlay = (e) => {
    e.stopPropagation();
    // FIX: Removed the duplicate `updateDoc(ref, { playCount: increment(1) })` call
    // that was here. Play count is now incremented exactly once inside PlayerContext.playSong().
    playSong(song, songList);
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!currentUser || liking) return;
    setLiking(true);
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      if (isLiked) {
        await updateDoc(userRef, { likedSongs: arrayRemove(song.id) });
        setLikedSongs(prev => prev.filter(id => id !== song.id));
      } else {
        await updateDoc(userRef, { likedSongs: arrayUnion(song.id) });
        setLikedSongs(prev => [...prev, song.id]);
      }
    } catch (err) {
      console.error('Like failed:', err);
    }
    setLiking(false);
  };

  return (
    <div
      onClick={handlePlay}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.card,
        outline: isActive ? '2px solid #22c55e' : '2px solid transparent',
        background: hovered ? '#222' : '#1a1a1a',
        cursor: 'pointer',
      }}
    >
      <div style={styles.imgWrap}>
        <img
          src={song.coverUrl || 'https://placehold.co/200x200/1a1a1a/555?text=♪'}
          alt={song.title}
          style={styles.img}
          onError={e => { e.target.src = 'https://placehold.co/200x200/1a1a1a/555?text=♪'; }}
        />
        {/* Like button */}
        <button
          onClick={handleLike}
          style={{
            ...styles.likeBtn,
            opacity: hovered || isLiked ? 1 : 0,
            color: isLiked ? '#f43f5e' : '#fff',
          }}
          title={isLiked ? 'Unlike' : 'Like'}
        >
          <HeartIcon filled={isLiked} />
        </button>

        {/* Play overlay */}
        <div style={{ ...styles.overlay, opacity: (hovered || (isActive && isPlaying)) ? 1 : 0 }}>
          <div style={styles.playBtn}>
            {isActive && isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                <rect x="6" y="5" width="4" height="14" rx="1"/>
                <rect x="14" y="5" width="4" height="14" rx="1"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                <path d="M8 5.14v14l11-7-11-7z"/>
              </svg>
            )}
          </div>
        </div>
      </div>
      <div style={styles.info}>
        <p style={styles.title}>{song.title}</p>
        <p style={styles.artist}>{song.artist}</p>
        <span style={styles.genre}>{song.genre}</span>
      </div>
    </div>
  );
};

const HeartIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const styles = {
  card: {
    background: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: '12px',
    overflow: 'hidden', transition: 'background 0.2s, outline 0.2s',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  imgWrap: { position: 'relative', width: '100%', paddingBottom: '100%', background: '#111' },
  img: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  likeBtn: {
    position: 'absolute', top: '8px', right: '8px',
    background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
    width: '32px', height: '32px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer',
    transition: 'opacity 0.2s, color 0.2s', zIndex: 2, backdropFilter: 'blur(4px)',
  },
  overlay: {
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s',
  },
  playBtn: {
    width: '44px', height: '44px', background: '#22c55e', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
  },
  info: { padding: '12px 14px 14px' },
  title: {
    color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '3px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  artist: {
    color: '#6b7280', fontSize: '12px', marginBottom: '8px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  genre: {
    background: 'rgba(34,197,94,0.1)', color: '#22c55e',
    border: '1px solid rgba(34,197,94,0.2)', borderRadius: '4px',
    padding: '2px 8px', fontSize: '11px', fontWeight: '500',
  },
};

export default SongCard;