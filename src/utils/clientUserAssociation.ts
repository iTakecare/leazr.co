
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Associe un compte utilisateur à un client basé sur l'email
 * Cette fonction cherche un client par email et met à jour son user_id
 * Améliorée pour éviter les duplications de clients
 */
export const linkUserToClient = async (userId: string, userEmail: string): Promise<string | null> => {
  try {
    console.log(`Tentative d'association du compte ${userEmail} (${userId}) à un client`);
    
    if (!userEmail || !userId) {
      console.error("Email ou ID utilisateur manquant pour l'association");
      return null;
    }
    
    // 1. D'abord, vérifier si un client est déjà associé à cet utilisateur
    const { data: existingClientByUserId, error: userIdError } = await supabase
      .from('clients')
      .select('id, name, email, user_id, has_user_account')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (userIdError && userIdError.code !== 'PGRST116') {
      console.error("Erreur lors de la recherche du client par user_id:", userIdError);
    }
    
    // Si un client est déjà associé à cet utilisateur, on retourne simplement son ID
    if (existingClientByUserId) {
      console.log(`L'utilisateur ${userId} est déjà associé au client ${existingClientByUserId.id} (${existingClientByUserId.name})`);
      localStorage.setItem(`client_id_${userId}`, existingClientByUserId.id);
      return existingClientByUserId.id;
    }
    
    // 2. Vérifier s'il existe des clients avec le même email que l'utilisateur
    const { data: existingClientsByEmail, error: emailError } = await supabase
      .from('clients')
      .select('id, name, user_id, email, has_user_account, status, created_at')
      .eq('email', userEmail)
      .order('created_at', { ascending: true });
      
    if (emailError) {
      console.error("Erreur lors de la recherche des clients par email:", emailError);
      return null;
    }
    
    // Si des clients avec cet email existent
    if (existingClientsByEmail && existingClientsByEmail.length > 0) {
      console.log(`${existingClientsByEmail.length} clients trouvés avec l'email ${userEmail}`);
      
      // Choisir le client le plus pertinent :
      // 1. Préférer un client actif sans user_id
      // 2. Si plusieurs, prendre le plus ancien (première création)
      let clientToUse = existingClientsByEmail[0]; // Par défaut le plus ancien
      
      // Recherche d'un client actif sans user_id
      const activeClientWithoutUser = existingClientsByEmail.find(
        client => client.status === 'active' && !client.user_id
      );
      
      if (activeClientWithoutUser) {
        clientToUse = activeClientWithoutUser;
      }
      
      console.log(`Client sélectionné pour l'association: ${clientToUse.id} (${clientToUse.name})`);
      
      // S'il existe d'autres clients avec le même email, les marquer comme doublons
      if (existingClientsByEmail.length > 1) {
        const otherClientsIds = existingClientsByEmail
          .filter(c => c.id !== clientToUse.id)
          .map(c => c.id);
          
        if (otherClientsIds.length > 0) {
          console.log(`Marquage des doublons: ${otherClientsIds.join(', ')}`);
          
          const { error: updateDuplicatesError } = await supabase
            .from('clients')
            .update({
              status: 'duplicate',
              notes: `Marqué comme doublon le ${new Date().toISOString()}. ID du client principal: ${clientToUse.id}`
            })
            .in('id', otherClientsIds);
            
          if (updateDuplicatesError) {
            console.error("Erreur lors du marquage des doublons:", updateDuplicatesError);
          }
        }
      }
      
      // Si le client sélectionné n'a pas d'user_id ou a un user_id différent
      if (!clientToUse.user_id || clientToUse.user_id !== userId) {
        console.log(`Association du client ${clientToUse.id} avec l'utilisateur ${userId}`);
        
        const { error: updateError } = await supabase
          .from('clients')
          .update({ 
            user_id: userId,
            has_user_account: true,
            user_account_created_at: new Date().toISOString(),
            status: 'active' // Assurer que le client est actif
          })
          .eq('id', clientToUse.id);
          
        if (updateError) {
          console.error("Erreur lors de l'association:", updateError);
          return null;
        }
        
        toast.success(`Votre compte a été associé à ${clientToUse.name}`);
      } else {
        console.log("Le client est déjà associé à cet utilisateur");
      }
      
      localStorage.setItem(`client_id_${userId}`, clientToUse.id);
      return clientToUse.id;
    }
    
    // 3. Si aucun client correspondant n'est trouvé, ne pas créer de client automatiquement
    console.log("Aucun client trouvé pour cet email, pas de création automatique");
    return null;
    
  } catch (error) {
    console.error("Erreur dans linkUserToClient:", error);
    return null;
  }
};

