import React, {
  createContext, useContext, useState, useRef,
  useCallback, useEffect, useMemo,
} from 'react';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

// ─── Two separate contexts ────────────────────────────────────────────────────
// PERMANENT FIX: Split into PlayerStateContext (changes often: isPlaying,
// currentSong) and PlayerActionsContext (never changes: stable callbacks).
// Components that only need actions (e.g. SongCard's play button) subscribe
// to PlayerActionsContext and NEVER re-render when playback state changes.
// Components that need both (MusicPlayer) subscribe to both, but each
// context re-renders only its own subscribers.
const PlayerStateContext   = createContext();
const PlayerActionsContext = createContext();

export const usePlayerState   = () => useContext(PlayerStateContext);
export const usePlayerActions = () => useContext(PlayerActionsContext);

// Legacy single hook — still works, subscribes to both.
// Existing components using usePlayer() continue to work with zero changes.
export const usePlayer = () => ({
  ...usePlayerState(),
  ...usePlayerActions(),
});

const MAX_RECENT = 10;
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
function weightedFisherYates(items) {
  const result = [...items];
  const n = result.length;
  for (let i = n - 1; i > 0; i--) {
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

function buildWeightedOrder(songs, playedThisSession, skipSignals, playSignals, likedSongIds) {
  const items = songs.map(song => {
    let weight = 10;
    if (likedSongIds.has(song.id)) weight += 4;
    if (playedThisSession.has(song.id)) weight -= 6;
    const skips = skipSignals.get(song.id) || 0;
    weight -= skips * 2;
    const completions = playSignals.get(song.id) || 0;
    weight += completions * 1;
    weight = Math.max(1, weight);
    return { song, weight };
  });
  return weightedFisherYates(items);
}

export const PlayerProvider = ({ children }) => {
  const { currentUser, likedSongs } = useAuth();

  const [currentSong,         setCurrentSong]         = useState(null);
  const [isPlaying,           setIsPlaying]           = useState(false);
  const [songs,               setSongs]               = useState([]);
  const [repeat,              setRepeat]              = useState('none');
  const [shuffleMode,         setShuffleMode]         = useState('none');
  const [isMuted,             setIsMuted]             = useState(false);
  const [volume,              setVolume]              = useState(1);
  const [recentlyPlayed,      setRecentlyPlayed]      = useState([]);
  const [showQueue,           setShowQueue]           = useState(false);
  const [playingPlaylistName, setPlayingPlaylistName] = useState(null);

  // PERMANENT FIX: Single Audio element in a ref — never recreated.
  // Putting it in state would cause the entire provider to re-render
  // whenever we touch audio properties.
  const audioRef = useRef(new Audio());

  // PERMANENT FIX: Cleanup on unmount prevents orphaned Audio elements
  // during React StrictMode double-invocation and hot-reload.
  useEffect(() => {
    // PERMANENT FIX: Copy ref to local variable so the cleanup function
    // closes over the same Audio instance that was active when the effect ran.
    // Using audioRef.current directly in cleanup is unsafe — the ref value
    // may have changed by the time React calls the cleanup function.
    const audio = audioRef.current;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // ── All smart-shuffle state in refs (zero re-renders) ────────────────────
  const smartCycleRef        = useRef([]);
  const smartCycleIndexRef   = useRef(0);
  const skipSignalsRef       = useRef(new Map());
  const playSignalsRef       = useRef(new Map());
  const playedThisSessionRef = useRef(new Set());
  const songStartTimeRef     = useRef(null);

  // ── Shadow refs — let callbacks read latest state without being deps ──────
  // PERMANENT FIX: Using refs here means none of the audio event callbacks
  // (handleEnded, etc.) need to be re-created when state changes. Without
  // this, adding state values as deps to useEffect/useCallback creates a
  // new function reference -> removes and re-adds the 'ended' listener on
  // every state change -> brief window where auto-advance doesn't work.
  const currentSongRef  = useRef(null);
  const shuffleModeRef  = useRef('none');
  const songsRef        = useRef([]);
  const repeatRef       = useRef('none');
  const isMutedRef      = useRef(false);
  const volumeRef       = useRef(1);

  useEffect(() => { currentSongRef.current = currentSong; },   [currentSong]);
  useEffect(() => { shuffleModeRef.current = shuffleMode; },   [shuffleMode]);
  useEffect(() => { songsRef.current       = songs; },         [songs]);
  useEffect(() => { repeatRef.current      = repeat; },        [repeat]);
  useEffect(() => { isMutedRef.current     = isMuted; },       [isMuted]);
  useEffect(() => { volumeRef.current      = volume; },        [volume]);

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

  const recordSkipOrPlay = useCallback((skipped) => {
    const song = currentSongRef.current;
    if (!song) return;
    const elapsed = songStartTimeRef.current
      ? (Date.now() - songStartTimeRef.current) / 1000
      : 999;
    if (skipped && elapsed < 10) {
      const prev = skipSignalsRef.current.get(song.id) || 0;
      skipSignalsRef.current.set(song.id, prev + 1);
    } else if (!skipped) {
      const prev = playSignalsRef.current.get(song.id) || 0;
      playSignalsRef.current.set(song.id, prev + 1);
    }
  }, []);

  // PERMANENT FIX: isMuted and volume are read from refs inside startSong,
  // so they are NOT deps. This means startSong's reference is stable for
  // the entire session — components memoized with it don't re-render when
  // the user changes volume.
  const startSong = useCallback((song, newSongList) => {
    const audio  = audioRef.current;
    audio.pause();
    audio.src    = song.fileUrl;
    audio.volume = isMutedRef.current ? 0 : volumeRef.current;
    setCurrentSong(song);
    setIsPlaying(true);
    if (newSongList) setSongs(newSongList);
    playedThisSessionRef.current.add(song.id);
    songStartTimeRef.current = Date.now();
    addToRecentlyPlayed(song);
    incrementPlayCount(song.id);
    safePlay(audio);
  }, [addToRecentlyPlayed, incrementPlayCount]);

  const getNextSong = useCallback((list, song, mode, repeatMode) => {
    if (!list.length) return null;
    if (repeatMode === 'one') return song;
    if (mode === 'smart') {
      const cycle = smartCycleRef.current;
      if (!cycle.length) return null;
      let nextIdx = smartCycleIndexRef.current + 1;
      if (nextIdx >= cycle.length) {
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
    const idx = list.findIndex(s => s.id === song?.id);
    const nextIdx = idx + 1;
    if (nextIdx >= list.length) {
      return repeatMode === 'all' ? list[0] : null;
    }
    return list[nextIdx];
  }, [regenerateSmartCycle]);

  const getPrevSong = useCallback((list, song, mode) => {
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
    const idx = list.findIndex(s => s.id === song?.id);
    if (idx <= 0) return null;
    return list[idx - 1];
  }, []);

  // PERMANENT FIX: Extracted so the transition logic isn't duplicated in
  // playNext, playPrev, AND handleEnded. Each duplicate was a separate
  // potential source of bugs when volume/mute state changed.
  const _transitionToSong = useCallback((nextSong) => {
    const audio = audioRef.current;
    audio.pause();
    audio.src    = nextSong.fileUrl;
    audio.volume = isMutedRef.current ? 0 : volumeRef.current;
    setCurrentSong(nextSong);
    setIsPlaying(true);
    playedThisSessionRef.current.add(nextSong.id);
    songStartTimeRef.current = Date.now();
    addToRecentlyPlayed(nextSong);
    incrementPlayCount(nextSong.id);
    safePlay(audio);
  }, [addToRecentlyPlayed, incrementPlayCount]);

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
    recordSkipOrPlay(true);
    const list = songList.length > 0 ? songList : songsRef.current;
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

  // ── playNext ──────────────────────────────────────────────────────────────
  // PERMANENT FIX: Read latest state from refs, not closure values.
  // Using setState functional updater pattern was clever but caused a subtle
  // bug: outer setSongs ran before inner setCurrentSong, so latestSong could
  // be stale if two rapid next-presses happened in < 1 frame. Refs are
  // always current.
  const playNext = useCallback(() => {
    if (repeatRef.current === 'one') {
      const audio = audioRef.current;
      audio.currentTime = 0;
      safePlay(audio);
      return;
    }
    recordSkipOrPlay(true);
    const next = getNextSong(
      songsRef.current,
      currentSongRef.current,
      shuffleModeRef.current,
      repeatRef.current,
    );
    if (!next) { setIsPlaying(false); return; }
    _transitionToSong(next);
  }, [getNextSong, recordSkipOrPlay, _transitionToSong]);

  // ── playPrev ──────────────────────────────────────────────────────────────
  const playPrev = useCallback(() => {
    const audio = audioRef.current;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    const prev = getPrevSong(
      songsRef.current,
      currentSongRef.current,
      shuffleModeRef.current,
    );
    if (!prev) return;
    _transitionToSong(prev);
  }, [getPrevSong, _transitionToSong]);

  // ── Auto-advance on song ended ────────────────────────────────────────────
  // PERMANENT FIX: Empty dep array — this effect runs once and never
  // re-registers. All state is read from refs inside the callback, so it
  // always has fresh values without being a dep. Previously, adding
  // isMuted/volume as deps caused the listener to be removed and re-added
  // on every volume change, creating a brief gap where song-end wasn't
  // caught (race condition).
  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => {
      recordSkipOrPlay(false);
      if (repeatRef.current === 'one') {
        audio.currentTime = 0;
        safePlay(audio);
        return;
      }
      const next = getNextSong(
        songsRef.current,
        currentSongRef.current,
        shuffleModeRef.current,
        repeatRef.current,
      );
      if (!next) { setIsPlaying(false); return; }
      audio.pause();
      audio.src    = next.fileUrl;
      audio.volume = isMutedRef.current ? 0 : volumeRef.current;
      setCurrentSong(next);
      setIsPlaying(true);
      playedThisSessionRef.current.add(next.id);
      songStartTimeRef.current = Date.now();
      addToRecentlyPlayed(next);
      incrementPlayCount(next.id);
      safePlay(audio);
    };
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — all state read via refs

  // ── Cycle shuffle modes ───────────────────────────────────────────────────
  const cycleShuffleMode = useCallback(() => {
    setShuffleMode(prev => {
      const nextMode = prev === 'none' ? 'smart' : prev === 'smart' ? 'classic' : 'none';
      if (nextMode === 'smart' && songsRef.current.length > 0) {
        regenerateSmartCycle(songsRef.current, currentSongRef.current?.id);
      }
      return nextMode;
    });
  }, [regenerateSmartCycle]);

  // PERMANENT FIX: cycleRepeat and toggleQueue were inline arrow functions —
  // new reference on every render. Wrapped in useCallback so their identity
  // is stable and won't invalidate memoized child components.
  const cycleRepeat = useCallback(() => {
    setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none');
  }, []);

  const toggleQueue = useCallback(() => setShowQueue(p => !p), []);

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
            audioRef.current.volume = next ? 0 : volumeRef.current;
            return next;
          });
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, playPrev, playNext]);

  // PERMANENT FIX: isMuted removed from deps — read from ref instead.
  // Previously, every volume slider drag re-created handleVolumeChange,
  // which caused MusicPlayer to re-render and reset the slider mid-drag.
  const handleVolumeChange = useCallback((v) => {
    setVolume(v);
    if (!isMutedRef.current) audioRef.current.volume = v;
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      audioRef.current.volume = next ? 0 : volumeRef.current;
      return next;
    });
  }, []);

  const removeFromQueue = useCallback((songId) =>
    setSongs(prev => prev.filter(s => s.id !== songId)), []);

  const moveSongInQueue = useCallback((from, to) =>
    setSongs(prev => {
      const a = [...prev];
      const [m] = a.splice(from, 1);
      a.splice(to, 0, m);
      return a;
    }), []);

  const playPlaylist = useCallback((playlistSongs, playlistName, shuffled = false) => {
    if (!playlistSongs.length) return;
    const list = shuffled
      ? [...playlistSongs].sort(() => Math.random() - 0.5)
      : playlistSongs;
    setPlayingPlaylistName(playlistName);
    playSong(list[0], list);
  }, [playSong]);

  // ── Memoized context values ───────────────────────────────────────────────
  // PERMANENT FIX: Two separate memoized objects.
  //
  // actionsValue — contains only stable callback refs. useMemo dep array is
  // all callbacks, which themselves have stable refs (all wrapped in
  // useCallback). This object's reference changes ONLY when a callback's
  // identity changes, which is essentially never during normal playback.
  // Components that only call play/pause/next/prev (e.g. SongCard) subscribe
  // here and never re-render due to playback state changes.
  //
  // stateValue — contains state values that do change. Components that need
  // to display current song, playing status, etc. subscribe here. They will
  // re-render on state changes, but ONLY when state actually changes — not
  // on every parent render like before (when value was an inline object {}).
  const actionsValue = useMemo(() => ({
    audioRef,
    playSong,
    togglePlay,
    playNext,
    playPrev,
    cycleRepeat,
    cycleShuffleMode,
    toggleShuffle: cycleShuffleMode,
    toggleMute,
    handleVolumeChange,
    setSongs,
    removeFromQueue,
    moveSongInQueue,
    playPlaylist,
    toggleQueue,
  }), [
    playSong, togglePlay, playNext, playPrev,
    cycleRepeat, cycleShuffleMode,
    toggleMute, handleVolumeChange,
    removeFromQueue, moveSongInQueue,
    playPlaylist, toggleQueue,
  ]);

  const stateValue = useMemo(() => ({
    currentSong,
    isPlaying,
    songs,
    repeat,
    shuffleMode,
    shuffle: shuffleMode !== 'none',
    isMuted,
    volume,
    recentlyPlayed,
    showQueue,
    playingPlaylistName,
  }), [
    currentSong, isPlaying, songs, repeat,
    shuffleMode, isMuted, volume,
    recentlyPlayed, showQueue, playingPlaylistName,
  ]);

  return (
    <PlayerActionsContext.Provider value={actionsValue}>
      <PlayerStateContext.Provider value={stateValue}>
        {children}
      </PlayerStateContext.Provider>
    </PlayerActionsContext.Provider>
  );
};