
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Vérifie et corrige l'association entre un client et son utilisateur
 * @param clientId - L'ID du client à vérifier/corriger
 * @returns Promise<{ success: boolean, message: string }>
 */
export const fixIncorrectUserAssociation = async (clientId: string) => {
  try {
    console.log("Début de la vérification de l'association client-utilisateur:", clientId);

    // 1. Récupérer les informations du client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error("Erreur lors de la récupération du client:", clientError);
      return { success: false, message: "Client introuvable" };
    }

    if (!client.email) {
      return { success: false, message: "Le client n'a pas d'adresse email" };
    }

    // 2. Récupérer l'utilisateur correspondant par email
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserByEmail(
      client.email
    );

    if (userError) {
      console.error("Erreur lors de la récupération de l'utilisateur:", userError);
      return { success: false, message: "Utilisateur introuvable" };
    }

    if (!user) {
      // Réinitialiser les champs liés au compte utilisateur
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          user_id: null,
          has_user_account: false,
          user_account_created_at: null
        })
        .eq('id', clientId);

      if (updateError) {
        console.error("Erreur lors de la réinitialisation:", updateError);
        return { success: false, message: "Erreur lors de la réinitialisation" };
      }

      return { 
        success: true, 
        message: "Association réinitialisée - aucun utilisateur trouvé avec cet email" 
      };
    }

    // 3. Vérifier si l'ID utilisateur actuel est correct
    if (client.user_id === user.id) {
      return { 
        success: true, 
        message: "L'association client-utilisateur est déjà correcte" 
      };
    }

    // 4. Mettre à jour le client avec le bon user_id
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        user_id: user.id,
        has_user_account: true,
        user_account_created_at: new Date().toISOString()
      })
      .eq('id', clientId);

    if (updateError) {
      console.error("Erreur lors de la mise à jour:", updateError);
      return { success: false, message: "Erreur lors de la mise à jour" };
    }

    console.log(`Association corrigée pour le client ${clientId} avec l'utilisateur ${user.id}`);
    return { 
      success: true, 
      message: `Association corrigée - ID utilisateur mis à jour: ${user.id}` 
    };

  } catch (error) {
    console.error("Erreur lors de la correction de l'association:", error);
    return { success: false, message: "Erreur inattendue lors de la correction" };
  }
};

/**
 * Nettoie et corrige les associations utilisateur-client
 * @returns Promise<{ success: boolean, message: string, mergedCount?: number }>
 */
export const cleanupDuplicateClients = async () => {
  try {
    console.log("Début du nettoyage des clients en double");
    
    // 1. Trouver les emails en double
    const { data: duplicateEmails, error: findError } = await supabase.rpc('find_duplicate_client_emails');
    
    if (findError) {
      console.error("Erreur lors de la recherche des emails en double:", findError);
      return { 
        success: false, 
        message: "Erreur lors de la recherche des emails en double", 
        error: findError.message 
      };
    }
    
    if (!duplicateEmails || duplicateEmails.length === 0) {
      console.log("Aucun email en double trouvé");
      return { 
        success: true, 
        message: "Aucun email en double trouvé", 
        mergedCount: 0 
      };
    }
    
    console.log(`${duplicateEmails.length} emails en double trouvés:`, duplicateEmails);
    
    let mergedCount = 0;
    
    // 2. Traiter chaque email en double
    for (const email of duplicateEmails) {
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: true });
      
      if (clients && clients.length > 1) {
        const primaryClient = clients[0]; // Le plus ancien client devient le principal
        const duplicateIds = clients.slice(1).map(c => c.id);
        
        // Marquer les clients en double comme dupliqués et référencer le client principal
        for (const dupId of duplicateIds) {
          const { error: updateError } = await supabase
            .from('clients')
            .update({
              status: 'duplicate',
              duplicate_of: primaryClient.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', dupId);
          
          if (updateError) {
            console.error(`Erreur lors du marquage du client ${dupId} comme dupliqué:`, updateError);
            continue;
          }
          
          mergedCount++;
        }
        
        console.log(`Clients en double traités pour ${email}: ${duplicateIds.join(', ')} -> ${primaryClient.id}`);
      }
    }
    
    return { 
      success: true, 
      message: `Nettoyage terminé. ${mergedCount} clients marqués comme doublons`, 
      mergedCount 
    };
  } catch (error) {
    console.error("Erreur lors du nettoyage des clients en double:", error);
    return { 
      success: false, 
      message: "Erreur inattendue lors du nettoyage", 
      error: String(error)
    };
  }
};

