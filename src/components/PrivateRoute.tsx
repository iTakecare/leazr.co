
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRole }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  console.log('PrivateRoute check:', { user: !!user, isLoading, requiredRole, pathname: location.pathname });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    console.log('No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Role checking logic
  if (requiredRole) {
    const hasRequiredRole = user.role === requiredRole || user.role === 'admin';
    
    if (!hasRequiredRole) {
      console.log('User does not have required role:', { userRole: user.role, requiredRole });
      
      // Redirect based on user role
      if (user.role === 'client') {
        return <Navigate to="/client/dashboard" replace />;
      } else if (user.role === 'partner') {
        return <Navigate to="/partner/dashboard" replace />;
      } else if (user.role === 'ambassador') {
        return <Navigate to="/ambassador/dashboard" replace />;
      } else {
        return <Navigate to="/login" replace />;
      }
    }
  }

  return <>{children}</>;
};
