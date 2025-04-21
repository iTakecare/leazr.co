
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import HomePage from '@/pages/home/index';

const Index = () => {
  const { user, isAdmin, isClient, isAmbassador, isPartner, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Cette fonction gère la redirection basée sur le rôle de l'utilisateur
    const handleAuthRedirect = () => {
      // Ne rediriger que si l'utilisateur est authentifié et que le chargement est terminé
      if (user && !isLoading) {
        console.log("Index: utilisateur authentifié détecté avec le rôle:", user.role);
        
        if (isAdmin()) {
          console.log("Index: redirection vers le tableau de bord admin");
          navigate('/dashboard');
          return;
        } 
        
        if (isClient()) {
          console.log("Index: redirection vers le tableau de bord client");
          navigate('/client/dashboard');
          return;
        } 
        
        if (isAmbassador()) {
          console.log("Index: redirection vers le tableau de bord ambassadeur");
          navigate('/ambassador/dashboard');
          return;
        } 
        
        if (isPartner()) {
          console.log("Index: redirection vers le tableau de bord partenaire");
          navigate('/partner/dashboard');
          return;
        }

        // Si l'utilisateur est connecté mais n'a pas de rôle spécifique, 
        // on vérifie s'il a un client_id pour lui assigner le rôle de client
        if (user.client_id) {
          console.log("Index: utilisateur avec client_id mais sans rôle, redirection vers tableau de bord client");
          navigate('/client/dashboard');
          return;
        }

        console.log("Index: utilisateur connecté sans rôle reconnu");
      }
    };

    handleAuthRedirect();
  }, [user, isLoading, navigate, isAdmin, isClient, isAmbassador, isPartner]);

  return <HomePage />;
};

export default Index;
