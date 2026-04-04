import { create } from 'zustand';

let audioRef = null;

const getAudio = () => {
  if (!audioRef) audioRef = new Audio();
  return audioRef;
};

const usePlayerStore = create((set, get) => ({
  currentSong: null,
  recentlyPlayed: [],
  isPlaying: false,
  volume: 1,
  currentTime: 0,
  duration: 0,
  isShuffle: false,
  repeatMode: 'none',

  playSong: (song) => {
    const audio = getAudio();
    audio.src = song.audioUrl || song.fileUrl || '';
    if (!audio.src) return;
    audio.play();
    audio.onended = () => {
      const { repeatMode } = get();
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        set({ isPlaying: false });
      }
    };
    audio.ontimeupdate = () => set({ currentTime: audio.currentTime });
    audio.onloadedmetadata = () => set({ duration: audio.duration });
    set((state) => ({
      currentSong: song,
      isPlaying: true,
      recentlyPlayed: [song, ...state.recentlyPlayed.filter((s) => s.id !== song.id)].slice(0, 20),
    }));
  },

  togglePlay: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      getAudio().pause();
      set({ isPlaying: false });
    } else {
      getAudio().play();
      set({ isPlaying: true });
    }
  },

  pauseSong: () => {
    getAudio().pause();
    set({ isPlaying: false });
  },

  resumeSong: () => {
    getAudio().play();
    set({ isPlaying: true });
  },

  setVolume: (v) => {
    getAudio().volume = v;
    set({ volume: v });
  },

  setCurrentTime: (t) => {
    getAudio().currentTime = t;
    set({ currentTime: t });
  },

  setDuration: (d) => set({ duration: d }),
  toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),
  setRepeatMode: (mode) => set({ repeatMode: mode }),

  stop: () => {
    const audio = getAudio();
    audio.pause();
    audio.src = '';
    set({ currentSong: null, isPlaying: false, currentTime: 0, duration: 0 });
  },
}));

export { usePlayerStore };
export default usePlayerStore;
