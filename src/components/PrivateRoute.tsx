
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRole }) => {
  const { user, isLoading } = useAuth();

  // Afficher le loader pendant le chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si pas d'utilisateur connecté, rediriger vers login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si un rôle spécifique est requis, vérifier
  if (requiredRole) {
    const userRole = user.role || 'admin';
    
    if (userRole !== requiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
