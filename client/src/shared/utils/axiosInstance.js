import axios from 'axios';
import { auth } from '../../firebase';

// ─── Base instance (for regular API calls) ────────────────────────────────────
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 15_000, // 15s — fine for reads
});

// ─── Upload instance (for song/cover uploads to Cloudinary via server) ────────
// FIX: 15s timeout is too short for large audio + image uploads.
// Use this instance for POST /api/songs uploads only.
export const axiosUpload = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 300_000, // 5 minutes — covers large files on slow connections
});

// ─── Token refresh helper ─────────────────────────────────────────────────────
const getFreshToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const tokenResult = await user.getIdTokenResult(false);
    const expiresAt   = new Date(tokenResult.expirationTime).getTime();
    const msLeft      = expiresAt - Date.now();
    const THRESHOLD   = 5 * 60 * 1000;
    return await user.getIdToken(msLeft < THRESHOLD);
  } catch {
    return await user.getIdToken(true);
  }
};

// ─── Attach token to both instances ──────────────────────────────────────────
const attachToken = async (config) => {
  try {
    const token = await getFreshToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (err) {
    console.error('[axiosInstance] Could not attach token:', err.message);
  }
  return config;
};

axiosInstance.interceptors.request.use(attachToken, err => Promise.reject(err));
axiosUpload.interceptors.request.use(attachToken,   err => Promise.reject(err));

// ─── 401 retry logic (shared) ────────────────────────────────────────────────
const makeRetryInterceptor = (instance) =>
  instance.interceptors.response.use(
    res => res,
    async (error) => {
      const orig = error.config;
      if (error.response?.status !== 401 || orig._retry) return Promise.reject(error);
      orig._retry = true;
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user');
        const freshToken = await user.getIdToken(true);
        orig.headers.Authorization = `Bearer ${freshToken}`;
        return await instance(orig);
      } catch (refreshError) {
        console.error('[axiosInstance] Token refresh failed, signing out:', refreshError.message);
        try { await auth.signOut(); } catch { /* ignore */ }
        window.location.replace('/login');
        return Promise.reject(refreshError);
      }
    }
  );
// Use this everywhere you fetch /api/songs
export const extractSongs = (data) =>
  Array.isArray(data) ? data : data.songs ?? [];

export const extractUsers = (data) =>
  Array.isArray(data) ? data : data.users ?? [];

makeRetryInterceptor(axiosInstance);
makeRetryInterceptor(axiosUpload);

export default axiosInstance;