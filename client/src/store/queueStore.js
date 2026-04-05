import { create } from 'zustand';
import usePlayerStore from './playerStore';

const useQueueStore = create((set, get) => ({
  queue: [],
  currentIndex: 0,

  // ✅ FIX Bug 2: Previously setQueue(songs) silently dropped the startIndex
  // argument — always playing songs[0] no matter which song was clicked.
  // Now accepts startIndex so the correct song plays immediately.
  //
  // ✅ FIX Bug 6: removeFromQueue was filtering by array index (i !== index)
  // but MusicPlayer calls it with a song ID string — a string never equals
  // a numeric index so songs were never actually removed.
  // Now filters by song.id instead.

  setQueue: (songs, startIndex = 0) => {
    if (!songs || songs.length === 0) return;

    // Clamp index so it never goes out of bounds
    const idx = Math.max(0, Math.min(startIndex, songs.length - 1));

    set({ queue: songs, currentIndex: idx });

    // Play the actually clicked song, not songs[0]
    usePlayerStore.getState().playSong(songs[idx], songs);
  },

  addToQueue: (song) => {
    if (!song) return;
    set((s) => ({ queue: [...s.queue, song] }));
  },

  // ✅ FIX Bug 6: filter by song.id not by array index
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
      usePlayerStore.getState().playSong(queue[nextIndex], queue);
    }
  },

  prevSong: () => {
    const { queue, currentIndex } = get();
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      set({ currentIndex: prevIndex });
      usePlayerStore.getState().playSong(queue[prevIndex], queue);
    }
  },

  clearQueue: () => set({ queue: [], currentIndex: 0 }),
}));

export { useQueueStore };
export default useQueueStore;