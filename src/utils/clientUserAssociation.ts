
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Associe un compte utilisateur à un client basé sur l'email
 * Cette fonction cherche un client par email et met à jour son user_id
 */
export const linkUserToClient = async (userId: string, userEmail: string): Promise<string | null> => {
  try {
    console.log(`Tentative d'association du compte ${userEmail} (${userId}) à un client`);
    
    // Vérifier si un client avec cet email existe déjà
    const { data: existingClient, error: clientError } = await supabase
      .from('clients')
      .select('id, name, user_id, email')
      .eq('email', userEmail)
      .maybeSingle();
    
    if (clientError && clientError.code !== 'PGRST116') {
      console.error("Erreur lors de la recherche du client:", clientError);
      return null;
    }
    
    // Si le client existe mais n'a pas d'user_id, mettre à jour
    if (existingClient) {
      console.log("Client trouvé:", existingClient);
      
      if (!existingClient.user_id) {
        console.log(`Association du client ${existingClient.id} avec l'utilisateur ${userId}`);
        
        const { error: updateError } = await supabase
          .from('clients')
          .update({ user_id: userId })
          .eq('id', existingClient.id);
          
        if (updateError) {
          console.error("Erreur lors de l'association:", updateError);
          return null;
        }
        
        toast.success(`Votre compte a été associé à ${existingClient.name}`);
        localStorage.setItem(`client_id_${userId}`, existingClient.id);
        return existingClient.id;
      } else if (existingClient.user_id !== userId) {
        console.log(`Le client est déjà associé à un autre utilisateur: ${existingClient.user_id}`);
        return null;
      } else {
        console.log("Le client est déjà associé à cet utilisateur");
        localStorage.setItem(`client_id_${userId}`, existingClient.id);
        return existingClient.id;
      }
    }
    
    // Cas spécial pour mistergi118@gmail.com - créer un client s'il n'existe pas
    if (userEmail === "mistergi118@gmail.com") {
      console.log("Création d'un nouveau client pour mistergi118@gmail.com");
      
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          name: "GI Test Client",
          email: userEmail,
          user_id: userId,
          status: 'active'
        })
        .select('id, name')
        .single();
        
      if (createError) {
        console.error("Erreur lors de la création du client:", createError);
        return null;
      }
      
      console.log("Nouveau client créé:", newClient);
      toast.success("Un nouveau compte client a été créé pour vous");
      localStorage.setItem(`client_id_${userId}`, newClient.id);
      return newClient.id;
    }
    
    return null;
  } catch (error) {
    console.error("Erreur dans linkUserToClient:", error);
    return null;
  }
};

/**
 * Force l'association pour tous les clients sans user_id qui ont un email correspondant à un utilisateur
 */
export const associateAllClientsWithUsers = async (): Promise<void> => {
  try {
    // Récupérer tous les clients sans user_id
    const { data: clientsWithoutUsers, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email')
      .is('user_id', null)
      .not('email', 'is', null);
      
    if (clientsError) {
      console.error("Erreur lors de la récupération des clients:", clientsError);
      return;
    }
    
    if (!clientsWithoutUsers || clientsWithoutUsers.length === 0) {
      console.log("Aucun client sans user_id trouvé");
      return;
    }
    
    console.log(`${clientsWithoutUsers.length} clients sans user_id trouvés`);
    
    // Pour chaque client, vérifier s'il existe un utilisateur avec le même email
    for (const client of clientsWithoutUsers) {
      if (!client.email) continue;
      
      const { data: user, error: userError } = await supabase.auth.admin.getUserByEmail(client.email);
      
      if (userError) {
        console.error(`Erreur lors de la recherche de l'utilisateur pour ${client.email}:`, userError);
        continue;
      }
      
      if (user) {
        console.log(`Association du client ${client.id} (${client.name}) avec l'utilisateur ${user.id}`);
        
        const { error: updateError } = await supabase
          .from('clients')
          .update({ user_id: user.id })
          .eq('id', client.id);
          
        if (updateError) {
          console.error(`Erreur lors de l'association pour ${client.id}:`, updateError);
        } else {
          console.log(`Client ${client.id} associé avec succès à l'utilisateur ${user.id}`);
        }
      } else {
        console.log(`Aucun utilisateur trouvé pour l'email ${client.email}`);
      }
    }
    
    toast.success("Association des clients terminée");
  } catch (error) {
    console.error("Erreur dans associateAllClientsWithUsers:", error);
    toast.error("Erreur lors de l'association des clients");
  }
};

/**
 * Récupère l'ID du client associé à un utilisateur
 */
export const getClientIdForUser = async (userId: string, userEmail: string | null): Promise<string | null> => {
  try {
    // Vérifier d'abord le cache local
    const cachedClientId = localStorage.getItem(`client_id_${userId}`);
    if (cachedClientId) {
      console.log("ID client trouvé en cache:", cachedClientId);
      return cachedClientId;
    }
    
    // Rechercher par user_id
    const { data: clientByUserId, error: userIdError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (userIdError && userIdError.code !== 'PGRST116') {
      console.error("Erreur lors de la recherche par user_id:", userIdError);
    }
    
    if (clientByUserId) {
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
