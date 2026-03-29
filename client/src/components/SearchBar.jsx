import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length >= 2) {
      navigate(`/search?q=${value}`);
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <span className="absolute left-4 top-3 text-gray-400">🔍</span>
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search songs or artists..."
        className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 
          rounded-full outline-none focus:ring-2 focus:ring-green-500
          placeholder-gray-500"
      />
    </div>
  );
};

export default SearchBar;