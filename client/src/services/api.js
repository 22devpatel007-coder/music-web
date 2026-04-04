import axios from 'axios';
import { auth } from '../firebase';
import { API_BASE_URL } from '../config/index';

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

let isRefreshing = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isRefreshing) {
      isRefreshing = true;
      try {
        const user = auth.currentUser;
        if (user) await user.getIdToken(true);
      } catch {
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    }
    const message = error.response?.data?.error?.message || error.message || 'Unknown error';
    const code = error.response?.data?.error?.code || 'UNKNOWN';
    return Promise.reject({ message, code, status: error.response?.status });
  }
);

export const axiosUpload = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 300_000,
});

axiosUpload.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

axiosUpload.interceptors.response.use(
  (response) => response,
  api.interceptors.response.handlers[0].rejected
);

export const extractSongs = (data) =>
  Array.isArray(data) ? data : data?.songs ?? data?.data?.songs ?? [];

export const extractUsers = (data) =>
  Array.isArray(data) ? data : data?.users ?? data?.data?.users ?? data?.data ?? [];

export default api;
