import React from 'react';
import { Navigate, Outlet } from "react-router";
import { useAuth } from '@/context/AuthContext';
import { useFinanceurSlugAccess } from '@/hooks/useFinanceurSlugAccess';

const FinanceurPrivateRoute: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { hasAccess, loading: accessLoading } = useFinanceurSlugAccess();

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

  // Les partenaires apporteurs et clients partagent le company_id du financeur
  // mais n'ont pas accès au portail équipe.
  if (!hasAccess || user.role === 'partner' || user.role === 'client') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default FinanceurPrivateRoute;
