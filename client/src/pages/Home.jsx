import { useState, useEffect, useMemo } from 'react';
import axiosInstance from '../utils/axiosInstance';
import Navbar from '../components/Navbar';
import SongList from '../components/SongList';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';
import { usePlayer } from '../context/PlayerContext';

const GenrePill = ({ genre, active, onClick }) => (
  <button
    onClick={() => onClick(genre)}
    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
      whitespace-nowrap
      ${active
        ? 'bg-green-500 text-black shadow-lg shadow-green-500/30'
        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}>
    {genre}
  </button>
);

const Home = () => {
  const [songs, setSongs]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeGenre, setActiveGenre] = useState('All');
  const { recentlyPlayed, playSong, songs: queueSongs } = usePlayer();

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

  // Build genre list from songs
  const genres = useMemo(() => {
    const set = new Set(songs.map(s => s.genre).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [songs]);

  // Filtered songs based on genre pill
  const filteredSongs = useMemo(() => {
    if (activeGenre === 'All') return songs;
    return songs.filter(s => s.genre === activeGenre);
  }, [songs, activeGenre]);

  const handleGenreClick = (genre) => {
    setActiveGenre(genre === activeGenre ? 'All' : genre);
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-900 pb-32">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Search */}
        <div className="mb-6">
          <SearchBar />
        </div>

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
          <section className="mb-8">
            <h2 className="text-white text-xl font-bold mb-4">
              🕐 Recently Played
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {recentlyPlayed.map(song => (
                <div
                  key={song.id}
                  onClick={() => playSong(song, recentlyPlayed)}
                  className="flex-shrink-0 w-40 bg-gray-800 rounded-xl p-3
                    cursor-pointer hover:bg-gray-700 transition group">
                  <img
                    src={song.coverUrl || 'https://via.placeholder.com/160'}
                    alt={song.title}
                    className="w-full h-32 object-cover rounded-lg mb-2
                      group-hover:scale-105 transition-transform"
                  />
                  <p className="text-white text-xs font-semibold truncate">
                    {song.title}
                  </p>
                  <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Genre Pills */}
        <div className="mb-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-1 min-w-max">
            {genres.map(genre => (
              <GenrePill
                key={genre}
                genre={genre}
                active={activeGenre === genre}
                onClick={handleGenreClick}
              />
            ))}
          </div>
        </div>

        {/* Song Grid */}
        <h2 className="text-white text-2xl font-bold mb-6">
          {activeGenre === 'All' ? '🎵 All Songs' : `🎵 ${activeGenre}`}
          <span className="text-gray-500 text-base font-normal ml-2">
            ({filteredSongs.length})
          </span>
        </h2>
        <SongList songs={filteredSongs} />
      </div>
    </div>
  );
};

export default Home;