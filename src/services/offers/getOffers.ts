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
    
    // Récupérer le company_id de l'utilisateur pour le filtrage explicite
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', authData.user!.id)
      .single();
    
    if (profileError || !profile?.company_id) {
      console.error("❌ Impossible de récupérer le company_id de l'utilisateur:", profileError);
      toast.error("Erreur lors de la récupération de votre entreprise.");
      return [];
    }
    
    console.log("🏢 Filtrage par company_id:", profile.company_id);
    
    // Construction de la requête de base avec toutes les jointures nécessaires
    // FILTRE EXPLICITE PAR company_id pour l'isolation des données
    let query = supabase
      .from('offers')
      .select(`
        *, 
        clients(name, email, company, business_sector, first_name, last_name),
        leasers(name),
        offer_equipment(id, title, purchase_price, quantity, margin, monthly_payment, selling_price, coefficient),
        offer_custom_packs(id, pack_name, discount_percentage),
        business_sector
      `)
      .eq('company_id', profile.company_id);
    
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
      console.log("⚠️ Aucune offre trouvée pour cette entreprise");
      
      // Debug: Vérifier le nombre total d'offres dans la base pour cette company
      const { count, error: countError } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);
        
      if (countError) {
        console.error("❌ Erreur lors du comptage:", countError);
      } else {
        console.log(`📊 Nombre total d'offres pour votre entreprise: ${count}`);
      }
      
      return [];
    }
    
    console.log(`✅ ${data.length} offres récupérées pour votre entreprise`);
    
    // Récupérer tous les documents récents (dernières 24h) avec leur timestamp
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentDocuments, error: docsError } = await supabase
      .from('offer_documents')
      .select('offer_id, uploaded_at')
      .gt('uploaded_at', twentyFourHoursAgo);
    
    if (docsError) {
      console.warn("⚠️ Erreur lors de la récupération des documents récents:", docsError);
    }
    
    // Récupérer les derniers workflow logs pour calculer la dernière activité
    const offerIds = data.map(o => o.id);
    const { data: workflowLogs, error: logsError } = await supabase
      .from('offer_workflow_logs')
      .select('offer_id, created_at')
      .in('offer_id', offerIds)
      .order('created_at', { ascending: false });
    
    if (logsError) {
      console.warn("⚠️ Erreur lors de la récupération des workflow logs:", logsError);
    }
    
    // Calculer le dernier log par offre
    const latestLogByOffer = new Map<string, string>();
    if (workflowLogs) {
      for (const log of workflowLogs) {
        if (!latestLogByOffer.has(log.offer_id)) {
          latestLogByOffer.set(log.offer_id, log.created_at);
        }
      }
    }
    
    // Récupérer le dernier document uploadé par offre (pour le calcul d'activité)
    const { data: latestDocs } = await supabase
      .from('offer_documents')
      .select('offer_id, uploaded_at')
      .in('offer_id', offerIds)
      .order('uploaded_at', { ascending: false });
    
    const latestDocByOffer = new Map<string, string>();
    if (latestDocs) {
      for (const doc of latestDocs) {
        if (!latestDocByOffer.has(doc.offer_id)) {
          latestDocByOffer.set(doc.offer_id, doc.uploaded_at);
        }
      }
    }
    
    // Enrichir chaque offre avec l'info has_recent_documents et last_activity_at
    // Un document est "non vu" s'il a été uploadé APRÈS la dernière consultation
    return data.map(offer => {
      const lastViewed = offer.documents_last_viewed_at;
      const hasUnviewedDocs = recentDocuments?.some(doc => 
        doc.offer_id === offer.id && 
        (!lastViewed || new Date(doc.uploaded_at) > new Date(lastViewed))
      ) || false;
      
      // last_activity_at = max(updated_at, dernier workflow log, dernier document uploadé)
      const updatedAtTime = new Date(offer.updated_at || offer.created_at).getTime();
      const lastLogTime = latestLogByOffer.has(offer.id) 
        ? new Date(latestLogByOffer.get(offer.id)!).getTime() 
        : 0;
      const lastDocTime = latestDocByOffer.has(offer.id)
        ? new Date(latestDocByOffer.get(offer.id)!).getTime()
        : 0;
      const lastActivityAt = new Date(Math.max(updatedAtTime, lastLogTime, lastDocTime)).toISOString();
      
      return {
        ...offer,
        has_recent_documents: hasUnviewedDocs,
        last_activity_at: lastActivityAt
      };
    });
  } catch (error) {
    console.error("❌ ERREUR complète lors de la récupération des offres:", error);
    toast.error("Erreur lors du chargement des offres.");
    return [];
  }
};

export const getOffersByClientId = async (clientId: string): Promise<any[]> => {
  try {
    console.log("Fetching offers for client ID:", clientId);
    
    // Récupérer le company_id de l'utilisateur pour le filtrage
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("❌ Utilisateur non authentifié");
      return [];
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile?.company_id) {
      console.error("❌ Impossible de récupérer le company_id:", profileError);
      return [];
    }
    
    // Filtrer par client_id ET company_id
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('client_id', clientId)
      .eq('company_id', profile.company_id)
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
        .eq('company_id', profile.company_id)
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
          .eq('company_id', profile.company_id)
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
