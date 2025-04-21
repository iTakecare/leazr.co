
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
        } else if (isClient()) {
          console.log("Index: redirection vers le tableau de bord client");
          navigate('/client/dashboard');
        } else if (isAmbassador()) {
          console.log("Index: redirection vers le tableau de bord ambassadeur");
          navigate('/ambassador/dashboard');
        } else if (isPartner()) {
          console.log("Index: redirection vers le tableau de bord partenaire");
          navigate('/partner/dashboard');
        }
      }
    };

    handleAuthRedirect();
  }, [user, isLoading, navigate, isAdmin, isClient, isAmbassador, isPartner]);

  return <HomePage />;
};

export default Index;
