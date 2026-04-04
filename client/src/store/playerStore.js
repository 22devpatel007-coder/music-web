import { create } from 'zustand';

// Single shared Audio instance — exported so MusicPlayer can attach
// its own lightweight listeners (timeupdate, loadedmetadata) without
// duplicating playback logic.
export const audio = new Audio();
audio.preload = 'metadata';

// ── Internal play helper ──────────────────────────────────────────────────────
// Cancels any in-flight play(), sets new src, waits for canplay, then plays.
// This is the ONLY place audio.play() is called — prevents the
// "play() interrupted by new load request" DOMException.
let playAbortController = null;

async function safePlay(src, onEnded) {
  // Cancel previous pending play if still waiting
  if (playAbortController) {
    playAbortController.abort();
  }
  playAbortController = new AbortController();
  const signal = playAbortController.signal;

  // Setting src triggers a load — pause first to avoid interruption warning
  audio.pause();
  audio.src = src;
  audio.load();

  // Remove old onended before attaching new one
  audio.onended = null;

  try {
    // Wait until browser has enough data to start playing
    await new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));

      const onCanPlay = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error(audio.error?.message || 'Audio load error'));
      };
      const onAbort = () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };

      const cleanup = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        signal.removeEventListener('abort', onAbort);
      };

      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('error', onError, { once: true });
      signal.addEventListener('abort', onAbort, { once: true });
    });

    if (signal.aborted) return;

    audio.onended = onEnded;
    await audio.play();
  } catch (err) {
    if (err.name === 'AbortError') {
      // Expected — a new song was requested before this one loaded. Silently ignore.
      return;
    }
    // Real errors (network failure, codec unsupported, etc.)
    console.error('[playerStore] audio playback error:', err.message);
    throw err;
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────
const usePlayerStore = create((set, get) => ({
  currentSong: null,
  recentlyPlayed: [],
  isPlaying: false,
  volume: 1,
  currentTime: 0,
  duration: 0,
  isShuffle: false,
  repeatMode: 'none', // 'none' | 'all' | 'one'

  // ── playSong ───────────────────────────────────────────────────────────────
  playSong: async (song, queue = []) => {
    const src = song.audioUrl || song.fileUrl || '';
    if (!src) {
      console.warn('[playerStore] playSong called with no audio URL', song);
      return;
    }

    // Optimistically update UI — show song info immediately
    set((state) => ({
      currentSong: song,
      isPlaying: true,
      recentlyPlayed: [
        song,
        ...state.recentlyPlayed.filter((s) => s.id !== song.id),
      ].slice(0, 20),
    }));

    const onEnded = () => {
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
      await safePlay(src, onEnded);
    } catch {
      // safePlay already logged — reflect failure in UI
      set({ isPlaying: false });
    }
  },

  // ── playNext / playPrev ────────────────────────────────────────────────────
  // These operate on the queue held in queueStore.
  // Import queueStore lazily to avoid circular deps.
  playNext: () => {
    const { currentSong, isShuffle, repeatMode, playSong } = get();
    // Dynamically import to avoid circular dependency at module load time
    import('./queueStore').then(({ useQueueStore }) => {
      const { queue } = useQueueStore.getState();
      if (!queue.length) return;

      let nextIndex;
      const currentIndex = queue.findIndex((s) => s.id === currentSong?.id);

      if (isShuffle) {
        do {
          nextIndex = Math.floor(Math.random() * queue.length);
        } while (queue.length > 1 && nextIndex === currentIndex);
      } else {
        nextIndex = currentIndex + 1;
        if (nextIndex >= queue.length) {
          if (repeatMode === 'all') nextIndex = 0;
          else return set({ isPlaying: false });
        }
      }

      playSong(queue[nextIndex], queue);
    });
  },

  playPrev: () => {
    const { currentSong, playSong } = get();
    // If more than 3 seconds in — restart current song
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    import('./queueStore').then(({ useQueueStore }) => {
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
      console.error('[playerStore] resume error:', err.message);
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
  toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),
  setRepeatMode: (mode) => set({ repeatMode: mode }),

  // ── Stop ───────────────────────────────────────────────────────────────────
  stop: () => {
    if (playAbortController) playAbortController.abort();
    audio.pause();
    audio.src = '';
    set({ currentSong: null, isPlaying: false, currentTime: 0, duration: 0 });
  },
}));

export { usePlayerStore };
export default usePlayerStore;