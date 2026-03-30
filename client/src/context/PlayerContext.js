import React, {
  createContext, useContext, useState, useRef,
  useCallback, useEffect,
} from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const PlayerContext = createContext();
export const usePlayer = () => useContext(PlayerContext);

const MAX_RECENT = 10;

export const PlayerProvider = ({ children }) => {
  const { currentUser } = useAuth();

  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [songs, setSongs]             = useState([]);
  const [repeat, setRepeat]           = useState('none'); // 'none' | 'one' | 'all'
  const [shuffle, setShuffle]         = useState(false);
  const [isMuted, setIsMuted]         = useState(false);
  const [volume, setVolume]           = useState(1);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [showQueue, setShowQueue]     = useState(false);

  const audioRef = useRef(new Audio());

  // ─── recently played helper ───────────────────────────────────────────────
  const addToRecentlyPlayed = useCallback((song) => {
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(s => s.id !== song.id);
      return [song, ...filtered].slice(0, MAX_RECENT);
    });
    // Persist to Firestore (fire-and-forget)
    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      updateDoc(userRef, {
        recentlyPlayed: arrayUnion(song.id),
      }).catch(console.error);
    }
  }, [currentUser]);

  // ─── core play ────────────────────────────────────────────────────────────
  const playSong = useCallback((song, songList = []) => {
    if (currentSong?.id === song.id) {
      togglePlay();
      return;
    }
    const audio = audioRef.current;
    audio.src   = song.fileUrl;
    audio.volume = isMuted ? 0 : volume;
    audio.play().catch(console.error);
    setCurrentSong(song);
    setIsPlaying(true);
    if (songList.length > 0) setSongs(songList);
    addToRecentlyPlayed(song);
  }, [currentSong, isMuted, volume, addToRecentlyPlayed]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setIsPlaying(prev => !prev);
  }, [isPlaying]);

  // ─── next / prev ──────────────────────────────────────────────────────────
  const playNext = useCallback((songList, song, shuffleOn, repeatMode) => {
    const list = songList.length ? songList : [];
    if (!list.length) return;

    if (repeatMode === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
      return;
    }

    let nextIndex;
    if (shuffleOn) {
      nextIndex = Math.floor(Math.random() * list.length);
    } else {
      const idx = list.findIndex(s => s.id === song?.id);
      nextIndex  = idx + 1;
      if (nextIndex >= list.length) {
        if (repeatMode === 'all') nextIndex = 0;
        else return;
      }
    }

    const next = list[nextIndex];
    audioRef.current.src = next.fileUrl;
    audioRef.current.volume = isMuted ? 0 : volume;
    audioRef.current.play().catch(console.error);
    setCurrentSong(next);
    setIsPlaying(true);
    addToRecentlyPlayed(next);
  }, [isMuted, volume, addToRecentlyPlayed]);

  const playPrev = useCallback(() => {
    // If more than 3 seconds in, restart instead of going prev
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    setSongs(prevSongs => {
      setCurrentSong(prevSong => {
        const idx = prevSongs.findIndex(s => s.id === prevSong?.id);
        if (idx <= 0) return prevSong;
        const prev = prevSongs[idx - 1];
        audioRef.current.src = prev.fileUrl;
        audioRef.current.volume = isMuted ? 0 : volume;
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
        addToRecentlyPlayed(prev);
        return prev;
      });
      return prevSongs;
    });
  }, [isMuted, volume, addToRecentlyPlayed]);

  // ─── ended event auto-advance ─────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const handleEnded = () => {
      setSongs(latestSongs => {
        setCurrentSong(latestSong => {
          if (repeat === 'one') {
            audio.currentTime = 0;
            audio.play().catch(console.error);
            return latestSong;
          }
          if (!latestSongs.length) return latestSong;
          const idx  = latestSongs.findIndex(s => s.id === latestSong?.id);
          let next;
          if (shuffle) {
            next = latestSongs[Math.floor(Math.random() * latestSongs.length)];
          } else {
            const nextIdx = idx + 1;
            if (nextIdx >= latestSongs.length) {
              if (repeat === 'all') next = latestSongs[0];
              else { setIsPlaying(false); return latestSong; }
            } else {
              next = latestSongs[nextIdx];
            }
          }
          audio.src = next.fileUrl;
          audio.volume = isMuted ? 0 : volume;
          audio.play().catch(console.error);
          setIsPlaying(true);
          addToRecentlyPlayed(next);
          return next;
        });
        return latestSongs;
      });
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [repeat, shuffle, isMuted, volume, addToRecentlyPlayed]);

  // ─── keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when user is typing
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (currentSong) togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          playPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          setSongs(s => { playNext(s, currentSong, shuffle, repeat); return s; });
          break;
        case 'KeyM':
          e.preventDefault();
          setIsMuted(prev => {
            const next = !prev;
            audioRef.current.volume = next ? 0 : volume;
            return next;
          });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSong, togglePlay, playPrev, playNext, shuffle, repeat, volume]);

  // ─── volume control ───────────────────────────────────────────────────────
  const handleVolumeChange = useCallback((newVolume) => {
    setVolume(newVolume);
    if (!isMuted) {
      audioRef.current.volume = newVolume;
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      audioRef.current.volume = next ? 0 : volume;
      return next;
    });
  }, [volume]);

  // ─── queue management ─────────────────────────────────────────────────────
  const removeFromQueue = useCallback((songId) => {
    setSongs(prev => prev.filter(s => s.id !== songId));
  }, []);

  const moveSongInQueue = useCallback((fromIndex, toIndex) => {
    setSongs(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  // ─── exposed helpers ──────────────────────────────────────────────────────
  const handlePlayNext = useCallback(
    () => setSongs(s => { playNext(s, currentSong, shuffle, repeat); return s; }),
    [playNext, currentSong, shuffle, repeat]
  );
  const handlePlayPrev = playPrev;
  const cycleRepeat    = () => setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none');
  const toggleShuffle  = () => setShuffle(s => !s);
  const toggleQueue    = () => setShowQueue(p => !p);

  return (
    <PlayerContext.Provider value={{
      currentSong, isPlaying, audioRef,
      playSong, togglePlay,
      playNext: handlePlayNext,
      playPrev: handlePlayPrev,
      repeat, cycleRepeat,
      shuffle, toggleShuffle,
      isMuted, toggleMute,
      volume, handleVolumeChange,
      songs, setSongs,
      recentlyPlayed,
      showQueue, toggleQueue,
      removeFromQueue,
      moveSongInQueue,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};