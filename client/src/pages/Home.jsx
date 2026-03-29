import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import Navbar from '../components/Navbar';
import SongList from '../components/SongList';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';

const Home = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const res = await axiosInstance.get('/api/songs');
        setSongs(res.data);
      } catch (err) {
        console.error('Failed to fetch songs:', err);
      }
      setLoading(false);
    };
    fetchSongs();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-900 pb-32">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <SearchBar />
        </div>
        <h2 className="text-white text-2xl font-bold mb-6">
          🎵 All Songs
        </h2>
        <SongList songs={songs} />
      </div>
    </div>
  );
};

export default Home;