/**
 * Force l'association pour tous les clients sans user_id qui ont un email correspondant à un utilisateur
 * Fonction améliorée pour détecter les potentiels doublons et conflits
 * Utilise les nouveaux champs de suivi du compte utilisateur
 */
export const associateAllClientsWithUsers = async (): Promise<void> => {
  try {
    // Récupérer tous les clients sans user_id
    const { data: clientsWithoutUsers, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email, has_user_account')
      .is('user_id', null)
      .not('email', 'is', null);
      
    if (clientsError) {
      console.error("Erreur lors de la récupération des clients:", clientsError);
      return;
    }
    
    if (!clientsWithoutUsers || clientsWithoutUsers.length === 0) {
      console.log("Aucun client sans user_id trouvé");
      toast.info("Tous les clients sont déjà associés à des utilisateurs");
      return;
    }
    
    console.log(`${clientsWithoutUsers.length} clients sans user_id trouvés`);
    
    let associationCount = 0;
    let skippedCount = 0;
    
    // Pour chaque client, vérifier s'il existe un utilisateur avec le même email
    for (const client of clientsWithoutUsers) {
      if (!client.email) continue;
      
      // Utiliser notre nouvelle fonction pour récupérer l'ID utilisateur par email
      const { data: userId, error: userIdError } = await supabase.rpc('get_user_id_by_email', {
        user_email: client.email
      });
      
      if (userIdError) {
        console.error(`Erreur lors de la recherche de l'utilisateur pour ${client.email}:`, userIdError);
        continue;
      }
      
      if (userId) {
        // Vérifier si cet utilisateur est déjà associé à un autre client
        const { data: existingClients, error: existingError } = await supabase
          .from('clients')
          .select('id, name')
          .eq('user_id', userId);
          
        if (existingError) {
          console.error(`Erreur lors de la vérification des associations existantes:`, existingError);
          continue;
        }
        
        if (existingClients && existingClients.length > 0) {
          console.warn(`L'utilisateur ${userId} est déjà associé à ${existingClients.length} client(s)`);
          skippedCount++;
          continue;
        }
        
        console.log(`Association du client ${client.id} (${client.name}) avec l'utilisateur ${userId}`);
        
        const { error: updateError } = await supabase
          .from('clients')
          .update({ 
            user_id: userId,
            has_user_account: true,
            user_account_created_at: new Date().toISOString()
          })
          .eq('id', client.id);
          
        if (updateError) {
          console.error(`Erreur lors de l'association pour ${client.id}:`, updateError);
        } else {
          console.log(`Client ${client.id} associé avec succès à l'utilisateur ${userId}`);
          associationCount++;
        }
      } else {
        console.log(`Aucun utilisateur trouvé pour l'email ${client.email}`);
      }
    }
    
    if (associationCount > 0) {
      toast.success(`${associationCount} client(s) associé(s) avec succès`);
    }
    
    if (skippedCount > 0) {
      toast.warning(`${skippedCount} client(s) ignoré(s) car les utilisateurs étaient déjà associés à d'autres clients`);
    }
    
    if (associationCount === 0 && skippedCount === 0) {
      toast.info("Aucune nouvelle association effectuée");
    }
  } catch (error) {
    console.error("Erreur dans associateAllClientsWithUsers:", error);
    toast.error("Erreur lors de l'association des clients");
  }
};

/**
 * Récupère l'ID du client associé à un utilisateur
 * Fonction améliorée pour une meilleure gestion des cas problématiques
 * Utilise les nouveaux champs de suivi du compte utilisateur
 */
export const getClientIdForUser = async (userId: string, userEmail: string | null): Promise<string | null> => {
  try {
    // Vérifier d'abord le cache local
    const cachedClientId = localStorage.getItem(`client_id_${userId}`);
    if (cachedClientId) {
      console.log("ID client trouvé en cache:", cachedClientId);
      
      // Vérifier que le client existe toujours et est bien associé à cet utilisateur
      const { data: cachedClient, error: cacheError } = await supabase
        .from('clients')
        .select('id, user_id, has_user_account, status')
        .eq('id', cachedClientId)
        .maybeSingle();
        
      if (cacheError) {
        console.error("Erreur lors de la vérification du client en cache:", cacheError);
      } else if (cachedClient && cachedClient.user_id === userId && cachedClient.has_user_account && cachedClient.status === 'active') {
        return cachedClientId;
      } else {
        console.log("Client en cache invalide, mal associé ou inactif, recherche d'un nouveau client");
        localStorage.removeItem(`client_id_${userId}`);
      }
    }
    
    // Rechercher par user_id (uniquement les clients actifs)
    const { data: clientsByUserId, error: userIdError } = await supabase
      .from('clients')
      .select('id, name, has_user_account, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });
      
    if (userIdError) {
      console.error("Erreur lors de la recherche par user_id:", userIdError);
    }
    
    if (clientsByUserId && clientsByUserId.length > 0) {
      // S'il y a plusieurs clients associés, prendre le plus ancien
      const clientToUse = clientsByUserId[0];
      console.log(`Client actif trouvé par user_id: ${clientToUse.id} (${clientToUse.name})`);
      
      localStorage.setItem(`client_id_${userId}`, clientToUse.id);
      
      // Si plusieurs clients sont trouvés, marquer les autres comme doublons
      if (clientsByUserId.length > 1) {
        console.warn(`Attention: ${clientsByUserId.length} clients actifs trouvés pour l'utilisateur ${userId}. Utilisation du plus ancien.`);
        
        // Marquer les autres comme doublons (sauf le premier)
        const duplicateIds = clientsByUserId.slice(1).map(c => c.id);
        if (duplicateIds.length > 0) {
          await supabase
            .from('clients')
            .update({
              status: 'duplicate',
              notes: `Marqué comme doublon le ${new Date().toISOString()}. ID du client principal: ${clientToUse.id}`
            })
            .in('id', duplicateIds);
            
          console.log(`${duplicateIds.length} clients marqués comme doublons`);
        }
      }
      
      return clientToUse.id;
    }
    
    // Si l'email est disponible, essayer de lier
    if (userEmail) {
      return await linkUserToClient(userId, userEmail);
    }
    
    return null;
  } catch (error) {
    console.error("Erreur dans getClientIdForUser:", error);
    return null;
  }
};

/**
 * Nettoie les doublons de clients basés sur l'email
 * Identifie les doublons et les marque comme tels
 */
export const cleanupDuplicateClients = async (): Promise<void> => {
  try {
    // 1. Trouver tous les emails qui ont plusieurs clients
    const { data: emailCounts, error: countError } = await supabase
      .from('clients')
      .select('email, count(*)')
      .not('email', 'is', null)
      .group('email')
      .having('count(*) > 1');

    if (countError) {
      console.error("Erreur lors de la recherche des doublons:", countError);
      toast.error("Erreur lors de la recherche des doublons");
      return;
    }

    if (!emailCounts || emailCounts.length === 0) {
      toast.info("Aucun client en doublon détecté");
      return;
    }

    console.log(`${emailCounts.length} emails avec plusieurs clients détectés`);
    let processedCount = 0;

    // Pour chaque email avec des doublons
    for (const item of emailCounts) {
      const email = item.email;
      
      // Récupérer tous les clients avec cet email
      const { data: duplicateClients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, email, user_id, status, created_at')
        .eq('email', email)
        .order('created_at', { ascending: true });
        
      if (clientsError || !duplicateClients || duplicateClients.length <= 1) {
        continue;
      }

      // Identifier le client principal à conserver
      // Priorité: client avec user_id, puis le plus ancien
      let mainClient = duplicateClients[0]; // Par défaut le plus ancien
      
      // Chercher un client avec user_id et statut actif
      const clientWithUserId = duplicateClients.find(
        client => client.user_id && client.status === 'active'
      );
      
      if (clientWithUserId) {
        mainClient = clientWithUserId;
      }

      console.log(`Email ${email}: client principal ${mainClient.id} (${mainClient.name})`);

      // Marquer les autres comme doublons
      const duplicateIds = duplicateClients
        .filter(c => c.id !== mainClient.id)
        .map(c => c.id);
        
      if (duplicateIds.length > 0) {
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            status: 'duplicate',
            notes: `Marqué comme doublon le ${new Date().toISOString()}. ID du client principal: ${mainClient.id}`
          })
          .in('id', duplicateIds);
          
        if (updateError) {
          console.error(`Erreur lors du marquage des doublons pour ${email}:`, updateError);
        } else {
          processedCount += duplicateIds.length;
          console.log(`${duplicateIds.length} clients marqués comme doublons pour ${email}`);
        }
      }
    }

    toast.success(`Nettoyage terminé: ${processedCount} doublons identifiés et marqués`);
  } catch (error) {
    console.error("Erreur dans cleanupDuplicateClients:", error);
    toast.error("Erreur lors du nettoyage des doublons");
  }
};
