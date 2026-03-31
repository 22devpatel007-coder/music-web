import axios from 'axios';
import { auth } from '../firebase';

// ─── Create instance ──────────────────────────────────────────────────────────
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 15000, // 15s — prevents hanging requests
});

// ─── Token refresh helper ─────────────────────────────────────────────────────
// Returns a fresh Firebase ID token.
// Proactively refreshes if token expires within 5 minutes.
// Falls back to force-refresh on any error.
const getFreshToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const tokenResult = await user.getIdTokenResult(false);
    const expiresAt   = new Date(tokenResult.expirationTime).getTime();
    const msLeft      = expiresAt - Date.now();
    const THRESHOLD   = 5 * 60 * 1000; // 5 minutes

    // Proactively refresh if expiring soon
    const needsRefresh = msLeft < THRESHOLD;
    return await user.getIdToken(needsRefresh);
  } catch {
    // getIdTokenResult failed (rare) — force a network refresh
    return await user.getIdToken(true);
  }
};

// ─── Request interceptor ──────────────────────────────────────────────────────
// Attaches a fresh Bearer token to every outgoing request.
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await getFreshToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      // Log but don't block the request — server will reject with 401 if needed
      console.error('[axiosInstance] Could not attach token:', err.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ─────────────────────────────────────────────────────
// On 401: force-refresh the token once and retry the original request.
// If the retry also fails (e.g. account deleted, clock skew), sign out cleanly.
axiosInstance.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Only handle 401s, and only retry once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Force a network refresh — bypasses Firebase's local cache entirely
      const user = auth.currentUser;
      if (!user) throw new Error('No user');

      const freshToken = await user.getIdToken(true);
      originalRequest.headers.Authorization = `Bearer ${freshToken}`;

      // Retry the original request with the new token
      return await axiosInstance(originalRequest);

    } catch (refreshError) {
      // Refresh failed — token is unrecoverable.
      // Sign out and redirect to login so the user gets a clean session.
      console.error('[axiosInstance] Token refresh failed, signing out:', refreshError.message);

      try { await auth.signOut(); } catch { /* ignore signout errors */ }

      // Use replace so the user can't "back" into an authenticated page
      window.location.replace('/login');

      return Promise.reject(refreshError);
    }
  }
);

export default axiosInstance;