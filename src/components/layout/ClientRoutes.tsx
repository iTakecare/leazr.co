
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
        
        // Clear any cached client ID
        if (retryCount > 0 && user?.id) {
          localStorage.removeItem(`client_id_${user.id}`);
          console.log("Cleared cached client ID for retry");
        }
        
        // Tentative 1: Vérifier par email (plus fiable)
        if (user.email) {
          const { data: clientByEmail, error: emailError } = await supabase
            .from('clients')
            .select('id, name, user_id')
            .eq('email', user.email)
            .maybeSingle();
            
          if (emailError) {
            console.error("Error checking client by email:", emailError);
          }
          
          if (clientByEmail) {
            console.log("Client found by email:", clientByEmail);
            
            // Si le client n'a pas d'user_id, on le met à jour
            if (!clientByEmail.user_id) {
              console.log("Client has no user_id, updating...");
              const { error: updateError } = await supabase
                .from('clients')
                .update({ user_id: user.id })
                .eq('id', clientByEmail.id);
                
              if (!updateError) {
                console.log("Successfully linked user to client:", clientByEmail.id);
                toast.success("Votre compte a été associé au client " + clientByEmail.name);
              } else {
                console.error("Error linking user to client:", updateError);
              }
            }
            
            // Sauvegarder le client_id dans le localStorage
            if (user.id) {
              localStorage.setItem(`client_id_${user.id}`, clientByEmail.id);
            }
            
            setCheckingClient(false);
            return;
          } else {
            console.log("No client found for email:", user.email);
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
            
            // Sauvegarder le client_id dans le localStorage
            localStorage.setItem(`client_id_${user.id}`, clientByUserId.id);
            
            setCheckingClient(false);
            return;
          } else {
            console.log("No client found for user_id:", user.id);
          }
        }
        
        // Recherche spéciale pour mistergi118@gmail.com
        if (user.email === "mistergi118@gmail.com") {
          console.log("Special check for mistergi118@gmail.com");
          
          // Vérifier tous les clients
          const { data: allClients, error: allClientsError } = await supabase
            .from('clients')
            .select('id, name, email, user_id');
            
          if (allClientsError) {
            console.error("Error fetching all clients:", allClientsError);
          } else {
            console.log("All clients:", allClients);
            
            // Chercher un client sans user_id mais avec le même email
            const matchingClient = allClients?.find(c => 
              c.email === user.email && (!c.user_id || c.user_id === null)
            );
            
            if (matchingClient) {
              console.log("Found matching client without user_id:", matchingClient);
              
              // Mettre à jour le client avec l'user_id
              const { error: updateError } = await supabase
                .from('clients')
                .update({ user_id: user.id })
                .eq('id', matchingClient.id);
                
              if (!updateError) {
                console.log("Successfully linked user to client:", matchingClient.id);
                toast.success("Votre compte a été associé au client " + matchingClient.name);
                
                // Sauvegarder le client_id dans le localStorage
                if (user.id) {
                  localStorage.setItem(`client_id_${user.id}`, matchingClient.id);
                }
                
                setCheckingClient(false);
                return;
              } else {
                console.error("Error linking user to client:", updateError);
              }
            } else {
              // Si aucun client n'est trouvé, créer un nouveau client
              console.log("No matching client found, creating a new one for:", user.email);
              
              // Extraire le nom du prénom/nom de l'utilisateur ou de l'email
              const nameFromEmail = user.email.split('@')[0];
              const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || nameFromEmail;
              
              const { data: newClient, error: createError } = await supabase
                .from('clients')
                .insert({
                  name: name,
                  email: user.email,
                  user_id: user.id,
                  status: 'active'
                })
                .select('id, name')
                .single();
                
              if (!createError && newClient) {
                console.log("Created new client:", newClient);
                toast.success("Un nouveau compte client a été créé pour vous");
                
                // Sauvegarder le client_id dans le localStorage
                if (user.id) {
                  localStorage.setItem(`client_id_${user.id}`, newClient.id);
                }
                
                setCheckingClient(false);
                return;
              } else {
                console.error("Error creating new client:", createError);
              }
            }
          }
        }
        
        // Si on arrive ici, aucun client n'a été trouvé
        console.error("No client found for this user");
        setClientError(`Compte client non trouvé. L'utilisateur n'est associé à aucun client dans le système.`);
        
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
