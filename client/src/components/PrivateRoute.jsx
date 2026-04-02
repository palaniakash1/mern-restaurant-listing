import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute() {
  const { user, isAuthenticated, isInitialized, isLoading } = useAuth();

  if (!isInitialized || isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return user && isAuthenticated ? <Outlet /> : <Navigate to="/sign-in" replace />;
}
