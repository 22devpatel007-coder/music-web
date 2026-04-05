/**
 * client/src/store/playerStore.js
 *
 * BUG 2 FIX: resumeSong now awaits audio.play() before setting isPlaying:true.
 *   Previously set({ isPlaying: true }) was called synchronously before
 *   audio.play() resolved — if play failed (autoplay policy, network error),
 *   the UI showed "playing" with silent audio.
 *
 * BUG 3 FIX: audio.onended no longer uses the stale `queue` closure argument.
 *   The old pattern was: playSong(song, queue) → audio.onended = () => { ...queue }
 *   That `queue` was frozen at call time. If the user modified the queue after
 *   the song started, onended used the old snapshot.
 *   Fix: onended now calls playNext() only — playNext reads the live queueStore.
 *
 * BUG 4 FIX: playNext/playPrev no longer use dynamic import('./queueStore').
 *   Dynamic imports are async and fire in a microtask — by the time they
 *   resolve, state can be stale and event order is unpredictable.
 *   Fix: queueStore is imported statically at the top of this file via
 *   getQueueState() — a lazy getter that avoids the circular dependency
 *   without dynamic import.
 */

import { create } from 'zustand';

// ── Shared Audio instance ─────────────────────────────────────────────────────
export const audio = new Audio();
audio.preload = 'metadata';

// ── Lazy queueStore accessor ──────────────────────────────────────────────────
// Avoids circular dependency (queueStore imports playerStore, playerStore needs
// queueStore) without resorting to async dynamic import() calls inside actions.
// The getter is called at runtime — by then both modules are fully initialized.
let _getQueueState = null;
export function registerQueueStore(getStateFn) {
  _getQueueState = getStateFn;
}
function getQueueState() {
  if (!_getQueueState) {
    // Fallback: attempt direct require (only reached if registerQueueStore
    // was never called — should not happen in normal app flow)
    console.warn('[playerStore] queueStore not registered yet');
    return { queue: [] };
  }
  return _getQueueState();
}

// ── safePlay ──────────────────────────────────────────────────────────────────
// The ONLY place audio.play() is called.
// Waits for 'canplay' before calling play() to avoid the browser error:
// "The play() request was interrupted by a new load request"

let currentAbortController = null;

async function safePlay(src) {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  const { signal } = currentAbortController;

  audio.pause();
  audio.src = src;
  audio.load();

  try {
    await new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));

      const onCanPlay = () => { cleanup(); resolve(); };
      const onError   = () => { cleanup(); reject(new Error(audio.error?.message || 'Audio load failed')); };
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
    await audio.play();

  } catch (err) {
    if (err.name === 'AbortError') return; // User switched songs — expected
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
  playSong: async (song) => {
    // BUG 3 FIX: Removed `queue` parameter from playSong signature.
    // audio.onended now calls get().playNext() which reads the LIVE queueStore,
    // not a snapshot captured at the moment playSong was called.

    const src = song?.audioUrl || song?.fileUrl || '';
    if (!src) {
      console.warn('[playerStore] playSong — no audio URL on song:', song);
      return;
    }

    // Update UI immediately — show song info without waiting for audio load
    set((state) => ({
      currentSong:    song,
      isPlaying:      true,
      recentlyPlayed: [
        song,
        ...state.recentlyPlayed.filter((s) => s.id !== song.id),
      ].slice(0, 20),
    }));

    // BUG 3 FIX: onended reads live state via get(), not stale closure queue
    audio.onended = () => {
      const { repeatMode, playNext } = get();
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        playNext();
      }
    };

    try {
      await safePlay(src);
      // Confirm isPlaying after successful play (in case something set it false)
      set({ isPlaying: true });
    } catch {
      set({ isPlaying: false });
    }
  },

  // ── playNext ───────────────────────────────────────────────────────────────
  // BUG 4 FIX: Uses getQueueState() synchronously instead of dynamic import()
  playNext: () => {
    const { currentSong, isShuffle, repeatMode, playSong } = get();
    const { queue } = getQueueState(); // synchronous — no async/await needed

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

    playSong(queue[nextIndex]);
  },

  // ── playPrev ───────────────────────────────────────────────────────────────
  // BUG 4 FIX: Uses getQueueState() synchronously instead of dynamic import()
  playPrev: () => {
    const { currentSong, playSong } = get();

    // If more than 3 seconds in — restart current song instead of going back
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const { queue } = getQueueState(); // synchronous
    if (!queue.length) return;

    const currentIndex = queue.findIndex((s) => s.id === currentSong?.id);
    const prevIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
    playSong(queue[prevIndex]);
  },

  // ── Playback controls ──────────────────────────────────────────────────────

  pauseSong: () => {
    audio.pause();
    set({ isPlaying: false });
  },

  // BUG 2 FIX: resumeSong is now async and awaits audio.play() before
  // setting isPlaying:true. Previously the set() was called synchronously
  // regardless of whether play() succeeded.
  resumeSong: async () => {
    if (!audio.src) return;
    try {
      await audio.play();
      set({ isPlaying: true }); // Only set true AFTER play() resolves
    } catch (err) {
      console.error('[playerStore] Resume error:', err.message);
      set({ isPlaying: false }); // Play failed — keep UI in sync
    }
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
    if (currentAbortController) currentAbortController.abort();
    audio.pause();
    audio.src = '';
    audio.onended = null;
    set({ currentSong: null, isPlaying: false, currentTime: 0, duration: 0 });
  },
}));

export { usePlayerStore };
export default usePlayerStore;