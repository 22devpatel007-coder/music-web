import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import SongList from '../components/SongList';
import Loader from '../components/Loader';
import { Link } from 'react-router-dom';

const LikedSongs = () => {
  const { likedSongs } = useAuth();
  const [songs, setSongs]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (!likedSongs || likedSongs.length === 0) {
        setSongs([]);
        setLoading(false);
        return;
      }
      try {
        // Fetch all songs then filter by liked IDs (avoids needing a bulk-get endpoint)
        const res = await axiosInstance.get('/api/songs');
        const liked = res.data.filter(s => likedSongs.includes(s.id));
        setSongs(liked);
      } catch (err) {
        console.error('Failed to fetch liked songs:', err);
      }
      setLoading(false);
    };
    fetchAll();
  }, [likedSongs]);

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-900 pb-32">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          {/* Gradient heart header */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600
            flex items-center justify-center shadow-xl shadow-red-500/30 flex-shrink-0">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-white text-3xl font-bold">Liked Songs</h1>
            <p className="text-gray-400 text-sm mt-1">
              {songs.length} {songs.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>

        {songs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">💔</div>
            <p className="text-gray-400 text-lg mb-4">No liked songs yet</p>
            <p className="text-gray-500 text-sm mb-6">
              Tap the ❤️ on any song to add it here
            </p>
            <Link
              to="/home"
              className="bg-green-500 hover:bg-green-600 text-black
                font-bold px-6 py-3 rounded-full transition inline-block">
              Browse Songs
            </Link>
          </div>
        ) : (
          <SongList songs={songs} />
        )}
      </div>
    </div>
  );
};

export default LikedSongs;