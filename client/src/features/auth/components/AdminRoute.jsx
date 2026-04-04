/**
 * AdminRoute.jsx — Production Ready
 *
 * ROOT CAUSE OF THE BUG:
 * Previous AdminRoute read `user` from useAuth(), but AuthContext exposes
 * `currentUser`. So `user` was always undefined → treated as falsy →
 * redirected to /login → React Router navigated away from the intended
 * route (e.g. /admin/upload-playlist) → AdminDashboard rendered instead.
 *
 * FIXES APPLIED:
 * 1. Destructure `currentUser` (not `user`) — matches AuthContext exactly.
 * 2. Guard on `loading` — AuthContext already shows <LoadingScreen /> while
 *    loading=true, but this is a defensive belt-and-suspenders guard.
 * 3. Preserve intended destination via `state={{ from: location }}` so Login
 *    can redirect back after successful sign-in.
 */

import { useAuth } from 'features/auth/context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import Loader from 'shared/components/Loader';

const AdminRoute = ({ children }) => {
  const { currentUser, isAdmin, loading } = useAuth();
  const location = useLocation();

  // Belt-and-suspenders: AuthContext already blocks render during loading,
  // but guard here in case this component is ever used outside AuthProvider.
  if (loading) {
    return <Loader />;
  }

  // Not logged in → preserve destination for post-login redirect
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but not admin → redirect to home
  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default AdminRoute;