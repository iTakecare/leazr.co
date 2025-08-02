import React from 'react';
import { Navigate, useParams, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCompanySlugAccess } from '@/hooks/useCompanySlugAccess';
import { Loader2 } from 'lucide-react';

const ClientPrivateRoute = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { companySlug } = useParams<{ companySlug: string }>();
  const { hasAccess, loading: accessLoading, company } = useCompanySlugAccess(companySlug);

  console.log('🔐 CLIENT PRIVATE ROUTE - Checking access:', {
    companySlug,
    userId: user?.id,
    userRole: user?.role,
    hasAccess,
    company: company?.slug
  });

  // Loading state
  if (authLoading || accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Vérification des accès...</span>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    console.log('🔐 CLIENT PRIVATE ROUTE - No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check role permissions
  if (user.role !== 'client') {
    console.log('🔐 CLIENT PRIVATE ROUTE - Invalid role for client route:', user.role);
    return <Navigate to="/" replace />;
  }

  // Check company access
  if (!hasAccess) {
    console.log('🔐 CLIENT PRIVATE ROUTE - No access to company:', companySlug);
    return <Navigate to="/" replace />;
  }

  console.log('🔐 CLIENT PRIVATE ROUTE - Access granted, rendering outlet');
  return <Outlet />;
};

export default ClientPrivateRoute;