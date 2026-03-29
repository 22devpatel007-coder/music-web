import axios from 'axios';
import { auth } from '../firebase';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

axiosInstance.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      // Always force refresh token
      const token = await user.getIdToken(true);
      console.log('Fresh token attached ✅');
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log('No user logged in');
    }
  } catch (err) {
    console.error('Token refresh failed:', err.message);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default axiosInstance;