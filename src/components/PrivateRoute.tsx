
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

  // Afficher le loader pendant le chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si pas d'utilisateur connecté, rediriger vers login avec l'URL de retour
  if (!user) {
    console.log("Utilisateur non connecté, redirection vers login depuis:", location.pathname);
    return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Si un rôle spécifique est requis, vérifier
  if (requiredRole) {
    const userRole = user.role || 'admin';
    
    if (userRole !== requiredRole) {
      console.log(`Utilisateur avec rôle ${userRole} tente d'accéder à une route nécessitant ${requiredRole}`);
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
