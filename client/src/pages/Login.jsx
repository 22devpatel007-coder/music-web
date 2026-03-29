import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
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

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      const adminEmail = process.env.REACT_APP_ADMIN_EMAIL;
      if (result.user.email === adminEmail) {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (err) {
      console.error('Google error code:', err.code);
      console.error('Google error message:', err.message);
      if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized. Add it in Firebase Console.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked. Please allow popups for this site.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else {
        setError(`Google sign-in failed: ${err.code}`);
      }
    }
    setGoogleLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
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

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-600"></div>
          <span className="text-gray-400 text-sm">OR</span>
          <div className="flex-1 h-px bg-gray-600"></div>
        </div>

        {/* Google Button - Fixed Styling */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full bg-white hover:bg-gray-100 text-gray-800
            font-semibold py-3 px-4 rounded-lg transition
            disabled:opacity-50 flex items-center justify-center gap-3
            border border-gray-200">
          {googleLoading ? (
            <span className="text-gray-600">Signing in...</span>
          ) : (
            <>
              {/* Fixed Google SVG Icon - small size */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                width="20px"
                height="20px"
                style={{ minWidth: '20px' }}>
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

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