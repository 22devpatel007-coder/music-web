import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import Navbar from '../components/Navbar';
import SongList from '../components/SongList';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) return;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/api/search?q=${query}`);
        setSongs(res.data);
      } catch (err) {
        console.error('Search failed:', err);
      }
      setLoading(false);
    };
    fetchResults();
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-900 pb-32">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <SearchBar />
        </div>
        <h2 className="text-white text-2xl font-bold mb-6">
          🔍 Results for "{query}"
        </h2>
        {loading ? <Loader /> : <SongList songs={songs} />}
      </div>
    </div>
  );
};

export default Search;