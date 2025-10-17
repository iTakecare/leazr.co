import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OfferData } from "./types";

export const getOffers = async (includeConverted: boolean = false): Promise<any[]> => {
  try {
    console.log("🔍 RÉCUPÉRATION OFFRES - includeConverted:", includeConverted);
    
    // Get current authenticated user and session
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error("❌ Erreur d'authentification:", authError);
      return [];
    }
    
    console.log("👤 Utilisateur connecté:", authData.user?.id);
    console.log("📧 Email utilisateur:", authData.user?.email);
    console.log("🔑 Session présente:", !!session);
    console.log("🔑 Access token:", session?.access_token ? "présent" : "manquant");
    
    // Test de la fonction get_user_company_id_secure
    try {
      const { data: companyTest, error: companyError } = await supabase
        .rpc('get_user_company_id_secure');
      console.log("🏢 Test get_user_company_id_secure:", { 
        result: companyTest, 
        error: companyError?.message 
      });
    } catch (err) {
      console.log("🏢 Erreur test company_id:", err);
    }
    
    // Construction de la requête de base avec toutes les jointures nécessaires
    let query = supabase
      .from('offers')
      .select(`
        *, 
        clients(name, email, company, business_sector),
        leasers(name),
        offer_equipment(id, title, purchase_price, quantity, margin),
        business_sector
      `);
    
    // Appliquer le filtre uniquement si includeConverted est false
    if (!includeConverted) {
      query = query.eq('converted_to_contract', false);
    }
    
    // Trier par date de création (les plus récentes en premier)
    query = query.order('created_at', { ascending: false });
    
    console.log("🔍 RÉCUPÉRATION OFFRES - Exécution de la requête...");
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error("❌ Erreur lors de la récupération des offres:", error);
      throw error;
    }
    
    // Debug détaillé
    if (!data || data.length === 0) {
      console.log("⚠️ Aucune offre trouvée");
      
      // Debug: Vérifier le nombre total d'offres dans la base
      const { count, error: countError } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error("❌ Erreur lors du comptage:", countError);
      } else {
        console.log(`📊 Nombre total d'offres en base: ${count}`);
      }
      
      // Debug: Vérifier les offres par type
      const { data: adminOffers, error: adminError } = await supabase
        .from('offers')
        .select('id, type, client_name, created_at')
        .eq('type', 'admin_offer')
        .limit(5);
        
      if (!adminError && adminOffers) {
        console.log("🏢 Offres admin trouvées:", adminOffers);
      }
      
    } else {
      console.log(`✅ ${data.length} offres récupérées:`);
      data.forEach((offer, index) => {
        console.log(`  ${index + 1}. ID: ${offer.id} | Type: ${offer.type} | Client: ${offer.client_name} | Créée: ${offer.created_at}`);
      });
    }
    
    return data || [];
  } catch (error) {
    console.error("❌ ERREUR complète lors de la récupération des offres:", error);
    toast.error("Erreur lors du chargement des offres.");
    return [];
  }
};

export const getOffersByClientId = async (clientId: string): Promise<any[]> => {
  try {
    console.log("Fetching offers for client ID:", clientId);
    
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('client_id', clientId)
      .eq('converted_to_contract', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`Retrieved ${data?.length || 0} offers by client_id for client ${clientId}`);
    
    if (!data || data.length === 0) {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('name, email')
        .eq('id', clientId)
        .single();
        
      if (clientError || !clientData) {
        console.error("Error fetching client details:", clientError);
        return [];
      }
      
      console.log("Looking for offers by client name/email:", clientData.name, clientData.email);
      
      const { data: nameOffers, error: nameError } = await supabase
        .from('offers')
        .select('*')
        .ilike('client_name', clientData.name)
        .eq('converted_to_contract', false)
        .order('created_at', { ascending: false });
        
      if (nameError) {
        console.error("Error fetching offers by name:", nameError);
        return [];
      }
      
      console.log(`Found ${nameOffers?.length || 0} offers by client_name`);
      
      let emailOffers: any[] = [];
      if (clientData.email) {
        const { data: emailData, error: emailError } = await supabase
          .from('offers')
          .select('*')
          .ilike('client_email', clientData.email)
          .eq('converted_to_contract', false)
          .order('created_at', { ascending: false });
          
        if (emailError) {
          console.error("Error fetching offers by email:", emailError);
        } else {
          emailOffers = emailData || [];
          console.log(`Found ${emailOffers.length} offers by client_email`);
        }
      }
      
      const combinedOffers = [...(nameOffers || []), ...emailOffers];
      const uniqueOffers = combinedOffers.filter((offer, index, self) =>
        index === self.findIndex((o) => o.id === offer.id)
      );
      
      console.log(`Found ${uniqueOffers.length} unique offers in total`);
      
      for (const offer of uniqueOffers) {
        const { error: updateError } = await supabase
          .from('offers')
          .update({ client_id: clientId })
          .eq('id', offer.id);
          
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
