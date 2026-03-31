import React, {
  createContext, useContext, useState, useRef,
  useCallback, useEffect,
} from 'react';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
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
  const [repeat, setRepeat]           = useState('none');
  const [shuffle, setShuffle]         = useState(false);
  const [isMuted, setIsMuted]         = useState(false);
  const [volume, setVolume]           = useState(1);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [showQueue, setShowQueue]     = useState(false);

  const audioRef = useRef(new Audio());

  // Keep a ref to currentSong so callbacks never close over stale state
  const currentSongRef = useRef(null);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);

  const addToRecentlyPlayed = useCallback((song) => {
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(s => s.id !== song.id);
      return [song, ...filtered].slice(0, MAX_RECENT);
    });
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        recentlyPlayed: arrayUnion(song.id),
      }).catch(() => {});
    }
  }, [currentUser]);

  // FIX: Play count is now incremented ONLY here in PlayerContext — the
  // SongCard.jsx increment has been removed to prevent double-counting.
  const incrementPlayCount = useCallback((songId) => {
    updateDoc(doc(db, 'songs', songId), { playCount: increment(1) }).catch(() => {});
  }, []);

  const playSong = useCallback((song, songList = []) => {
    // FIX: Use ref instead of state to avoid stale closure on currentSong
    if (currentSongRef.current?.id === song.id) {
      const audio = audioRef.current;
      if (audio.paused) { audio.play().catch(console.error); setIsPlaying(true); }
      else              { audio.pause(); setIsPlaying(false); }
      return;
    }
    const audio = audioRef.current;
    audio.src = song.fileUrl;
    audio.volume = isMuted ? 0 : volume;
    audio.play().catch(console.error);
    setCurrentSong(song);
    setIsPlaying(true);
    if (songList.length > 0) setSongs(songList);
    addToRecentlyPlayed(song);
    incrementPlayCount(song.id);
  }, [isMuted, volume, addToRecentlyPlayed, incrementPlayCount]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (audio.paused) {
      audio.play().catch(console.error);
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

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
      nextIndex = idx + 1;
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
    incrementPlayCount(next.id);
  }, [isMuted, volume, addToRecentlyPlayed, incrementPlayCount]);

  const playPrev = useCallback(() => {
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
        incrementPlayCount(prev.id);
        return prev;
      });
      return prevSongs;
    });
  }, [isMuted, volume, addToRecentlyPlayed, incrementPlayCount]);

  // Stop player on logout
  useEffect(() => {
    if (!currentUser) {
      audioRef.current.pause();
      audioRef.current.src = '';
      setCurrentSong(null);
      setIsPlaying(false);
      setSongs([]);
      setRecentlyPlayed([]);
    }
  }, [currentUser]);

  // Auto-advance on end
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
          const idx = latestSongs.findIndex(s => s.id === latestSong?.id);
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
          incrementPlayCount(next.id);
          return next;
        });
        return latestSongs;
      });
    };
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [repeat, shuffle, isMuted, volume, addToRecentlyPlayed, incrementPlayCount]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (currentSongRef.current) togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          playPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          setSongs(s => { playNext(s, currentSongRef.current, shuffle, repeat); return s; });
          break;
        case 'KeyM':
          e.preventDefault();
          setIsMuted(prev => {
            const next = !prev;
            audioRef.current.volume = next ? 0 : volume;
            return next;
          });
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, playPrev, playNext, shuffle, repeat, volume]);

  const handleVolumeChange = useCallback((v) => {
    setVolume(v);
    if (!isMuted) audioRef.current.volume = v;
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      audioRef.current.volume = next ? 0 : volume;
      return next;
    });
  }, [volume]);

  const removeFromQueue = useCallback((songId) =>
    setSongs(prev => prev.filter(s => s.id !== songId)), []);

  const moveSongInQueue = useCallback((from, to) =>
    setSongs(prev => {
      const a = [...prev];
      const [m] = a.splice(from, 1);
      a.splice(to, 0, m);
      return a;
    }), []);

  const handlePlayNext = useCallback(() =>
    setSongs(s => { playNext(s, currentSongRef.current, shuffle, repeat); return s; }),
    [playNext, shuffle, repeat]);

  const cycleRepeat  = () => setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none');
  const toggleShuffle = () => setShuffle(s => !s);
  const toggleQueue   = () => setShowQueue(p => !p);

  return (
    <PlayerContext.Provider value={{
      currentSong, isPlaying, audioRef,
      playSong, togglePlay,
      playNext: handlePlayNext,
      playPrev,
      repeat, cycleRepeat,
      shuffle, toggleShuffle,
      isMuted, toggleMute,
      volume, handleVolumeChange,
      songs, setSongs,
      recentlyPlayed,
      showQueue, toggleQueue,
      removeFromQueue, moveSongInQueue,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};