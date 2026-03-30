import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { currentUser, isAdmin, logout, likedSongs } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex
      items-center justify-between sticky top-0 z-50 shadow-lg
      border-b border-gray-800">
      <Link to="/home" className="text-green-500 font-bold text-2xl">
        🎵 MeloStream
      </Link>

      <div className="flex items-center gap-5">
        <Link to="/home"
          className="hover:text-green-400 transition text-sm">
          Home
        </Link>
        <Link to="/search"
          className="hover:text-green-400 transition text-sm">
          Search
        </Link>
        <Link to="/liked"
          className="hover:text-green-400 transition text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
          <span>Liked</span>
          {likedSongs?.length > 0 && (
            <span className="bg-green-500 text-black text-xs rounded-full
              px-1.5 py-0.5 leading-none font-bold">
              {likedSongs.length}
            </span>
          )}
        </Link>
        {isAdmin && (
          <Link to="/admin"
            className="hover:text-green-400 transition text-sm">
            Admin
          </Link>
        )}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs hidden sm:block">
            {currentUser?.email}
          </span>
          <button
            onClick={handleLogout}
            className="bg-green-500 hover:bg-green-600 text-white
              px-4 py-2 rounded-full text-sm transition font-medium">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;