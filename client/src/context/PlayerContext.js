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

// ── Safe play helper ──────────────────────────────────────────────────────────
// The AbortError ("play() interrupted by new load") happens when you call
// audio.src = newSrc while a previous audio.play() Promise is still pending.
// Fix: always await a pending play promise before changing src.
async function safePlay(audio) {
  try {
    await audio.play();
  } catch (err) {
    // AbortError is expected when src changes mid-play — not a real error
    if (err.name !== 'AbortError') {
      console.error('[PlayerContext] play() failed:', err.message);
    }
  }
}

export const PlayerProvider = ({ children }) => {
  const { currentUser } = useAuth();

  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [songs,       setSongs]       = useState([]);
  const [repeat,      setRepeat]      = useState('none');
  const [shuffle,     setShuffle]     = useState(false);
  const [isMuted,     setIsMuted]     = useState(false);
  const [volume,      setVolume]      = useState(1);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [showQueue,   setShowQueue]   = useState(false);
  const [playingPlaylistName, setPlayingPlaylistName] = useState(null);

  const audioRef = useRef(new Audio());

  // Keep refs so callbacks never close over stale state
  const currentSongRef = useRef(null);
  const isPlayingRef   = useRef(false);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { isPlayingRef.current   = isPlaying;   }, [isPlaying]);

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

  const incrementPlayCount = useCallback((songId) => {
    updateDoc(doc(db, 'songs', songId), { playCount: increment(1) }).catch(() => {});
  }, []);

  // ── playSong ──────────────────────────────────────────────────────────────
  const playSong = useCallback((song, songList = []) => {
    const audio = audioRef.current;

    if (currentSongRef.current?.id === song.id) {
      // Same song — just toggle
      if (audio.paused) {
        safePlay(audio).then(() => setIsPlaying(true));
      } else {
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }

    // New song — set src first, THEN play
    // Setting src cancels any pending play, so AbortError cannot occur
    audio.pause();
    audio.src    = song.fileUrl;
    audio.volume = isMuted ? 0 : volume;

    setCurrentSong(song);
    setIsPlaying(true);
    if (songList.length > 0) setSongs(songList);
    addToRecentlyPlayed(song);
    incrementPlayCount(song.id);

    safePlay(audio);
  }, [isMuted, volume, addToRecentlyPlayed, incrementPlayCount]);

  // ── togglePlay ────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (audio.paused) {
      safePlay(audio).then(() => setIsPlaying(true));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  // ── playNext ──────────────────────────────────────────────────────────────
  const playNext = useCallback((songList, song, shuffleOn, repeatMode) => {
    const list = songList.length ? songList : [];
    if (!list.length) return;

    const audio = audioRef.current;

    if (repeatMode === 'one') {
      audio.currentTime = 0;
      safePlay(audio);
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
    audio.pause();
    audio.src    = next.fileUrl;
    audio.volume = isMuted ? 0 : volume;
    setCurrentSong(next);
    setIsPlaying(true);
    addToRecentlyPlayed(next);
    incrementPlayCount(next.id);
    safePlay(audio);
  }, [isMuted, volume, addToRecentlyPlayed, incrementPlayCount]);

  // ── playPrev ──────────────────────────────────────────────────────────────
  const playPrev = useCallback(() => {
    const audio = audioRef.current;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setSongs(prevSongs => {
      setCurrentSong(prevSong => {
        const idx = prevSongs.findIndex(s => s.id === prevSong?.id);
        if (idx <= 0) return prevSong;
        const prev = prevSongs[idx - 1];
        audio.pause();
        audio.src    = prev.fileUrl;
        audio.volume = isMuted ? 0 : volume;
        setIsPlaying(true);
        addToRecentlyPlayed(prev);
        incrementPlayCount(prev.id);
        safePlay(audio);
        return prev;
      });
      return prevSongs;
    });
  }, [isMuted, volume, addToRecentlyPlayed, incrementPlayCount]);

  // ── Stop on logout ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      const audio = audioRef.current;
      audio.pause();
      audio.src = '';
      setCurrentSong(null);
      setIsPlaying(false);
      setSongs([]);
      setRecentlyPlayed([]);
    }
  }, [currentUser]);

  // ── Auto-advance on ended ─────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => {
      setSongs(latestSongs => {
        setCurrentSong(latestSong => {
          if (repeat === 'one') {
            audio.currentTime = 0;
            safePlay(audio);
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
          audio.pause();
          audio.src    = next.fileUrl;
          audio.volume = isMuted ? 0 : volume;
          setIsPlaying(true);
          addToRecentlyPlayed(next);
          incrementPlayCount(next.id);
          safePlay(audio);
          return next;
        });
        return latestSongs;
      });
    };
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [repeat, shuffle, isMuted, volume, addToRecentlyPlayed, incrementPlayCount]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
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

  const removeFromQueue  = useCallback((songId) =>
    setSongs(prev => prev.filter(s => s.id !== songId)), []);

  const moveSongInQueue  = useCallback((from, to) =>
    setSongs(prev => {
      const a = [...prev];
      const [m] = a.splice(from, 1);
      a.splice(to, 0, m);
      return a;
    }), []);

  const handlePlayNext = useCallback(() =>
    setSongs(s => { playNext(s, currentSongRef.current, shuffle, repeat); return s; }),
    [playNext, shuffle, repeat]);

  const cycleRepeat   = () => setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none');
  const toggleShuffle = () => setShuffle(s => !s);
  const toggleQueue   = () => setShowQueue(p => !p);

  const playPlaylist = useCallback((playlistSongs, playlistName, shuffled = false) => {
    if (!playlistSongs.length) return;
    const list = shuffled ? [...playlistSongs].sort(() => Math.random() - 0.5) : playlistSongs;
    setPlayingPlaylistName(playlistName);
    playSong(list[0], list);
  }, [playSong]);

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
      playPlaylist,
      playingPlaylistName,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};