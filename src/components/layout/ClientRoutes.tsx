
import React, { useEffect, useState, useMemo } from "react";
import { Route, Routes, Navigate, useNavigate, useLocation } from "react-router-dom";
import ClientDashboard from "@/pages/ClientDashboard";
import ClientContractsPage from "@/pages/ClientContractsPage";
import ClientRequestsPage from "@/pages/ClientRequestsPage";
import ClientITakecarePage from "@/pages/ClientITakecarePage";
import { useAuth } from "@/context/AuthContext";
import ClientSidebar from "./ClientSidebar";
import ClientsLoading from "@/components/clients/ClientsLoading";
import ClientsError from "@/components/clients/ClientsError";
import { linkUserToClient } from "@/utils/clientUserAssociation";
import { supabase } from "@/integrations/supabase/client";

const ClientEquipment = () => <div className="w-full"><h1 className="text-3xl font-bold mb-6">Mes Équipements</h1><p>Gestion des équipements en cours d'implémentation.</p></div>;
const ClientCatalog = () => <div className="w-full"><h1 className="text-3xl font-bold mb-6">Catalogue</h1><p>Catalogue en cours d'implémentation.</p></div>;

export const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <ClientSidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
};

const ClientCheck = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, isClient, userRoleChecked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingClient, setCheckingClient] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Vérifier s'il s'agit d'un flux de réinitialisation de mot de passe
  const isPasswordReset = useMemo(() => {
    const hash = window.location.hash || location.hash;
    return hash && hash.includes('type=recovery');
  }, [location.hash]);

  useEffect(() => {
    if (isPasswordReset) {
      console.log("Flux de réinitialisation de mot de passe détecté dans ClientCheck, redirection vers login");
      navigate('/login', { replace: true });
      return;
    }
  }, [isPasswordReset, navigate]);

  useEffect(() => {
    const checkClientAssociation = async () => {
      if (!user) return;
      
      if (isPasswordReset) return;
      
      try {
        console.time('checkClientAssociation');
        setCheckingClient(true);
        setClientError(null);
        
        console.log("Vérification de l'association client pour l'utilisateur:", user.id, user.email);
        
        // Optimisation: Vérifier d'abord si l'utilisateur a déjà un client_id dans le contexte d'authentification
        if (user.client_id) {
          console.log("L'utilisateur a déjà un client_id associé:", user.client_id);
          setCheckingClient(false);
          console.timeEnd('checkClientAssociation');
          return;
        }
        
        // Vérifier le cache local si premier essai
        if (retryCount === 0 && user.id) {
          const cachedClientId = localStorage.getItem(`client_id_${user.id}`);
          if (cachedClientId) {
            console.log("Client ID trouvé dans le cache:", cachedClientId);
            setCheckingClient(false);
            console.timeEnd('checkClientAssociation');
            return;
          }
        }
        
        if (retryCount > 0 && user?.id) {
          localStorage.removeItem(`client_id_${user.id}`);
          console.log("Cache client ID effacé pour la nouvelle tentative");
        }
        
        const { data: associatedClient, error: clientError } = await supabase
          .from('clients')
          .select('id, name, email, user_id, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        
        if (clientError) {
          console.error("Erreur lors de la vérification des clients existants:", clientError);
          setClientError("Erreur lors de la vérification des clients");
          setCheckingClient(false);
          console.timeEnd('checkClientAssociation');
          return;
        }
        
        if (associatedClient) {
          console.log("Client déjà associé trouvé:", associatedClient);
          localStorage.setItem(`client_id_${user.id}`, associatedClient.id);
          setCheckingClient(false);
          console.timeEnd('checkClientAssociation');
          return;
        }
        
        if (user.email) {
          const clientId = await linkUserToClient(user.id, user.email);
          if (clientId) {
            console.log("Client associé via linkUserToClient:", clientId);
            setCheckingClient(false);
            console.timeEnd('checkClientAssociation');
            return;
          }
        }
        
        setClientError(`Aucun client trouvé pour votre compte utilisateur (${user.email}). Veuillez contacter l'assistance.`);
        console.error("Aucun client associé à l'utilisateur:", user.id, user.email);
        console.timeEnd('checkClientAssociation');
      } catch (error) {
        console.error("Erreur lors de la vérification du client:", error);
        setClientError("Erreur lors de la vérification du compte client");
        console.timeEnd('checkClientAssociation');
      } finally {
        setCheckingClient(false);
      }
    };
    
    if (user && !isLoading) {
      console.log("Démarrage de la vérification du client pour:", user.email);
      checkClientAssociation();
    } else {
      setCheckingClient(false);
    }
  }, [user, isLoading, retryCount, isPasswordReset, navigate]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (isLoading || checkingClient) {
    return <ClientLayout><ClientsLoading /></ClientLayout>;
  }

  if (clientError) {
    return (
      <ClientLayout>
        <ClientsError 
          errorMessage={clientError} 
          onRetry={handleRetry}
          email={user?.email}
          userId={user?.id}
        />
      </ClientLayout>
    );
  }

  return <>{children}</>;
};

const ClientRoutes = () => {
  const { user, isLoading, isClient, isPartner, isAmbassador, userRoleChecked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Vérifier s'il s'agit d'un flux de réinitialisation de mot de passe
  const isPasswordReset = useMemo(() => {
    const hash = location.hash || window.location.hash;
    return hash && hash.includes('type=recovery');
  }, [location.hash]);
  
  useEffect(() => {
    if (isPasswordReset) {
      console.log("Flux de réinitialisation de mot de passe détecté dans ClientRoutes, redirection vers login");
      navigate('/login', { replace: true });
      return;
    }
    
    // Ne déclencher les redirections que lorsque nous avons vérifié le rôle et qu'un utilisateur existe
    if (!isLoading && userRoleChecked && user) {
      // Utiliser une fonction pour déterminer le type d'utilisateur et la redirection appropriée
      const redirectUserBasedOnRole = () => {
        console.time('redirectUserBasedOnRole');
        if (isPartner()) {
          console.log("L'utilisateur est un partenaire, redirection vers le tableau de bord partenaire");
          navigate('/partner/dashboard', { replace: true });
          return true;
        }
        
        if (isAmbassador()) {
          console.log("L'utilisateur est un ambassadeur, redirection vers le tableau de bord ambassadeur");
          navigate('/ambassador/dashboard', { replace: true });
          return true;
        }
        
        if (!isClient()) {
          console.log("L'utilisateur n'est pas un client, redirection vers le tableau de bord administrateur");
          navigate('/dashboard', { replace: true });
          return true;
        }
        
        console.timeEnd('redirectUserBasedOnRole');
        return false;
      };
      
      // Effectuer la redirection une seule fois
      redirectUserBasedOnRole();
    }
  }, [isLoading, user, isClient, isPartner, isAmbassador, navigate, location, userRoleChecked, isPasswordReset]);

  if (isPasswordReset) {
    return null;
  }

  if (isLoading) {
    return <ClientLayout><ClientsLoading /></ClientLayout>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ClientCheck>
      <Routes>
        <Route path="dashboard" element={<ClientLayout><ClientDashboard /></ClientLayout>} />
        <Route path="contracts" element={<ClientLayout><ClientContractsPage /></ClientLayout>} />
        <Route path="equipment" element={<ClientLayout><ClientEquipment /></ClientLayout>} />
        <Route path="requests" element={<ClientLayout><ClientRequestsPage /></ClientLayout>} />
        <Route path="catalog" element={<ClientLayout><ClientCatalog /></ClientLayout>} />
        <Route path="calculator" element={<Navigate to="/client/dashboard" replace />} />
        <Route path="itakecare" element={<ClientLayout><ClientITakecarePage /></ClientLayout>} />
        <Route path="*" element={<Navigate to="/client/dashboard" replace />} />
      </Routes>
    </ClientCheck>
  );
};

export default ClientRoutes;
