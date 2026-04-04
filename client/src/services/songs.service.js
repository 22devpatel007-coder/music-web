import api from './api';

const unwrap = (payload) => payload?.data ?? payload;

export const getSongs = async (limit = 20, cursor = null) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const res = await api.get('/songs', { params });
  return unwrap(res.data);
};

export const getSongById = async (id) => {
  const res = await api.get(`/songs/${id}`);
  return unwrap(res.data);
};

export const createSong = async (formData) => {
  const res = await api.post('/songs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(res.data);
};

export const updateSong = async (id, data) => {
  const res = await api.patch(`/songs/${id}`, data);
  return unwrap(res.data);
};

export const deleteSong = async (id) => {
  const res = await api.delete(`/songs/${id}`);
  return unwrap(res.data);
};
