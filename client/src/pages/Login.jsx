import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

// ── Map Firebase error codes → human-readable messages ──────────────────────
const FIREBASE_ERRORS = {
  'auth/invalid-email':            'The email address is badly formatted.',
  'auth/user-disabled':            'This account has been disabled. Contact support.',
  'auth/user-not-found':           'No account found with this email.',
  'auth/wrong-password':           'Incorrect password. Please try again.',
  'auth/invalid-credential':       'Email or password is incorrect.',   // Firebase v9 unified error
  'auth/too-many-requests':        'Too many failed attempts. Try again later or reset your password.',
  'auth/network-request-failed':   'Network error. Check your internet connection.',
  'auth/internal-error':           'An internal error occurred. Please try again.',
};

const friendlyError = (code) =>
  FIREBASE_ERRORS[code] ?? `Login failed (${code}). Please try again.`;

// ─────────────────────────────────────────────────────────────────────────────

const Login = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { signInWithGoogle, isAdmin } = useAuth();
  const navigate = useNavigate();

  // After successful login decide where to send the user
  const redirectAfterLogin = (user) => {
    const adminEmail = process.env.REACT_APP_ADMIN_EMAIL;
    if (adminEmail && user.email === adminEmail) {
      navigate('/admin');
    } else {
      navigate('/home');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      redirectAfterLogin(result.user);
    } catch (err) {
      // Show the REAL error, not a generic lie
      console.error('Login error:', err.code, err.message);
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      redirectAfterLogin(result.user);
    } catch (err) {
      console.error('Google error:', err.code, err.message);
      const googleErrors = {
        'auth/unauthorized-domain':   'This domain is not authorised. Add it in Firebase Console → Authentication → Settings → Authorised domains.',
        'auth/popup-blocked':         'Popup was blocked. Please allow popups for this site.',
        'auth/popup-closed-by-user':  'Sign-in cancelled. Please try again.',
        'auth/cancelled-popup-request': 'Only one sign-in popup can be open at a time.',
      };
      setError(googleErrors[err.code] ?? friendlyError(err.code));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-md shadow-xl">
        <h1 className="text-green-500 text-3xl font-bold text-center mb-2">
          🎵 MeloStream
        </h1>
        <p className="text-gray-400 text-center mb-8">Login to continue</p>

        {/* ── Error Banner ─────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500
            border-opacity-30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm
            flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Email / Password Form ─────────────────────────────────────── */}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-gray-700 text-white px-4 py-3
              rounded-lg outline-none focus:ring-2 focus:ring-green-500
              placeholder-gray-500"
          />

          {/* Password with show/hide toggle */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-gray-700 text-white px-4 py-3 pr-12
                rounded-lg outline-none focus:ring-2 focus:ring-green-500
                placeholder-gray-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2
                text-gray-400 hover:text-white text-sm select-none">
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600
              text-black font-bold py-3 rounded-lg transition
              disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-600" />
          <span className="text-gray-400 text-sm">OR</span>
          <div className="flex-1 h-px bg-gray-600" />
        </div>

        {/* ── Google Button ─────────────────────────────────────────────── */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full bg-white hover:bg-gray-100 text-gray-800
            font-semibold py-3 px-4 rounded-lg transition
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-3 border border-gray-200">
          {googleLoading ? (
            <span className="text-gray-600">Signing in…</span>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"
                width="20" height="20" style={{ minWidth: 20 }}>
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
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