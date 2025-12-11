import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../shared/UI/LoadingSpinner';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-dark via-navy-primary to-navy-light">
        <LoadingSpinner size="lg" color="gold" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'creator') {
      return <Navigate to="/creator" replace />;
    }
    
    // No access at all
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-primary">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gold-primary mb-4">Access Denied</h1>
          <p className="text-white/80 mb-6">You don't have permission to access this page.</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gold-primary text-navy-primary font-semibold rounded-lg hover:bg-gold-dark transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
