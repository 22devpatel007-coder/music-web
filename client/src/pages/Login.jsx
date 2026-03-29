import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const adminEmail = process.env.REACT_APP_ADMIN_EMAIL;
      if (result.user.email === adminEmail) {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError('Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-md shadow-xl">
        <h1 className="text-green-500 text-3xl font-bold text-center mb-2">
          🎵 MeloStream
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Login to continue
        </p>

        {error && (
          <div className="bg-red-500 bg-opacity-20 text-red-400 
            px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-gray-700 text-white px-4 py-3 
              rounded-lg outline-none focus:ring-2 focus:ring-green-500
              placeholder-gray-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-gray-700 text-white px-4 py-3 
              rounded-lg outline-none focus:ring-2 focus:ring-green-500
              placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 
              text-black font-bold py-3 rounded-lg transition
              disabled:opacity-50">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-6 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-green-400 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;