import { create } from 'zustand';

// ── Shared Audio instance ─────────────────────────────────────────────────────
// Exported so MusicPlayer can attach its own lightweight listeners
// (timeupdate, loadedmetadata) without duplicating playback logic.
export const audio = new Audio();
audio.preload = 'metadata';

// ── safePlay — the ONLY place audio.play() is called ─────────────────────────
// FIX Bug 5: Previously audio.src was set and audio.play() was called
// immediately — the browser hadn't loaded the file yet, causing:
// "The play() request was interrupted by a new load request"
//
// Fix — 3 step process:
//   1. Pause and cancel any previous pending load
//   2. Set new src and wait for browser to say it's ready (canplay event)
//   3. Only then call play()
//
// AbortController handles rapid song switching — if user clicks a new song
// before the previous one loaded, the old load is cleanly cancelled.

let currentAbortController = null;

async function safePlay(src) {
  // Cancel any previous pending load
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  const { signal } = currentAbortController;

  // Step 1 — pause current playback before changing src
  audio.pause();
  audio.src = src;
  audio.load();

  try {
    // Step 2 — wait until browser has enough data to start playing
    await new Promise((resolve, reject) => {
      if (signal.aborted) {
        return reject(new DOMException('Aborted', 'AbortError'));
      }

      const onCanPlay = () => { cleanup(); resolve(); };
      const onError   = () => { cleanup(); reject(new Error(audio.error?.message || 'Audio failed to load')); };
      const onAbort   = () => { cleanup(); reject(new DOMException('Aborted', 'AbortError')); };

      const cleanup = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error',   onError);
        signal.removeEventListener('abort',  onAbort);
      };

      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('error',   onError,   { once: true });
      signal.addEventListener('abort',  onAbort,   { once: true });
    });

    if (signal.aborted) return;

    // Step 3 — browser is ready, now safe to play
    await audio.play();

  } catch (err) {
    if (err.name === 'AbortError') {
      // Expected when user switches songs quickly — not a real error
      return;
    }
    // Real error — network failure, unsupported codec, etc.
    console.error('[playerStore] Playback error:', err.message);
    throw err;
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────
const usePlayerStore = create((set, get) => ({
  currentSong:    null,
  recentlyPlayed: [],
  isPlaying:      false,
  volume:         1,
  currentTime:    0,
  duration:       0,
  isShuffle:      false,
  repeatMode:     'none', // 'none' | 'all' | 'one'

  // ── playSong ───────────────────────────────────────────────────────────────
  playSong: async (song, queue = []) => {
    const src = song?.audioUrl || song?.fileUrl || '';
    if (!src) {
      console.warn('[playerStore] playSong — no audio URL on song:', song);
      return;
    }

    // ✅ Update UI immediately — show song info without waiting for load
    set((state) => ({
      currentSong:    song,
      isPlaying:      true,
      recentlyPlayed: [
        song,
        ...state.recentlyPlayed.filter((s) => s.id !== song.id),
      ].slice(0, 20),
    }));

    // Attach ended handler for auto-next
    audio.onended = () => {
      const { repeatMode, playNext } = get();
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (repeatMode === 'all' || queue.length > 0) {
        playNext();
      } else {
        set({ isPlaying: false });
      }
    };

    try {
      await safePlay(src);
    } catch {
      // safePlay already logged — reflect failure in UI
      set({ isPlaying: false });
    }
  },

  // ── playNext ───────────────────────────────────────────────────────────────
  playNext: () => {
    const { currentSong, isShuffle, repeatMode, playSong } = get();
    import('./queueStore').then(({ default: useQueueStore }) => {
      const { queue } = useQueueStore.getState();
      if (!queue.length) return;

      const currentIndex = queue.findIndex((s) => s.id === currentSong?.id);
      let nextIndex;

      if (isShuffle) {
        do {
          nextIndex = Math.floor(Math.random() * queue.length);
        } while (queue.length > 1 && nextIndex === currentIndex);
      } else {
        nextIndex = currentIndex + 1;
        if (nextIndex >= queue.length) {
          if (repeatMode === 'all') nextIndex = 0;
          else { set({ isPlaying: false }); return; }
        }
      }

      playSong(queue[nextIndex], queue);
    });
  },

  // ── playPrev ───────────────────────────────────────────────────────────────
  playPrev: () => {
    const { currentSong, playSong } = get();
    // If more than 3 seconds in — restart current song instead
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    import('./queueStore').then(({ default: useQueueStore }) => {
      const { queue } = useQueueStore.getState();
      if (!queue.length) return;
      const currentIndex = queue.findIndex((s) => s.id === currentSong?.id);
      const prevIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
      playSong(queue[prevIndex], queue);
    });
  },

  // ── Playback controls ──────────────────────────────────────────────────────
  pauseSong: () => {
    audio.pause();
    set({ isPlaying: false });
  },

  resumeSong: () => {
    if (!audio.src) return;
    audio.play().catch((err) => {
      console.error('[playerStore] Resume error:', err.message);
      set({ isPlaying: false });
    });
    set({ isPlaying: true });
  },

  togglePlay: () => {
    const { isPlaying, pauseSong, resumeSong } = get();
    if (isPlaying) pauseSong();
    else resumeSong();
  },

  // ── Volume ─────────────────────────────────────────────────────────────────
  setVolume: (v) => {
    audio.volume = v;
    set({ volume: v });
  },

  // ── Seek ───────────────────────────────────────────────────────────────────
  setCurrentTime: (t) => {
    audio.currentTime = t;
    set({ currentTime: t });
  },

  setDuration: (d) => set({ duration: d }),

  // ── Shuffle / Repeat ───────────────────────────────────────────────────────
  toggleShuffle:  () => set((s) => ({ isShuffle: !s.isShuffle })),
  setRepeatMode:  (mode) => set({ repeatMode: mode }),

  // ── Stop ───────────────────────────────────────────────────────────────────
  stop: () => {
    if (currentAbortController) currentAbortController.abort();
    audio.pause();
    audio.src = '';
    audio.onended = null;
    set({ currentSong: null, isPlaying: false, currentTime: 0, duration: 0 });
  },
}));

export { usePlayerStore };
export default usePlayerStore;