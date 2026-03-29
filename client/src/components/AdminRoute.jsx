import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { currentUser, isAdmin } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/home" />;
  return children;
};

export default AdminRoute;