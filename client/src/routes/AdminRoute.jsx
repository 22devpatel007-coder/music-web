import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader } from '../components/ui/Loader';

const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user || !isAdmin) return <Navigate to='/' replace />;
  return children;
};

export default AdminRoute;
