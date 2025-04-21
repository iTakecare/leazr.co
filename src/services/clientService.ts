
/**
 * Récupère tous les clients
 * @returns Liste des clients
 */
export const getAllClients = async (showAmbassadorClients: boolean = false): Promise<Client[]> => {
  try {
    console.log(`Récupération des clients avec filtre ambassadeur: ${showAmbassadorClients}`);
    
    if (showAmbassadorClients) {
      // Récupérer les clients des ambassadeurs
      const { data, error } = await supabase
        .from('ambassador_clients')
        .select(`
          client_id,
          clients:client_id (*)
        `);

      if (error) {
        console.error("Erreur lors de la récupération des clients des ambassadeurs:", error);
        throw error;
      }

      // Extraire les données des clients depuis la réponse imbriquée
      const ambassadorClients = data?.map(item => ({
        ...item.clients,
        is_ambassador_client: true
      })) || [];
      
      console.log(`${ambassadorClients.length} clients d'ambassadeurs trouvés:`, ambassadorClients);
      return ambassadorClients;
    } else {
      // Récupérer tous les clients standard
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erreur lors de la récupération des clients:", error);
        throw error;
      }

      // Récupérer les IDs des clients des ambassadeurs pour les filtrer
      const { data: ambassadorClientLinks, error: ambassadorError } = await supabase
        .from('ambassador_clients')
        .select('client_id');

      if (ambassadorError) {
        console.error("Erreur lors de la récupération des liens clients-ambassadeurs:", ambassadorError);
        throw ambassadorError;
      }

      // Extraire les IDs des clients des ambassadeurs
      const ambassadorClientIds = ambassadorClientLinks?.map(link => link.client_id) || [];
      
      console.log("IDs des clients d'ambassadeurs à exclure:", ambassadorClientIds);
      
      // Filtrer pour exclure les clients des ambassadeurs
      const filteredClients = data?.filter(
        client => !ambassadorClientIds.includes(client.id)
      ) || [];
      
      console.log(`${filteredClients.length} clients standards trouvés sur ${data?.length || 0} clients totaux`);
      console.log(`${ambassadorClientIds.length} clients d'ambassadeurs exclus`);
      
      return filteredClients;
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des clients:", error);
    throw error;
  }
};
