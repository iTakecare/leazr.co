import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useBrokerSlugAccess } from '@/hooks/useBrokerSlugAccess';

const BrokerPrivateRoute: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { hasAccess, loading: accessLoading } = useBrokerSlugAccess();

  if (authLoading || accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default BrokerPrivateRoute;
