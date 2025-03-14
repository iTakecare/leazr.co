
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Associe un compte utilisateur à un client basé sur l'email
 * Cette fonction cherche un client par email et met à jour son user_id
 * Améliorée pour utiliser les nouveaux champs de suivi du compte utilisateur
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
    
    // 2. Vérifier s'il existe un client avec le même email que l'utilisateur
    const { data: existingClientByEmail, error: emailError } = await supabase
      .from('clients')
      .select('id, name, user_id, email, has_user_account')
      .eq('email', userEmail)
      .maybeSingle();
      
    if (emailError && emailError.code !== 'PGRST116') {
      console.error("Erreur lors de la recherche du client par email:", emailError);
    }
    
    // Si un client avec cet email existe
    if (existingClientByEmail) {
      console.log(`Client trouvé avec l'email ${userEmail}: ${existingClientByEmail.id} (${existingClientByEmail.name})`);
      
      // Si le client n'a pas d'user_id ou a un user_id différent
      if (!existingClientByEmail.user_id || existingClientByEmail.user_id !== userId) {
        // Vérifier s'il existe d'autres clients associés à cet utilisateur
        const { data: otherClientsWithSameUser, error: otherClientsError } = await supabase
          .from('clients')
          .select('id, name')
          .eq('user_id', userId);
          
        if (otherClientsError) {
          console.error("Erreur lors de la recherche d'autres clients:", otherClientsError);
        }
        
        // Si d'autres clients sont associés au même utilisateur, afficher un avertissement
        if (otherClientsWithSameUser && otherClientsWithSameUser.length > 0) {
          console.warn(`Attention: l'utilisateur ${userId} est déjà associé à ${otherClientsWithSameUser.length} autre(s) client(s)`);
          const clientNames = otherClientsWithSameUser.map(c => c.name).join(", ");
          toast.warning(`Cet utilisateur est déjà associé à d'autres clients: ${clientNames}`);
        }
        
        // Mettre à jour le client avec l'user_id
        console.log(`Association du client ${existingClientByEmail.id} avec l'utilisateur ${userId}`);
        
        const { error: updateError } = await supabase
          .from('clients')
          .update({ 
            user_id: userId,
            has_user_account: true,
            user_account_created_at: new Date().toISOString()
          })
          .eq('id', existingClientByEmail.id);
          
        if (updateError) {
          console.error("Erreur lors de l'association:", updateError);
          return null;
        }
        
        toast.success(`Votre compte a été associé à ${existingClientByEmail.name}`);
      } else {
        console.log("Le client est déjà associé à cet utilisateur");
      }
      
      localStorage.setItem(`client_id_${userId}`, existingClientByEmail.id);
      return existingClientByEmail.id;
    }
    
    // 3. Si aucun client correspondant n'est trouvé, créer un nouveau client
    console.log("Aucun client trouvé pour cet email, création automatique");
    
    // Extraire le nom d'affichage à partir de l'email
    const displayName = userEmail.split('@')[0];
    // Transformer en format nom plus lisible (première lettre en majuscule)
    const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1).replace(/[._-]/g, ' ');
    
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert({
        name: formattedName,
        email: userEmail,
        user_id: userId,
        has_user_account: true,
        user_account_created_at: new Date().toISOString(),
        status: 'active'
      })
      .select('id, name')
      .single();
      
    if (createError) {
      console.error("Erreur lors de la création du client:", createError);
      return null;
    }
    
    console.log("Nouveau client créé:", newClient);
    toast.success(`Un nouveau compte client a été créé pour vous (${newClient.name})`);
    localStorage.setItem(`client_id_${userId}`, newClient.id);
    return newClient.id;
    
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
        .select('id, user_id, has_user_account')
        .eq('id', cachedClientId)
        .maybeSingle();
        
      if (cacheError) {
        console.error("Erreur lors de la vérification du client en cache:", cacheError);
      } else if (cachedClient && cachedClient.user_id === userId && cachedClient.has_user_account) {
        return cachedClientId;
      } else {
        console.log("Client en cache invalide ou mal associé, recherche d'un nouveau client");
        localStorage.removeItem(`client_id_${userId}`);
      }
    }
    
    // Rechercher par user_id
    const { data: clientByUserId, error: userIdError } = await supabase
      .from('clients')
      .select('id, has_user_account')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (userIdError && userIdError.code !== 'PGRST116') {
      console.error("Erreur lors de la recherche par user_id:", userIdError);
    }
    
    if (clientByUserId && clientByUserId.has_user_account) {
      console.log("Client trouvé par user_id:", clientByUserId.id);
      localStorage.setItem(`client_id_${userId}`, clientByUserId.id);
      return clientByUserId.id;
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
