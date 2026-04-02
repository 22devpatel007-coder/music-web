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

// ─── shuffle modes ────────────────────────────────────────────────────────────
// 'none'    → original order
// 'smart'   → weighted cycle (Smart Shuffle)
// 'classic' → classic random
export const SHUFFLE_MODES = ['none', 'smart', 'classic'];

// ── Safe play helper ──────────────────────────────────────────────────────────
async function safePlay(audio) {
  try {
    await audio.play();
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('[PlayerContext] play() failed:', err.message);
    }
  }
}

// ── Weighted Fisher-Yates shuffle ─────────────────────────────────────────────
// Accepts an array of { song, weight } objects, returns shuffled song array.
function weightedFisherYates(items) {
  // Build cumulative weights
  const result = [...items];
  const n = result.length;

  for (let i = n - 1; i > 0; i--) {
    // Pick j with probability proportional to weight
    let totalWeight = 0;
    for (let k = 0; k <= i; k++) totalWeight += result[k].weight;

    let rand = Math.random() * totalWeight;
    let j = 0;
    for (let k = 0; k <= i; k++) {
      rand -= result[k].weight;
      if (rand <= 0) { j = k; break; }
    }

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.map(item => item.song);
}

// ── Build weights for a song list ─────────────────────────────────────────────
// playedThisSession: Set of song IDs played this session
// skipSignals: Map of songId → skip count
// playSignals: Map of songId → complete-play count
// likedSongIds: Set of liked song IDs
function buildWeightedOrder(songs, playedThisSession, skipSignals, playSignals, likedSongIds) {
  const items = songs.map(song => {
    let weight = 10; // base weight

    // Liked songs get a boost
    if (likedSongIds.has(song.id)) weight += 4;

    // Songs played this session get penalised
    if (playedThisSession.has(song.id)) weight -= 6;

    // Skip signals lower the weight (each skip removes 2 points)
    const skips = skipSignals.get(song.id) || 0;
    weight -= skips * 2;

    // Completion signals raise the weight slightly
    const completions = playSignals.get(song.id) || 0;
    weight += completions * 1;

    // Never go below 1 so every song always has a chance
    weight = Math.max(1, weight);

    return { song, weight };
  });

  return weightedFisherYates(items);
}

export const PlayerProvider = ({ children }) => {
  const { currentUser, likedSongs } = useAuth();

  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [songs,       setSongs]       = useState([]);
  const [repeat,      setRepeat]      = useState('none');

  // Three-state shuffle: 'none' | 'smart' | 'classic'
  const [shuffleMode, setShuffleMode] = useState('none');

  const [isMuted,     setIsMuted]     = useState(false);
  const [volume,      setVolume]      = useState(1);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [showQueue,   setShowQueue]   = useState(false);
  const [playingPlaylistName, setPlayingPlaylistName] = useState(null);

  const audioRef = useRef(new Audio());

  // ── Smart Shuffle state (all in refs — no re-renders needed) ──────────────
  const smartCycleRef       = useRef([]);   // pre-generated ordered list
  const smartCycleIndexRef  = useRef(0);    // current position in the cycle
  const skipSignalsRef      = useRef(new Map());  // songId → skip count this session
  const playSignalsRef      = useRef(new Map());  // songId → completion count this session
  const playedThisSessionRef= useRef(new Set());  // songs started this session
  const songStartTimeRef    = useRef(null); // Date.now() when current song started

  // Keep refs in sync with state for callbacks
  const currentSongRef  = useRef(null);
  const isPlayingRef    = useRef(false);
  const shuffleModeRef  = useRef('none');
  const songsRef        = useRef([]);
  const repeatRef       = useRef('none');

  useEffect(() => { currentSongRef.current  = currentSong; },  [currentSong]);
  useEffect(() => { isPlayingRef.current    = isPlaying; },    [isPlaying]);
  useEffect(() => { shuffleModeRef.current  = shuffleMode; },  [shuffleMode]);
  useEffect(() => { songsRef.current        = songs; },        [songs]);
  useEffect(() => { repeatRef.current       = repeat; },       [repeat]);

  // ── Helpers ───────────────────────────────────────────────────────────────

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

  // ── Regenerate smart cycle ────────────────────────────────────────────────
  const regenerateSmartCycle = useCallback((songList, startSongId = null) => {
    const likedSet = new Set(likedSongs || []);
    const ordered  = buildWeightedOrder(
      songList,
      playedThisSessionRef.current,
      skipSignalsRef.current,
      playSignalsRef.current,
      likedSet,
    );
    smartCycleRef.current      = ordered;
    smartCycleIndexRef.current = startSongId
      ? Math.max(0, ordered.findIndex(s => s.id === startSongId))
      : 0;
    return ordered;
  }, [likedSongs]);

  // ── Record skip signal if song was skipped early ──────────────────────────
  const recordSkipOrPlay = useCallback((skipped) => {
    const song = currentSongRef.current;
    if (!song) return;

    const elapsed = songStartTimeRef.current
      ? (Date.now() - songStartTimeRef.current) / 1000
      : 999;

    if (skipped && elapsed < 10) {
      // Skip signal — user bailed within 10 seconds
      const prev = skipSignalsRef.current.get(song.id) || 0;
      skipSignalsRef.current.set(song.id, prev + 1);
    } else if (!skipped) {
      // Completion signal
      const prev = playSignalsRef.current.get(song.id) || 0;
      playSignalsRef.current.set(song.id, prev + 1);
    }
  }, []);

  // ── Start a song (low-level, shared by all play functions) ────────────────
  const startSong = useCallback((song, newSongList) => {
    const audio = audioRef.current;
    audio.pause();
    audio.src    = song.fileUrl;
    audio.volume = isMuted ? 0 : volume;

    setCurrentSong(song);
    setIsPlaying(true);
    if (newSongList) setSongs(newSongList);

    playedThisSessionRef.current.add(song.id);
    songStartTimeRef.current = Date.now();

    addToRecentlyPlayed(song);
    incrementPlayCount(song.id);
    safePlay(audio);
  }, [isMuted, volume, addToRecentlyPlayed, incrementPlayCount]);

  // ── playSong ──────────────────────────────────────────────────────────────
  const playSong = useCallback((song, songList = []) => {
    const audio = audioRef.current;

    if (currentSongRef.current?.id === song.id) {
      if (audio.paused) {
        safePlay(audio).then(() => setIsPlaying(true));
      } else {
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }

    recordSkipOrPlay(true); // previous song was skipped (if any)

    const list = songList.length > 0 ? songList : songsRef.current;

    // Regenerate smart cycle whenever we get a new song list
    if (shuffleModeRef.current === 'smart' && list.length > 0) {
      regenerateSmartCycle(list, song.id);
    }

    startSong(song, songList.length > 0 ? songList : null);
  }, [recordSkipOrPlay, regenerateSmartCycle, startSong]);

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

  // ── Get next song based on current shuffle mode ───────────────────────────
  const getNextSong = useCallback((list, currentSong, mode, repeatMode) => {
    if (!list.length) return null;

    if (repeatMode === 'one') return currentSong; // handled separately with seek reset

    if (mode === 'smart') {
      const cycle = smartCycleRef.current;
      if (!cycle.length) return null;

      let nextIdx = smartCycleIndexRef.current + 1;
      if (nextIdx >= cycle.length) {
        // Cycle exhausted — regenerate
        const newCycle = regenerateSmartCycle(list);
        smartCycleIndexRef.current = 0;
        return newCycle[0] || null;
      }
      smartCycleIndexRef.current = nextIdx;
      return cycle[nextIdx] || null;
    }

    if (mode === 'classic') {
      return list[Math.floor(Math.random() * list.length)];
    }

    // mode === 'none'
    const idx = list.findIndex(s => s.id === currentSong?.id);
    const nextIdx = idx + 1;
    if (nextIdx >= list.length) {
      if (repeatMode === 'all') return list[0];
      return null; // end of queue
    }
    return list[nextIdx];
  }, [regenerateSmartCycle]);

  // ── getPrevSong ───────────────────────────────────────────────────────────
  const getPrevSong = useCallback((list, currentSong, mode) => {
    if (!list.length) return null;

    if (mode === 'smart') {
      const cycle = smartCycleRef.current;
      if (!cycle.length) return null;
      const prevIdx = Math.max(0, smartCycleIndexRef.current - 1);
      smartCycleIndexRef.current = prevIdx;
      return cycle[prevIdx] || null;
    }

    if (mode === 'classic') {
      return list[Math.floor(Math.random() * list.length)];
    }

    const idx = list.findIndex(s => s.id === currentSong?.id);
    if (idx <= 0) return null;
    return list[idx - 1];
  }, []);

  // ── playNext ──────────────────────────────────────────────────────────────
  const playNext = useCallback(() => {
    setSongs(latestSongs => {
      setCurrentSong(latestSong => {
        const audio = audioRef.current;

        if (repeatRef.current === 'one') {
          audio.currentTime = 0;
          safePlay(audio);
          return latestSong;
        }

        recordSkipOrPlay(true); // song was skipped

        const next = getNextSong(
          latestSongs, latestSong,
          shuffleModeRef.current, repeatRef.current
        );

        if (!next) {
          setIsPlaying(false);
          return latestSong;
        }

        audio.pause();
        audio.src    = next.fileUrl;
        audio.volume = isMuted ? 0 : volume;
        setIsPlaying(true);

        playedThisSessionRef.current.add(next.id);
        songStartTimeRef.current = Date.now();
        addToRecentlyPlayed(next);
        incrementPlayCount(next.id);
        safePlay(audio);

        return next;
      });
      return latestSongs;
    });
  }, [getNextSong, recordSkipOrPlay, isMuted, volume, addToRecentlyPlayed, incrementPlayCount]);

  // ── playPrev ──────────────────────────────────────────────────────────────
  const playPrev = useCallback(() => {
    const audio = audioRef.current;

    // If more than 3 seconds in, restart current song
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    setSongs(latestSongs => {
      setCurrentSong(latestSong => {
        const prev = getPrevSong(latestSongs, latestSong, shuffleModeRef.current);
        if (!prev) return latestSong;

        audio.pause();
        audio.src    = prev.fileUrl;
        audio.volume = isMuted ? 0 : volume;
        setIsPlaying(true);

        playedThisSessionRef.current.add(prev.id);
        songStartTimeRef.current = Date.now();
        addToRecentlyPlayed(prev);
        incrementPlayCount(prev.id);
        safePlay(audio);

        return prev;
      });
      return latestSongs;
    });
  }, [getPrevSong, isMuted, volume, addToRecentlyPlayed, incrementPlayCount]);

  // ── Auto-advance on song ended ────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const handleEnded = () => {
      recordSkipOrPlay(false); // song completed naturally

      setSongs(latestSongs => {
        setCurrentSong(latestSong => {
          if (repeatRef.current === 'one') {
            audio.currentTime = 0;
            safePlay(audio);
            return latestSong;
          }

          const next = getNextSong(
            latestSongs, latestSong,
            shuffleModeRef.current, repeatRef.current
          );

          if (!next) {
            setIsPlaying(false);
            return latestSong;
          }

          audio.pause();
          audio.src    = next.fileUrl;
          audio.volume = isMuted ? 0 : volume;
          setIsPlaying(true);

          playedThisSessionRef.current.add(next.id);
          songStartTimeRef.current = Date.now();
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
  }, [getNextSong, recordSkipOrPlay, isMuted, volume, addToRecentlyPlayed, incrementPlayCount]);

  // ── Cycle through shuffle modes ───────────────────────────────────────────
  const cycleShuffleMode = useCallback(() => {
    setShuffleMode(prev => {
      const nextMode = prev === 'none' ? 'smart' : prev === 'smart' ? 'classic' : 'none';

      // When activating smart shuffle, pre-generate the cycle immediately
      if (nextMode === 'smart' && songsRef.current.length > 0) {
        regenerateSmartCycle(songsRef.current, currentSongRef.current?.id);
      }

      return nextMode;
    });
  }, [regenerateSmartCycle]);

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
      // Reset session signals
      playedThisSessionRef.current  = new Set();
      skipSignalsRef.current        = new Map();
      playSignalsRef.current        = new Map();
      smartCycleRef.current         = [];
      smartCycleIndexRef.current    = 0;
    }
  }, [currentUser]);

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
          playNext();
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
  }, [togglePlay, playPrev, playNext, volume]);

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

  const cycleRepeat   = () => setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none');
  const toggleQueue   = () => setShowQueue(p => !p);

  // Legacy shuffle boolean for components that need it (MusicPlayer reads shuffleMode directly)
  const shuffle = shuffleMode !== 'none';

  const playPlaylist = useCallback((playlistSongs, playlistName, shuffled = false) => {
    if (!playlistSongs.length) return;
    const list = shuffled
      ? [...playlistSongs].sort(() => Math.random() - 0.5)
      : playlistSongs;
    setPlayingPlaylistName(playlistName);
    playSong(list[0], list);
  }, [playSong]);

  return (
    <PlayerContext.Provider value={{
      currentSong, isPlaying, audioRef,
      playSong, togglePlay,
      playNext, playPrev,
      repeat, cycleRepeat,
      shuffle,          // boolean — true when any shuffle is active
      shuffleMode,      // 'none' | 'smart' | 'classic'
      cycleShuffleMode, // replaces toggleShuffle
      toggleShuffle: cycleShuffleMode, // backwards compat alias
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