
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRole }) => {
  const { user, isLoading, userRoleChecked } = useAuth();

  console.log("PrivateRoute - État actuel:", { 
    isLoading, 
    userRoleChecked, 
    hasUser: !!user, 
    userRole: user?.role,
    requiredRole 
  });

  // Si on est encore en train de charger, afficher le loader
  if (isLoading) {
    console.log("PrivateRoute - Chargement en cours");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si les rôles ne sont pas encore vérifiés, afficher le loader
  if (!userRoleChecked) {
    console.log("PrivateRoute - Vérification des rôles en cours");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si pas d'utilisateur connecté, rediriger vers login
  if (!user) {
    console.log("PrivateRoute - Pas d'utilisateur, redirection vers /login");
    return <Navigate to="/login" replace />;
  }

  // Si un rôle spécifique est requis, vérifier
  if (requiredRole) {
    const userRole = user.role || 'admin'; // Par défaut admin si pas de rôle
    
    console.log("PrivateRoute - Vérification du rôle:", { userRole, requiredRole });
    
    if (userRole !== requiredRole) {
      console.log("PrivateRoute - Rôle non autorisé, redirection vers /");
      return <Navigate to="/" replace />;
    }
  }

  console.log("PrivateRoute - Accès autorisé");
  return <>{children}</>;
};
