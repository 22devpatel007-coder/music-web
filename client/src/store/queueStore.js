/**
 * client/src/store/queueStore.js
 *
 * BUG 4 FIX: This file now calls registerQueueStore() after the store is
 * created. This gives playerStore a synchronous getter for queueStore's
 * live state without using dynamic import() inside action handlers.
 *
 * Why this matters:
 *   - playerStore needs queueStore.queue in playNext/playPrev
 *   - queueStore needs playerStore.playSong in setQueue/nextSong/prevSong
 *   - A normal static import of queueStore inside playerStore would be circular
 *   - The old fix used dynamic import() — async, unpredictable timing
 *   - This fix uses a registered getter — synchronous, zero timing issues
 */

import { create } from 'zustand';
import usePlayerStore, { registerQueueStore } from './playerStore';

const useQueueStore = create((set, get) => ({
  queue: [],
  currentIndex: 0,

  setQueue: (songs, startIndex = 0) => {
    if (!songs || songs.length === 0) return;

    const idx = Math.max(0, Math.min(startIndex, songs.length - 1));
    set({ queue: songs, currentIndex: idx });

    // playSong no longer needs the queue passed — it reads queueStore directly
    usePlayerStore.getState().playSong(songs[idx]);
  },

  addToQueue: (song) => {
    if (!song) return;
    set((s) => ({ queue: [...s.queue, song] }));
  },

  removeFromQueue: (songId) => {
    set((s) => ({
      queue: s.queue.filter((song) => song.id !== songId),
    }));
  },

  nextSong: () => {
    const { queue, currentIndex } = get();
    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      set({ currentIndex: nextIndex });
      usePlayerStore.getState().playSong(queue[nextIndex]);
    }
  },

  prevSong: () => {
    const { queue, currentIndex } = get();
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      set({ currentIndex: prevIndex });
      usePlayerStore.getState().playSong(queue[prevIndex]);
    }
  },

  clearQueue: () => set({ queue: [], currentIndex: 0 }),
}));

// BUG 4 FIX: Register this store's getState with playerStore.
// playerStore.playNext/playPrev call getQueueState() synchronously —
// this registration makes that possible without circular import or
// dynamic import() inside action handlers.
registerQueueStore(useQueueStore.getState);

export { useQueueStore };
export default useQueueStore;