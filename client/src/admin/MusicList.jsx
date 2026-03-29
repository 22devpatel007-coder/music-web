import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';

const MusicList = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const res = await axiosInstance.get('/api/songs');
      setSongs(res.data);
    } catch (err) {
      console.error('Failed to fetch songs:', err);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await axiosInstance.delete(`/api/songs/${id}`);
      setSongs(songs.filter(s => s.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setDeletingId(null);
    setConfirmId(null);
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-white text-3xl font-bold mb-8">
          Manage Songs
        </h1>

        {songs.length === 0 ? (
          <p className="text-gray-400">No songs uploaded yet</p>
        ) : (
          <div className="bg-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-gray-400 text-left px-4 py-3">
                    Cover
                  </th>
                  <th className="text-gray-400 text-left px-4 py-3">
                    Title
                  </th>
                  <th className="text-gray-400 text-left px-4 py-3">
                    Artist
                  </th>
                  <th className="text-gray-400 text-left px-4 py-3">
                    Genre
                  </th>
                  <th className="text-gray-400 text-left px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {songs.map(song => (
                  <tr key={song.id}
                    className="border-t border-gray-700 
                      hover:bg-gray-750 transition">
                    <td className="px-4 py-3">
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    </td>
                    <td className="px-4 py-3 text-white">{song.title}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {song.artist}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-green-500 text-sm bg-green-500 
                        bg-opacity-20 px-2 py-1 rounded-full">
                        {song.genre}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {confirmId === song.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(song.id)}
                            disabled={deletingId === song.id}
                            className="bg-red-500 hover:bg-red-600 
                              text-white px-3 py-1 rounded-lg 
                              text-sm transition">
                            {deletingId === song.id 
                              ? 'Deleting...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="bg-gray-600 hover:bg-gray-500 
                              text-white px-3 py-1 rounded-lg 
                              text-sm transition">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(song.id)}
                          className="bg-red-500 bg-opacity-20 
                            hover:bg-opacity-40 text-red-400 
                            px-3 py-1 rounded-lg text-sm transition">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicList;