import React, { useEffect } from "react";
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
import PublicCatalog from "@/pages/PublicCatalog";
import ClientEquipmentPage from "@/pages/ClientEquipmentPage";
import ClientSupportPage from "@/pages/ClientSupportPage";
import ClientSettingsPage from "@/pages/ClientSettingsPage";
import { toast } from "sonner";

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
  const [checkingClient, setCheckingClient] = React.useState(true);
  const [clientError, setClientError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  useEffect(() => {
    const hash = window.location.hash || location.hash;
    if (hash && hash.includes('type=recovery')) {
      console.log("Flux de réinitialisation de mot de passe détecté dans ClientCheck, redirection vers login");
      navigate('/login', { replace: true });
      return;
    }
  }, [navigate, location]);

  useEffect(() => {
    const checkClientAssociation = async () => {
      if (!user) return;
      
      const hash = window.location.hash || location.hash;
      if (hash && hash.includes('type=recovery')) {
        return;
      }
      
      try {
        setCheckingClient(true);
        setClientError(null);
        
        console.log("Vérification de l'association client pour l'utilisateur:", user.id, user.email);
        
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
          return;
        }
        
        if (associatedClient) {
          console.log("Client déjà associé trouvé:", associatedClient);
          localStorage.setItem(`client_id_${user.id}`, associatedClient.id);
          setCheckingClient(false);
          return;
        }
        
        if (user.email) {
          const clientId = await linkUserToClient(user.id, user.email);
          if (clientId) {
            console.log("Client associé via linkUserToClient:", clientId);
            setCheckingClient(false);
            return;
          }
        }
        
        setClientError(`Aucun client trouvé pour votre compte utilisateur (${user.email}). Veuillez contacter l'assistance.`);
        console.error("Aucun client associé à l'utilisateur:", user.id, user.email);
      } catch (error) {
        console.error("Erreur lors de la vérification du client:", error);
        setClientError("Erreur lors de la vérification du compte client");
      } finally {
        setCheckingClient(false);
      }
    };
    
    if (user && !isLoading) {
      checkClientAssociation();
    } else {
      setCheckingClient(false);
    }
  }, [user, isLoading, retryCount, location, navigate]);

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
  
  useEffect(() => {
    const hash = location.hash || window.location.hash;
    
    if (hash && hash.includes('type=recovery')) {
      console.log("Flux de réinitialisation de mot de passe détecté dans ClientRoutes, redirection vers login");
      navigate('/login', { replace: true });
      return;
    }
    
    if (!isLoading && userRoleChecked && user) {
      console.log("[ClientRoutes] Vérification d'accès:", {
        isClient: isClient(),
        isAmbassador: isAmbassador(),
        isPartner: isPartner(),
        email: user?.email,
        client_id: user?.client_id
      });
      
      const clientFunction = typeof isClient === 'function' ? isClient : () => false;
      const partnerFunction = typeof isPartner === 'function' ? isPartner : () => false;
      const ambassadorFunction = typeof isAmbassador === 'function' ? isAmbassador : () => false;
      
      if (!clientFunction()) {
        console.log("[ClientRoutes] L'utilisateur n'est pas un client", user);
        
        if (ambassadorFunction()) {
          console.log("[ClientRoutes] L'utilisateur est un ambassadeur, redirection vers le tableau de bord ambassadeur");
          toast.error("Vous tentez d'accéder à un espace client mais vous êtes connecté en tant qu'ambassadeur");
          navigate('/ambassador/dashboard', { replace: true });
          return;
        }
        
        if (partnerFunction()) {
          console.log("[ClientRoutes] L'utilisateur est un partenaire, redirection vers le tableau de bord partenaire");
          toast.error("Vous tentez d'accéder à un espace client mais vous êtes connecté en tant que partenaire");
          navigate('/partner/dashboard', { replace: true });
          return;
        }
        
        console.log("[ClientRoutes] L'utilisateur n'est pas un client, redirection vers le tableau de bord administrateur");
        toast.error("Vous tentez d'accéder à un espace client mais vous n'avez pas ce rôle");
        navigate('/', { replace: true });
        return;
      }
    }
  }, [isLoading, user, isClient, isPartner, isAmbassador, navigate, location, userRoleChecked]);

  if (location.hash && location.hash.includes('type=recovery')) {
    return null;
  }

  if (isLoading) {
    return <ClientLayout><ClientsLoading /></ClientLayout>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const clientFunction = typeof isClient === 'function' ? isClient : () => false;
  if (!clientFunction()) {
    console.log("[ClientRoutes] Utilisateur non client tentant d'accéder à la route client");
    return <Navigate to="/" replace />;
  }

  return (
    <ClientCheck>
      <Routes>
        <Route path="dashboard" element={<ClientLayout><ClientDashboard /></ClientLayout>} />
        <Route path="contracts" element={<ClientLayout><ClientContractsPage /></ClientLayout>} />
        <Route path="equipment" element={<ClientLayout><ClientEquipmentPage /></ClientLayout>} />
        <Route path="requests" element={<ClientLayout><ClientRequestsPage /></ClientLayout>} />
        <Route path="catalog" element={<ClientLayout><PublicCatalog /></ClientLayout>} />
        <Route path="support" element={<ClientLayout><ClientSupportPage /></ClientLayout>} />
        <Route path="itakecare" element={<ClientLayout><ClientITakecarePage /></ClientLayout>} />
        <Route path="settings" element={<ClientLayout><ClientSettingsPage /></ClientLayout>} />
        <Route path="*" element={<Navigate to="/client/dashboard" replace />} />
      </Routes>
    </ClientCheck>
  );
};

export default ClientRoutes;
