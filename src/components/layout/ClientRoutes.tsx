
import React, { useEffect } from "react";
import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import ClientDashboard from "@/pages/ClientDashboard";
import ClientContractsPage from "@/pages/ClientContractsPage";
import ClientRequestsPage from "@/pages/ClientRequestsPage";
import { useAuth } from "@/context/AuthContext";
import ClientSidebar from "./ClientSidebar";
import ClientsLoading from "@/components/clients/ClientsLoading";
import ClientsError from "@/components/clients/ClientsError";
import { linkUserToClient } from "@/utils/clientUserAssociation";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ClientEquipment = () => <div className="w-full"><h1 className="text-3xl font-bold mb-6">Mes Équipements</h1><p>Gestion des équipements en cours d'implémentation.</p></div>;
const ClientCatalog = () => <div className="w-full"><h1 className="text-3xl font-bold mb-6">Catalogue</h1><p>Catalogue en cours d'implémentation.</p></div>;
const ClientNewRequest = () => <div className="w-full"><h1 className="text-3xl font-bold mb-6">Nouvelle Demande</h1><p>Formulaire de création de demande en cours d'implémentation.</p></div>;

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
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [checkingClient, setCheckingClient] = React.useState(true);
  const [clientError, setClientError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  useEffect(() => {
    const checkClientAssociation = async () => {
      if (!user) return;
      
      try {
        setCheckingClient(true);
        setClientError(null);
        
        // Récupérer l'email directement depuis l'API Auth de Supabase
        const { data: userData, error: userError } = await supabase.auth.getUser();
        const userEmail = userData?.user?.email || user.email;
        
        console.log("Checking client association for user:", user.id, userEmail);
        
        if (retryCount > 0 && user?.id) {
          localStorage.removeItem(`client_id_${user.id}`);
          console.log("Cleared cached client ID for retry");
        }
        
        if (userEmail) {
          const clientId = await linkUserToClient(user.id, userEmail);
          
          if (clientId) {
            console.log("Client association successful, client ID:", clientId);
            setCheckingClient(false);
            return;
          } else {
            console.error("No client found for this user");
            setClientError(`Erreur lors de la vérification du compte client. Veuillez réessayer ou contacter l'assistance.`);
          }
        } else {
          // Vérifier si l'utilisateur est connecté mais sans email
          const { data: authUser } = await supabase.auth.getUser();
          if (authUser?.user?.email) {
            console.log("Found email in auth user:", authUser.user.email);
            const clientId = await linkUserToClient(user.id, authUser.user.email);
            
            if (clientId) {
              console.log("Client association successful via auth API, client ID:", clientId);
              setCheckingClient(false);
              return;
            }
          }
          
          setClientError("L'utilisateur n'a pas d'email associé. Veuillez contacter votre administrateur.");
        }
      } catch (error) {
        console.error("Error in client verification:", error);
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
  }, [user, isLoading, retryCount]);

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
  const { user, isLoading, isClient } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoading && user && !isClient()) {
      navigate('/dashboard');
    }
  }, [isLoading, user, isClient, navigate]);

  if (isLoading) {
    return <ClientLayout><ClientsLoading /></ClientLayout>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <ClientCheck>
      <Routes>
        <Route path="dashboard" element={<ClientLayout><ClientDashboard /></ClientLayout>} />
        <Route path="contracts" element={<ClientLayout><ClientContractsPage /></ClientLayout>} />
        <Route path="equipment" element={<ClientLayout><ClientEquipment /></ClientLayout>} />
        <Route path="requests" element={<ClientLayout><ClientRequestsPage /></ClientLayout>} />
        <Route path="catalog" element={<ClientLayout><ClientCatalog /></ClientLayout>} />
        <Route path="new-request" element={<ClientLayout><ClientNewRequest /></ClientLayout>} />
        <Route path="*" element={<Navigate to="/client/dashboard" />} />
      </Routes>
    </ClientCheck>
  );
};

export default ClientRoutes;
