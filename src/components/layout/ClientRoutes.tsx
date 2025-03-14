
import React, { useEffect } from "react";
import { Route, Routes, Navigate, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [checkingClient, setCheckingClient] = React.useState(true);
  const [clientError, setClientError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  // Vérifier d'abord le flux de réinitialisation de mot de passe - priorité absolue
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
      
      // Vérifier à nouveau le hash pour ne pas exécuter cette logique en cas de réinitialisation
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
        
        // Première étape: Vérifier si le client existe déjà dans la base de données
        const { data: existingClients, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, email, user_id, status')
          .or(`email.ilike.${user.email},user_id.eq.${user.id}`);
        
        if (clientsError) {
          console.error("Erreur lors de la vérification des clients existants:", clientsError);
          setClientError("Erreur lors de la vérification des clients");
          setCheckingClient(false);
          return;
        }
        
        console.log("Clients existants trouvés:", existingClients);
        
        // Si des clients sont trouvés, choisir le plus pertinent
        if (existingClients && existingClients.length > 0) {
          // Priorité 1: Client avec le même user_id
          const clientWithUserId = existingClients.find(client => 
            client.user_id === user.id && client.status === 'active'
          );
          
          // Priorité 2: Client actif avec le même email (insensible à la casse)
          const clientWithEmail = existingClients.find(client => 
            client.email && client.email.toLowerCase() === user.email.toLowerCase() && 
            client.status === 'active' && !client.user_id
          );
          
          // Priorité 3: Premier client actif trouvé
          const activeClient = existingClients.find(client => client.status === 'active');
          
          const selectedClient = clientWithUserId || clientWithEmail || activeClient || existingClients[0];
          
          if (selectedClient) {
            console.log("Client sélectionné:", selectedClient);
            
            // Si le client n'a pas encore d'user_id, l'associer
            if (selectedClient.user_id !== user.id) {
              console.log("Association du client avec l'utilisateur");
              const { error: updateError } = await supabase
                .from('clients')
                .update({ 
                  user_id: user.id,
                  has_user_account: true,
                  user_account_created_at: new Date().toISOString(),
                  status: 'active'
                })
                .eq('id', selectedClient.id);
                
              if (updateError) {
                console.error("Erreur lors de l'association:", updateError);
              }
            }
            
            // Stocker l'ID client en cache
            localStorage.setItem(`client_id_${user.id}`, selectedClient.id);
            setCheckingClient(false);
            return;
          }
        }
        
        // Pas de client trouvé, essayer d'en créer un automatiquement à partir du profil utilisateur
        if (user.email) {
          console.log("Tentative de création automatique d'un client");
          
          const { data: newClient, error: createError } = await supabase
            .from('clients')
            .insert({
              name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
              email: user.email,
              company: user.company || null,
              user_id: user.id,
              has_user_account: true,
              user_account_created_at: new Date().toISOString(),
              status: 'active'
            })
            .select()
            .single();
            
          if (createError) {
            console.error("Erreur lors de la création du client:", createError);
            setClientError("Impossible de créer un client automatiquement");
          } else if (newClient) {
            console.log("Client créé automatiquement:", newClient);
            localStorage.setItem(`client_id_${user.id}`, newClient.id);
            setCheckingClient(false);
            return;
          }
        }
        
        // En dernier recours, essayer d'utiliser linkUserToClient
        if (user.email) {
          const clientId = await linkUserToClient(user.id, user.email);
          if (clientId) {
            console.log("Client associé via linkUserToClient:", clientId);
            setCheckingClient(false);
            return;
          }
        }
        
        // Si on arrive ici, c'est qu'on n'a pas pu trouver ou créer de client
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
  const { user, isLoading, isClient } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Vérifier d'abord le flux de réinitialisation de mot de passe - priorité absolue
  useEffect(() => {
    const hash = location.hash || window.location.hash;
    
    if (hash && hash.includes('type=recovery')) {
      console.log("Flux de réinitialisation de mot de passe détecté dans ClientRoutes, redirection vers login");
      navigate('/login', { replace: true });
      return;
    }
    
    // Rediriger uniquement les utilisateurs authentifiés qui ne sont pas des clients vers le tableau de bord
    if (!isLoading && user && !isClient()) {
      console.log("L'utilisateur n'est pas un client, redirection vers le tableau de bord administrateur");
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, user, isClient, navigate, location]);

  // Ne rien afficher pendant un flux de réinitialisation de mot de passe
  if (location.hash && location.hash.includes('type=recovery')) {
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
        <Route path="new-request" element={<ClientLayout><ClientNewRequest /></ClientLayout>} />
        <Route path="*" element={<Navigate to="/client/dashboard" replace />} />
      </Routes>
    </ClientCheck>
  );
};

export default ClientRoutes;
