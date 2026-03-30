import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ songs: 0, users: 0 });
  const [recentSongs, setRecentSongs] = useState([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        
        const [songsRes, usersRes] = await Promise.all([
  axiosInstance.get('/api/songs'),
  axiosInstance.get('/api/users'),
]);

        setStats({
          songs: songsRes.data.length,
          users: usersRes.data.length,
        });
        setRecentSongs(songsRes.data.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-white text-3xl font-bold mb-8">
          Admin Dashboard
        </h1>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <div className="bg-gray-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Total Songs</p>
            <p className="text-green-400 text-4xl font-bold">
              {stats.songs}
            </p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Total Users</p>
            <p className="text-green-400 text-4xl font-bold">
              {stats.users}
            </p>
          </div>
        </div>

        {/* Nav Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Link to="/admin/upload"
            className="bg-green-500 hover:bg-green-600 text-black 
              font-bold py-4 rounded-xl text-center transition">
            ⬆️ Upload Song
          </Link>
          <Link to="/admin/songs"
            className="bg-gray-800 hover:bg-gray-700 text-white 
              font-bold py-4 rounded-xl text-center transition">
            🎵 Manage Songs
          </Link>
          <Link to="/admin/users"
            className="bg-gray-800 hover:bg-gray-700 text-white 
              font-bold py-4 rounded-xl text-center transition">
            👥 View Users
          </Link>
        </div>

        {/* Recent Songs */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <h2 className="text-white text-xl font-bold mb-4">
            Recent Uploads
          </h2>
          {recentSongs.length === 0 ? (
            <p className="text-gray-400">No songs uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {recentSongs.map(song => (
                <div key={song.id}
                  className="flex items-center gap-4 
                    border-b border-gray-700 pb-3">
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <p className="text-white font-semibold">{song.title}</p>
                    <p className="text-gray-400 text-sm">{song.artist}</p>
                  </div>
                  <span className="ml-auto text-green-500 text-sm">
                    {song.genre}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;