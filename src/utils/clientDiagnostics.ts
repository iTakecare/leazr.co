
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
        .update({ 
          user_id: userId,
          has_user_account: true,
          user_account_created_at: new Date().toISOString()
        })
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
        .update({ 
          user_id: userId,
          has_user_account: true,
          user_account_created_at: new Date().toISOString() 
        })
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
export const mergeClients = async (sourceClientId: string, targetClientId: string): Promise<void> => {
  console.log(`🔄 Fusion du client ${sourceClientId} vers ${targetClientId}...`);
  
  try {
    // 1. Récupérer les deux clients
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

    if (sourceError || targetError) {
      throw new Error("Erreur lors de la récupération des clients");
    }

    if (!sourceClient || !targetClient) {
      throw new Error("Clients non trouvés");
    }

    console.log(`📋 Source: "${sourceClient.name}" → Cible: "${targetClient.name}"`);

    // 2. Enrichir le client cible avec les données manquantes du source
    const enrichments: Partial<any> = {};
    let enrichmentLog = "";

    if (!targetClient.email && sourceClient.email) {
      enrichments.email = sourceClient.email;
      enrichmentLog += `\n  ✓ Email ajouté: ${sourceClient.email}`;
    } else if (targetClient.email !== sourceClient.email && sourceClient.email) {
      // Email alternatif à conserver dans les notes
      enrichmentLog += `\n  ℹ Email alternatif: ${sourceClient.email}`;
    }

    if (!targetClient.phone && sourceClient.phone) {
      enrichments.phone = sourceClient.phone;
      enrichmentLog += `\n  ✓ Téléphone ajouté: ${sourceClient.phone}`;
    }

    if (!targetClient.address && sourceClient.address) {
      enrichments.address = sourceClient.address;
      enrichmentLog += `\n  ✓ Adresse ajoutée`;
    }

    if (!targetClient.company && sourceClient.company) {
      enrichments.company = sourceClient.company;
      enrichmentLog += `\n  ✓ Société ajoutée: ${sourceClient.company}`;
    }

    // Enrichir les notes
    let updatedNotes = targetClient.notes || "";
    updatedNotes += `\n\n[${new Date().toISOString()}] Fusion avec "${sourceClient.name}" (${sourceClientId})`;
    if (enrichmentLog) {
      updatedNotes += enrichmentLog;
    }
    if (sourceClient.notes) {
      updatedNotes += `\n\nNotes du client fusionné:\n${sourceClient.notes}`;
    }
    enrichments.notes = updatedNotes.trim();

    // Appliquer les enrichissements
    if (Object.keys(enrichments).length > 0) {
      const { error: updateError } = await supabase
        .from('clients')
        .update(enrichments)
        .eq('id', targetClientId);

      if (updateError) {
        console.error("❌ Erreur lors de l'enrichissement:", updateError);
      } else {
        console.log("✅ Client cible enrichi");
      }
    }

    // 3. Transférer les contrats
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id')
      .eq('client_id', sourceClientId);

    if (!contractsError && contracts && contracts.length > 0) {
      const { error: updateContractsError } = await supabase
        .from('contracts')
        .update({ client_id: targetClientId })
        .eq('client_id', sourceClientId);

      if (updateContractsError) {
        console.error("❌ Erreur transfert contrats:", updateContractsError);
      } else {
        console.log(`✅ ${contracts.length} contrat(s) transféré(s)`);
      }
    }

    // 4. Transférer les offres
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('id')
      .eq('client_id', sourceClientId);

    if (!offersError && offers && offers.length > 0) {
      const { error: updateOffersError } = await supabase
        .from('offers')
        .update({ client_id: targetClientId })
        .eq('client_id', sourceClientId);

      if (updateOffersError) {
        console.error("❌ Erreur transfert offres:", updateOffersError);
      } else {
        console.log(`✅ ${offers.length} offre(s) transférée(s)`);
      }
    }

    // 5. Supprimer l'association utilisateur du doublon
    if (sourceClient.user_id) {
      const { error: unlinkError } = await supabase
        .from('clients')
        .update({ user_id: null })
        .eq('id', sourceClientId);

      if (unlinkError) {
        console.error("❌ Erreur dissociation user:", unlinkError);
      } else {
        console.log("✅ Association utilisateur supprimée du doublon");
      }
    }

    // 6. Supprimer définitivement le client source
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', sourceClientId);

    if (deleteError) {
      throw new Error(`Erreur lors de la suppression du client source: ${deleteError.message}`);
    }

    console.log(`🗑️ Client source "${sourceClient.name}" (${sourceClientId}) supprimé définitivement`);

    console.log(`✅ Fusion terminée: "${sourceClient.name}" → "${targetClient.name}"`);
    toast.success(`Client fusionné: ${sourceClient.name} → ${targetClient.name}`);

  } catch (error) {
    console.error("❌ Erreur lors de la fusion:", error);
    toast.error("Erreur lors de la fusion des clients");
    throw error;
  }
};

/**
 * Vérifie si une adresse email a un compte utilisateur associé
 * Cette fonction est utilisée pour vérifier si un client peut récupérer son mot de passe
 * Utilise la nouvelle fonction SQL pour plus d'efficacité
 */
export const checkUserExistenceByEmail = async (email: string) => {
  try {
    // Utiliser la nouvelle fonction SQL pour vérifier si l'utilisateur existe
    const { data, error } = await supabase.rpc('check_user_exists_by_email', {
      user_email: email
    });
    
    if (error) {
      console.error("Erreur lors de la vérification de l'utilisateur:", error);
      return false;
    }
    
    if (data === true) {
      return true; // Un utilisateur avec cet email existe
    }
    
    // Si aucun utilisateur n'existe, vérifier s'il y a un client avec cet email
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email, has_user_account')
      .eq('email', email)
      .maybeSingle();
      
    if (clientError && clientError.code !== 'PGRST116') {
      console.error("Erreur lors de la vérification du client:", clientError);
      return false;
    }
    
    // Retourner true uniquement si le client existe et a déjà un compte utilisateur
    return clientData ? clientData.has_user_account : false;
  } catch (error) {
    console.error("Erreur dans checkUserExistenceByEmail:", error);
    return false;
  }
};
