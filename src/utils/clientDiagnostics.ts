
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Vérifie et corrige l'association entre un utilisateur et un client
 * Cette fonction est utilisée dans le diagnostic pour identifier les problèmes d'association
 */
export const verifyClientUserAssociation = async (userId: string, userEmail: string | null) => {
  try {
    console.log(`Vérification des associations pour l'utilisateur ${userId} (${userEmail})`);
    
    // Résultats du diagnostic
    const results = {
      userEmail,
      userId,
      clientsFound: [] as any[],
      clientsWithSameEmail: [] as any[],
      clientsWithThisUserId: [] as any[],
      currentlyViewedClient: null as any,
      correctionsMade: [] as string[],
    };
    
    // 1. Récupérer le client actuellement consulté (via l'URL)
    const currentPath = window.location.pathname;
    const clientIdMatch = currentPath.match(/\/clients\/([^\/]+)/);
    const currentClientId = clientIdMatch ? clientIdMatch[1] : null;
    
    if (currentClientId) {
      const { data: viewedClient } = await supabase
        .from('clients')
        .select('*')
        .eq('id', currentClientId)
        .single();
        
      results.currentlyViewedClient = viewedClient;
      console.log("Client actuellement consulté:", viewedClient);
    }
    
    // 2. Récupérer tous les clients associés à cet email
    if (userEmail) {
      const { data: clientsWithEmail } = await supabase
        .from('clients')
        .select('*')
        .eq('email', userEmail);
        
      if (clientsWithEmail && clientsWithEmail.length > 0) {
        results.clientsWithSameEmail = clientsWithEmail;
        console.log(`${clientsWithEmail.length} clients trouvés avec l'email ${userEmail}:`, clientsWithEmail);
      }
    }
    
    // 3. Récupérer tous les clients associés à cet ID utilisateur
    const { data: clientsWithUserId } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId);
      
    if (clientsWithUserId && clientsWithUserId.length > 0) {
      results.clientsWithThisUserId = clientsWithUserId;
      console.log(`${clientsWithUserId.length} clients trouvés avec l'ID utilisateur ${userId}:`, clientsWithUserId);
    }
    
    // 4. Appliquer des corrections si nécessaire
    
    // 4.1 Si aucun client n'est associé à cet ID utilisateur mais qu'il y a des clients avec cet email
    if ((!clientsWithUserId || clientsWithUserId.length === 0) && 
        results.clientsWithSameEmail && results.clientsWithSameEmail.length > 0) {
      
      // Associer le premier client trouvé avec cet email à l'utilisateur
      const clientToAssociate = results.clientsWithSameEmail[0];
      
      console.log(`Association du client ${clientToAssociate.id} (${clientToAssociate.name}) avec l'utilisateur ${userId}`);
      
      const { error } = await supabase
        .from('clients')
        .update({ user_id: userId })
        .eq('id', clientToAssociate.id);
        
      if (!error) {
        results.correctionsMade.push(`Client ${clientToAssociate.name} (${clientToAssociate.id}) associé à l'utilisateur ${userId}`);
        toast.success(`Client ${clientToAssociate.name} associé à votre compte utilisateur`);
      } else {
        console.error("Erreur lors de l'association:", error);
      }
    }
    
    // 4.2 Si le client actuellement consulté existe et n'est associé à aucun utilisateur
    if (results.currentlyViewedClient && !results.currentlyViewedClient.user_id) {
      console.log(`Le client consulté ${results.currentlyViewedClient.id} n'est associé à aucun utilisateur, association avec ${userId}`);
      
      const { error } = await supabase
        .from('clients')
        .update({ user_id: userId })
        .eq('id', results.currentlyViewedClient.id);
        
      if (!error) {
        results.correctionsMade.push(`Client consulté ${results.currentlyViewedClient.name} (${results.currentlyViewedClient.id}) associé à l'utilisateur ${userId}`);
        toast.success(`Client ${results.currentlyViewedClient.name} associé à votre compte utilisateur`);
      } else {
        console.error("Erreur lors de l'association:", error);
      }
    }
    
    // 4.3 Si le client consulté a un email mais que celui-ci ne correspond pas à l'email de l'utilisateur connecté
    if (results.currentlyViewedClient && userEmail && 
        !results.currentlyViewedClient.email) {
      
      console.log(`Mise à jour de l'email du client consulté ${results.currentlyViewedClient.id} avec ${userEmail}`);
      
      const { error } = await supabase
        .from('clients')
        .update({ email: userEmail })
        .eq('id', results.currentlyViewedClient.id);
        
      if (!error) {
        results.correctionsMade.push(`Email du client ${results.currentlyViewedClient.name} mis à jour avec ${userEmail}`);
      } else {
        console.error("Erreur lors de la mise à jour de l'email:", error);
      }
    }
    
    return results;
  } catch (error) {
    console.error("Erreur dans verifyClientUserAssociation:", error);
    return null;
  }
};