/**
 * Lie un utilisateur à un client en fonction de l'email
 * @param userId - ID de l'utilisateur 
 * @param userEmail - Email de l'utilisateur
 * @returns Promise<string | null> - ID du client si trouvé et lié
 */
export const linkUserToClient = async (userId: string, userEmail: string): Promise<string | null> => {
  try {
    console.log(`Tentative de liaison de l'utilisateur ${userId} avec email ${userEmail} à un client`);
    
    // 1. Vérifier si un client avec cet email existe déjà
    const { data: existingClients, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('email', userEmail)
      .eq('status', 'active')
      .order('created_at', { ascending: true });
    
    if (clientError) {
      console.error("Erreur lors de la recherche de clients:", clientError);
      return null;
    }
    
    // Aucun client trouvé avec cet email
    if (!existingClients || existingClients.length === 0) {
      console.log(`Aucun client trouvé pour l'email ${userEmail}`);
      return null;
    }
    
    // 2. Prendre le client le plus ancien si plusieurs existent
    const client = existingClients[0];
    
    // Si le client a déjà un user_id qui correspond
    if (client.user_id === userId) {
      console.log(`Le client ${client.id} est déjà associé à l'utilisateur ${userId}`);
      return client.id;
    }
    
    // 3. Si le client a un user_id différent, vérifier si cet utilisateur existe toujours
    if (client.user_id) {
      const { data: userExists } = await supabase.rpc(
        'check_user_exists_by_id',
        { user_id: client.user_id }
      );
      
      if (userExists) {
        console.log(`Le client ${client.id} est déjà associé à un autre utilisateur ${client.user_id}`);
        return null;
      }
      
      console.log(`L'utilisateur ${client.user_id} n'existe plus, mise à jour avec le nouvel utilisateur ${userId}`);
    }
    
    // 4. Mettre à jour le client avec le nouvel utilisateur
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        user_id: userId,
        has_user_account: true,
        user_account_created_at: new Date().toISOString()
      })
      .eq('id', client.id);
    
    if (updateError) {
      console.error(`Erreur lors de la mise à jour du client ${client.id}:`, updateError);
      return null;
    }
    
    console.log(`Client ${client.id} associé avec succès à l'utilisateur ${userId}`);
    return client.id;
  } catch (error) {
    console.error("Erreur lors de la liaison utilisateur-client:", error);
    return null;
  }
};

/**
 * Récupère l'ID du client associé à un utilisateur
 * @param userId - ID de l'utilisateur
 * @returns Promise<string | null> - ID du client si trouvé
 */
export const getClientIdForUser = async (userId: string): Promise<string | null> => {
  try {
    // Vérifier d'abord dans le localStorage pour optimiser les performances
    const cachedClientId = localStorage.getItem(`client_id_${userId}`);
    if (cachedClientId) {
      console.log(`ID client récupéré du cache: ${cachedClientId}`);
      return cachedClientId;
    }
    
    // Sinon rechercher dans la base de données
    const { data: client, error } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    
    if (error) {
      console.error("Erreur lors de la récupération du client pour l'utilisateur:", error);
      return null;
    }
    
    if (client && client.id) {
      // Mettre en cache pour les prochaines requêtes
      localStorage.setItem(`client_id_${userId}`, client.id);
      console.log(`ID client récupéré et mis en cache: ${client.id}`);
      return client.id;
    }
    
    return null;
  } catch (error) {
    console.error("Erreur dans getClientIdForUser:", error);
    return null;
  }
};
