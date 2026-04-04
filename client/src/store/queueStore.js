import { create } from 'zustand';
import usePlayerStore from './playerStore';

const useQueueStore = create((set, get) => ({
  queue: [],
  currentIndex: 0,

  setQueue: (songs) => {
    set({ queue: songs, currentIndex: 0 });
    if (songs.length > 0) usePlayerStore.getState().playSong(songs[0]);
  },

  addToQueue: (song) => set((s) => ({ queue: [...s.queue, song] })),

  removeFromQueue: (index) => set((s) => ({
    queue: s.queue.filter((_, i) => i !== index),
  })),

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

export { useQueueStore };
export default useQueueStore;
