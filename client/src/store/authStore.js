import { create } from 'zustand';
import { logout as authServiceLogout } from '../services/auth.service';

const useAuthStore = create((set) => ({
  user: null,
  isAdmin: false,
  loading: true,
  likedSongs: [],

  setUser: (user) => set({ user }),
  setAdmin: (isAdmin) => set({ isAdmin }),
  setLoading: (loading) => set({ loading }),
  setLikedSongs: (likedSongs) => set({ likedSongs }),
  logout: async () => {
    try {
      await authServiceLogout();
    } finally {
      set({ user: null, isAdmin: false, likedSongs: [] });
    }
  },
}));

export { useAuthStore };
export default useAuthStore;
