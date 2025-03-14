
import React, { useEffect } from "react";
import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import ClientDashboard from "@/pages/ClientDashboard";
import ClientContractsPage from "@/pages/ClientContractsPage";
import ClientRequestsPage from "@/pages/ClientRequestsPage";
import { useAuth } from "@/context/AuthContext";
import ClientSidebar from "./ClientSidebar";
import ClientsLoading from "@/components/clients/ClientsLoading";
import ClientsError from "@/components/clients/ClientsError";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Placeholder components for client routes
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

// Component pour vérifier si l'utilisateur est associé à un client
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
        
        console.log("Checking client association for user:", user.id, user.email);
        
        // Tentative 1: Vérifier par email (plus fiable)
        if (user.email) {
          const { data: clientByEmail, error: emailError } = await supabase
            .from('clients')
            .select('id, name')
            .eq('email', user.email)
            .maybeSingle();
            
          if (emailError) {
            console.error("Error checking client by email:", emailError);
          }
          
          if (clientByEmail) {
            console.log("Client found by email:", clientByEmail);
            setCheckingClient(false);
            return;
          }
        }
        
        // Tentative 2: Vérifier par user_id
        if (user.id) {
          const { data: clientByUserId, error: userIdError } = await supabase
            .from('clients')
            .select('id, name')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (userIdError) {
            console.error("Error checking client by user_id:", userIdError);
          }
          
          if (clientByUserId) {
            console.log("Client found by user_id:", clientByUserId);
            setCheckingClient(false);
            return;
          }
        }
        
        // Si on arrive ici, aucun client n'a été trouvé
        console.error("No client found for this user");
        setClientError("Compte client non trouvé. L'utilisateur n'est associé à aucun client dans le système.");
        
        // Si c'est un compte client mais qu'aucun client n'est associé, on essaie de mettre à jour
        if (user.role === 'client' && user.email) {
          // Essayer de trouver un client avec le même email mais sans user_id
          const { data: unlinkedClients } = await supabase
            .from('clients')
            .select('id, name')
            .eq('email', user.email)
            .is('user_id', null);
            
          if (unlinkedClients && unlinkedClients.length > 0) {
            console.log("Found unlinked client with same email:", unlinkedClients[0]);
            
            // Mettre à jour le client avec le user_id
            const { error: updateError } = await supabase
              .from('clients')
              .update({ user_id: user.id })
              .eq('id', unlinkedClients[0].id);
              
            if (!updateError) {
              console.log("Successfully linked user to client!");
              toast.success("Votre compte a été associé à un client existant");
              setClientError(null);
              setCheckingClient(false);
              return;
            } else {
              console.error("Failed to link user to client:", updateError);
            }
          }
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
    // Si l'utilisateur n'est pas en cours de chargement et n'est pas un client, rediriger
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
