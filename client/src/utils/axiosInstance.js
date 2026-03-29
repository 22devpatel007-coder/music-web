import axios from 'axios';
import { auth } from '../firebase';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Get a guaranteed fresh token by checking expiry manually
const getFreshToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    // getIdTokenResult gives us expiry info without a network call
    const tokenResult = await user.getIdTokenResult(false);
    const expiry = new Date(tokenResult.expirationTime).getTime();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    console.log('Token expiry:', tokenResult.expirationTime);
    console.log('Time now:', new Date().toISOString());
    console.log('Minutes until expiry:', Math.round((expiry - now) / 60000));

    // If token expires within 10 minutes or is already expired, force refresh
    const needsRefresh = expiry - now < tenMinutes;
    const token = await user.getIdToken(needsRefresh);
    console.log('Force refresh used:', needsRefresh);
    return token;
  } catch (err) {
    console.error('getIdTokenResult failed, forcing refresh:', err.message);
    // Last resort — force refresh
    return await user.getIdToken(true);
  }
};

axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await getFreshToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error('Token fetch error:', err.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const errorCode = error.response?.data?.code;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Token is expired even after our proactive refresh — clock skew or cache issue
      // Sign out completely to clear Firebase's cached token, then redirect to login
      console.error('Token still expired after refresh. Signing out to clear cache.');
      console.error('This usually means your system clock is out of sync.');
      console.error('Fix: Windows Settings → Time & Language → Sync now');

      try {
        await auth.signOut();
      } catch (e) {
        // ignore signout errors
      }

      // Redirect to login — user must log in again to get a fresh token
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;