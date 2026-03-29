import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center 
      justify-center text-center">
      <div>
        <p className="text-8xl mb-4">🎵</p>
        <h1 className="text-white text-4xl font-bold mb-4">404</h1>
        <p className="text-gray-400 mb-8">Page not found</p>
        <Link to="/home"
          className="bg-green-500 hover:bg-green-600 text-black 
            font-bold px-6 py-3 rounded-full transition">
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;