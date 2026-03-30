import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { currentUser, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex 
      items-center justify-between sticky top-0 z-50 shadow-lg">
      <Link to="/home" className="text-green-500 font-bold text-2xl">
        🎵 MeloStream
      </Link>

      <div className="flex items-center gap-6">
        <Link to="/home" 
          className="hover:text-green-400 transition">Home</Link>
        <Link to="/search" 
          className="hover:text-green-400 transition">Search</Link>
        {isAdmin && (
          <Link to="/admin" 
            className="hover:text-green-400 transition">Admin</Link>
        )}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">
            {currentUser?.email}
          </span>
          <button
            onClick={handleLogout}
            className="bg-green-500 hover:bg-green-600 text-white 
              px-4 py-2 rounded-full text-sm transition">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;