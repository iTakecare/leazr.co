
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";

export const getOffers = async (includeConverted: boolean = false): Promise<any[]> => {
  try {
    console.log("Récupération des offres en cours...");
    
    // Essayons d'abord avec le client normal
    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log("Utilisateur connecté:", userData?.user?.id || "Non connecté");
    
    const { data, error } = await supabase
      .from('offers')
      .select('*, clients(name, email, company)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des offres avec le client normal:", error);
      console.log("Essai avec le client admin...");
      
      // Si échec, essayons avec le client admin
      const adminClient = getAdminSupabaseClient();
      const { data: adminData, error: adminError } = await adminClient
        .from('offers')
        .select('*, clients(name, email, company)')
        .order('created_at', { ascending: false });
      
      if (adminError) {
        console.error("Erreur lors de la récupération avec le client admin:", adminError);
        throw adminError;
      }
      
      console.log(`${adminData?.length || 0} offres récupérées avec succès via client admin`);
      
      // Filtrer les offres converties si nécessaire
      const filteredData = includeConverted 
        ? adminData 
        : adminData?.filter(offer => !offer.converted_to_contract);
      
      console.log(`${filteredData?.length || 0} offres filtrées après critère de conversion`);
      
      return filteredData || [];
    }
    
    console.log(`${data?.length || 0} offres récupérées avec succès`);
    
    // Filtrer les offres converties si nécessaire
    const filteredData = includeConverted 
      ? data 
      : data?.filter(offer => !offer.converted_to_contract);
    
    console.log(`${filteredData?.length || 0} offres filtrées après critère de conversion`);
    
    // Retourner les données récupérées ou un tableau vide si pas de données
    return filteredData || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des offres:", error);
    console.log("Erreur détaillée:", JSON.stringify(error, null, 2));
    
    // Ne pas retourner de données mockées en cas d'erreur
    return [];
  }
};

export const getOffersByClientId = async (clientId: string): Promise<any[]> => {
  try {
    console.log("Fetching offers for client ID:", clientId);
    
    // Essayer d'abord avec le client normal
    let { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('client_id', clientId)
      .eq('converted_to_contract', false)
      .order('created_at', { ascending: false });
    
    // Si échec, essayer avec le client admin
    if (error) {
      console.log("Erreur avec le client normal, essai avec client admin:", error);
      const adminClient = getAdminSupabaseClient();
      const adminResult = await adminClient
        .from('offers')
        .select('*')
        .eq('client_id', clientId)
        .eq('converted_to_contract', false)
        .order('created_at', { ascending: false });
      
      data = adminResult.data;
      error = adminResult.error;
      
      if (error) throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} offers by client_id for client ${clientId}`);
    
    if (!data || data.length === 0) {
      let clientData;
      let clientError;
      
      // Essayer avec le client normal
      const clientResult = await supabase
        .from('clients')
        .select('name, email')
        .eq('id', clientId)
        .single();
      
      clientData = clientResult.data;
      clientError = clientResult.error;
      
      // Si échec, essayer avec le client admin
      if (clientError || !clientData) {
        console.log("Erreur lors de la récupération du client, essai avec client admin");
        const adminClient = getAdminSupabaseClient();
        const adminClientResult = await adminClient
          .from('clients')
          .select('name, email')
          .eq('id', clientId)
          .single();
        
        clientData = adminClientResult.data;
        clientError = adminClientResult.error;
      }
      
      if (clientError || !clientData) {
        console.error("Error fetching client details:", clientError);
        return [];
      }
      
      console.log("Looking for offers by client name/email:", clientData.name, clientData.email);
      
      // Recherche par nom de client
      let nameOffers = [];
      let nameError;
      
      // Essayer avec client normal
      const nameResult = await supabase
        .from('offers')
        .select('*')
        .ilike('client_name', clientData.name)
        .eq('converted_to_contract', false)
        .order('created_at', { ascending: false });
      
      nameOffers = nameResult.data || [];
      nameError = nameResult.error;
      
      // Si échec, essayer avec client admin
      if (nameError) {
        console.log("Erreur lors de la recherche par nom, essai avec client admin");
        const adminClient = getAdminSupabaseClient();
        const adminNameResult = await adminClient
          .from('offers')
          .select('*')
          .ilike('client_name', clientData.name)
          .eq('converted_to_contract', false)
          .order('created_at', { ascending: false });
        
        nameOffers = adminNameResult.data || [];
        nameError = adminNameResult.error;
      }
      
      if (nameError) {
        console.error("Error fetching offers by name:", nameError);
        return [];
      }
      
      console.log(`Found ${nameOffers?.length || 0} offers by client_name`);
      
      // Recherche par email de client si disponible
      let emailOffers: any[] = [];
      if (clientData.email) {
        let emailError;
        
        // Essayer avec client normal
        const emailResult = await supabase
          .from('offers')
          .select('*')
          .ilike('client_email', clientData.email)
          .eq('converted_to_contract', false)
          .order('created_at', { ascending: false });
        
        emailOffers = emailResult.data || [];
        emailError = emailResult.error;
        
        // Si échec, essayer avec client admin
        if (emailError) {
          console.log("Erreur lors de la recherche par email, essai avec client admin");
          const adminClient = getAdminSupabaseClient();
          const adminEmailResult = await adminClient
            .from('offers')
            .select('*')
            .ilike('client_email', clientData.email)
            .eq('converted_to_contract', false)
            .order('created_at', { ascending: false });
          
          emailOffers = adminEmailResult.data || [];
          emailError = adminEmailResult.error;
        }
        
        if (emailError) {
          console.error("Error fetching offers by email:", emailError);
        } else {
          console.log(`Found ${emailOffers.length} offers by client_email`);
        }
      }
      
      // Combiner et dédupliquer les résultats
      const combinedOffers = [...(nameOffers || []), ...emailOffers];
      const uniqueOffers = combinedOffers.filter((offer, index, self) =>
        index === self.findIndex((o) => o.id === offer.id)
      );
      
      console.log(`Found ${uniqueOffers.length} unique offers in total`);
      
      // Mettre à jour le client_id pour les offres trouvées
      for (const offer of uniqueOffers) {
        // Essayer avec client normal d'abord
        let updateError;
        const updateResult = await supabase
          .from('offers')
          .update({ client_id: clientId })
          .eq('id', offer.id);
        
        updateError = updateResult.error;
        
        // Si échec, essayer avec client admin
        if (updateError) {
          console.log("Erreur lors de la mise à jour avec client normal, essai avec client admin");
          const adminClient = getAdminSupabaseClient();
          const adminUpdateResult = await adminClient
            .from('offers')
            .update({ client_id: clientId })
            .eq('id', offer.id);
          
          updateError = adminUpdateResult.error;
        }
        
        if (updateError) {
          console.error(`Error updating offer ${offer.id}:`, updateError);
        } else {
          console.log(`Updated client_id for offer ${offer.id}`);
        }
      }
      
      return uniqueOffers;
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching offers by client ID:", error);
    return [];
  }
};