/**
 * Permet de fusionner deux clients (en cas de duplication)
 * Transfert les contrats et autres données liées d'un client à un autre
 */
export const mergeClients = async (sourceClientId: string, targetClientId: string) => {
  try {
    console.log(`Fusion des clients : source ${sourceClientId} -> cible ${targetClientId}`);
    
    // 1. Vérifier que les deux clients existent
    const { data: sourceClient, error: sourceError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', sourceClientId)
      .single();
      
    const { data: targetClient, error: targetError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', targetClientId)
      .single();
      
    if (sourceError || targetError || !sourceClient || !targetClient) {
      console.error("Erreur lors de la récupération des clients:", sourceError || targetError);
      toast.error("Impossible de trouver les clients à fusionner");
      return false;
    }
    
    // 2. Transférer les contrats
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('*')
      .eq('client_id', sourceClientId);
      
    if (contractsError) {
      console.error("Erreur lors de la récupération des contrats:", contractsError);
    } else if (contracts && contracts.length > 0) {
      console.log(`Transfert de ${contracts.length} contrats du client ${sourceClientId} vers ${targetClientId}`);
      
      for (const contract of contracts) {
        const { error: updateError } = await supabase
          .from('contracts')
          .update({ 
            client_id: targetClientId,
            client_name: targetClient.name
          })
          .eq('id', contract.id);
          
        if (updateError) {
          console.error(`Erreur lors du transfert du contrat ${contract.id}:`, updateError);
        }
      }
    }
    
    // 3. Transférer les offres
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('*')
      .eq('client_id', sourceClientId);
      
    if (offersError) {
      console.error("Erreur lors de la récupération des offres:", offersError);
    } else if (offers && offers.length > 0) {
      console.log(`Transfert de ${offers.length} offres du client ${sourceClientId} vers ${targetClientId}`);
      
      for (const offer of offers) {
        const { error: updateError } = await supabase
          .from('offers')
          .update({ 
            client_id: targetClientId,
            client_name: targetClient.name,
            client_email: targetClient.email || offer.client_email
          })
          .eq('id', offer.id);
          
        if (updateError) {
          console.error(`Erreur lors du transfert de l'offre ${offer.id}:`, updateError);
        }
      }
    }
    
    // 4. Gérer les user_id des deux clients
    if (sourceClient.user_id && targetClient.user_id && sourceClient.user_id !== targetClient.user_id) {
      // Les deux clients ont des user_id différents - situation complexe
      console.warn(`Les deux clients ont des user_id différents: ${sourceClient.user_id} et ${targetClient.user_id}`);
      toast.warning("Attention: les deux clients sont associés à des comptes utilisateurs différents");
    } else if (sourceClient.user_id && !targetClient.user_id) {
      // Le client source a un user_id mais pas le client cible, transférer l'association
      console.log(`Transfert de l'association utilisateur ${sourceClient.user_id} vers le client cible ${targetClientId}`);
      
      const { error: updateUserIdError } = await supabase
        .from('clients')
        .update({ user_id: sourceClient.user_id })
        .eq('id', targetClientId);
        
      if (updateUserIdError) {
        console.error("Erreur lors du transfert de l'association utilisateur:", updateUserIdError);
      }
    }
    // Si le client cible a déjà un user_id ou si aucun n'a de user_id, rien à faire
    
    // 5. Désactiver le client source (sans le supprimer pour conserver l'historique)
    const { error: updateError } = await supabase
      .from('clients')
      .update({ 
        status: 'inactive',
        user_id: null, // Retirer l'association utilisateur
        notes: `${sourceClient.notes ? sourceClient.notes + "\n\n" : ""}Client fusionné avec ${targetClient.name} (${targetClientId}) le ${new Date().toISOString()}`
      })
      .eq('id', sourceClientId);
      
    if (updateError) {
      console.error("Erreur lors de la désactivation du client source:", updateError);
      toast.error("Erreur lors de la fusion des clients");
      return false;
    }
    
    toast.success(`Clients fusionnés avec succès ! Toutes les données ont été transférées vers ${targetClient.name}`);
    return true;
  } catch (error) {
    console.error("Erreur dans mergeClients:", error);
    toast.error("Erreur lors de la fusion des clients");
    return false;
  }
};
