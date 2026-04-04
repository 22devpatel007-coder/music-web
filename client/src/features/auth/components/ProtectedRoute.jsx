/**
 * ProtectedRoute.jsx — Production Ready
 *
 * Same fix as AdminRoute: uses `currentUser` not `user`.
 */

import { useAuth } from 'features/auth/context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import Loader from 'shared/components/Loader';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader />;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;