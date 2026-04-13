import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './PageLoader';

export default function PrivateRoute() {
  const { user, isAuthenticated, isInitialized, isLoading } = useAuth();

  if (!isInitialized || isLoading) {
    return <PageLoader message="Authenticating..." />;
  }

  return user && isAuthenticated ? <Outlet /> : <Navigate to="/sign-in" replace />;
}
