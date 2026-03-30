import { useState, useCallback } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';

const SongCard = ({ song, songList }) => {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { currentUser, likedSongs, setLikedSongs } = useAuth();
  const isActive = currentSong?.id === song.id;
  const isLiked = likedSongs?.includes(song.id);
  const [likeLoading, setLikeLoading] = useState(false);

  const handlePlay = useCallback(() => {
    playSong(song, songList);
    // Increment play count in Firestore (fire-and-forget)
    if (!isActive) {
      const songRef = doc(db, 'songs', song.id);
      updateDoc(songRef, { playCount: increment(1) }).catch(console.error);
    }
  }, [song, songList, isActive, playSong]);

  const handleLike = useCallback(async (e) => {
    e.stopPropagation();
    if (!currentUser || likeLoading) return;
    setLikeLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      if (isLiked) {
        await updateDoc(userRef, { likedSongs: arrayRemove(song.id) });
        setLikedSongs(prev => prev.filter(id => id !== song.id));
      } else {
        await updateDoc(userRef, { likedSongs: arrayUnion(song.id) });
        setLikedSongs(prev => [...prev, song.id]);
      }
    } catch (err) {
      console.error('Like toggle failed:', err);
    } finally {
      setLikeLoading(false);
    }
  }, [currentUser, isLiked, song.id, likeLoading, setLikedSongs]);

  return (
    <div
      onClick={handlePlay}
      className={`bg-gray-800 rounded-xl p-4 cursor-pointer 
        hover:bg-gray-700 transition transform hover:scale-105 relative
        ${isActive ? 'ring-2 ring-green-500' : ''}`}>
      <div className="relative">
        <img
          src={song.coverUrl || 'https://via.placeholder.com/200'}
          alt={song.title}
          className="w-full h-48 object-cover rounded-lg mb-3"
        />
        {isActive && isPlaying && (
          <div className="absolute inset-0 flex items-center 
            justify-center bg-black bg-opacity-40 rounded-lg">
            <span className="text-green-400 text-4xl">▶</span>
          </div>
        )}
        {/* Like button */}
        <button
          onClick={handleLike}
          disabled={likeLoading}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center
            justify-center transition-all duration-200 shadow-lg
            ${isLiked
              ? 'bg-red-500 text-white scale-110'
              : 'bg-black bg-opacity-50 text-gray-300 hover:bg-opacity-70 hover:text-red-400'
            } ${likeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isLiked ? 'Unlike' : 'Like'}>
          <svg
            className="w-4 h-4"
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>
      <h3 className="text-white font-semibold truncate">{song.title}</h3>
      <p className="text-gray-400 text-sm truncate">{song.artist}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-green-500 bg-green-500 
          bg-opacity-20 px-2 py-1 rounded-full inline-block">
          {song.genre}
        </span>
        {song.playCount > 0 && (
          <span className="text-xs text-gray-500">
            ▶ {song.playCount >= 1000
              ? `${(song.playCount / 1000).toFixed(1)}k`
              : song.playCount}
          </span>
        )}
      </div>
    </div>
  );
};

export default SongCard;