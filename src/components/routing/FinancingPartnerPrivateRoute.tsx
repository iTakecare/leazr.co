import React from 'react';
import { Navigate, Outlet } from "react-router";
import { useAuth } from '@/context/AuthContext';
import { useFinancingPartnerAccess } from '@/hooks/useFinancingPartnerAccess';
import { FinancingPartnerProvider } from '@/components/layout/FinancingPartnerLayout';

const FinancingPartnerPrivateRoute: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { partner, financeur, hasAccess, loading: accessLoading } = useFinancingPartnerAccess();

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

  if (!hasAccess || !partner || !financeur) {
    return <Navigate to="/" replace />;
  }

  return (
    <FinancingPartnerProvider partner={partner} financeur={financeur}>
      <Outlet />
    </FinancingPartnerProvider>
  );
};

export default FinancingPartnerPrivateRoute;
