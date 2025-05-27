
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

  console.log("PrivateRoute - isLoading:", isLoading, "user:", !!user, "path:", location.pathname);

  // Afficher le loader pendant le chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de votre session...</p>
        </div>
      </div>
    );
  }

  // Si pas d'utilisateur connecté, rediriger vers login avec l'URL de retour
  if (!user) {
    console.log("Utilisateur non connecté, redirection vers login depuis:", location.pathname);
    // Éviter les redirections en boucle vers /home
    const returnUrl = location.pathname === '/home' ? '/dashboard' : location.pathname;
    return <Navigate to={`/login?from=${encodeURIComponent(returnUrl)}`} replace />;
  }

  // Si un rôle spécifique est requis, vérifier
  if (requiredRole) {
    const userRole = user.role || 'admin';
    
    if (userRole !== requiredRole) {
      console.log(`Utilisateur avec rôle ${userRole} tente d'accéder à une route nécessitant ${requiredRole}`);
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
