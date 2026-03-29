import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { usePlayer } from '../context/PlayerContext';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';

const Player = () => {
  const { id } = useParams();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playSong, togglePlay, isPlaying, currentSong } = usePlayer();

  useEffect(() => {
    const fetchSong = async () => {
      try {
        const res = await axiosInstance.get(`/api/songs/${id}`);

        setSong(res.data);
        playSong(res.data);
      } catch (err) {
        console.error('Failed to fetch song:', err);
      }
      setLoading(false);
    };
    fetchSong();
  }, [id]);

  if (loading) return <Loader />;
  if (!song) return (
    <div className="min-h-screen bg-gray-900 flex items-center 
      justify-center text-white">Song not found</div>
  );

  return (
    <div className="min-h-screen bg-gray-900 pb-32">
      <Navbar />
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <img
          src={song.coverUrl}
          alt={song.title}
          className="w-64 h-64 rounded-2xl object-cover mx-auto 
            shadow-2xl mb-8"
        />
        <h1 className="text-white text-3xl font-bold mb-2">
          {song.title}
        </h1>
        <p className="text-gray-400 text-lg mb-1">{song.artist}</p>
        <span className="text-green-500 text-sm">{song.genre}</span>

        <div className="mt-8">
          <button
            onClick={togglePlay}
            className="bg-green-500 hover:bg-green-400 text-black 
              w-16 h-16 rounded-full flex items-center justify-center 
              text-3xl mx-auto transition">
            {isPlaying && currentSong?.id === song.id ? '⏸' : '▶'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Player;