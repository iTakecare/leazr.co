
import { supabase } from "@/integrations/supabase/client";

export interface OfferHistoryEvent {
  id?: string;
  offer_id: string;
  event_type: 'created' | 'modified' | 'status_changed' | 'note_added' | 'equipment_added' | 'equipment_removed' | 'client_interaction' | 'email_sent';
  description: string;
  details?: Record<string, any>;
  user_id?: string;
  user_name?: string;
  created_at?: string;
}

export const logOfferEvent = async (event: OfferHistoryEvent): Promise<boolean> => {
  try {
    console.log("📝 HISTORIQUE OFFRE - Ajout événement:", event);
    
    // Récupérer les informations de l'utilisateur si disponible
    let userName = event.user_name;
    if (event.user_id && !userName) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', event.user_id)
        .single();
      
      if (profile) {
        userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      }
    }
    
    const { error } = await supabase
      .from('offer_history')
      .insert({
        offer_id: event.offer_id,
        event_type: event.event_type,
        description: event.description,
        details: event.details || {},
        user_id: event.user_id,
        user_name: userName || 'Système'
      });
    
    if (error) {
      console.error("❌ Erreur lors de l'ajout de l'événement d'historique:", error);
      return false;
    }
    
    console.log("✅ Événement d'historique ajouté avec succès");
    return true;
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout de l'événement d'historique:", error);
    return false;
  }
};

export const getOfferHistory = async (offerId: string): Promise<OfferHistoryEvent[]> => {
  try {
    console.log("📖 HISTORIQUE OFFRE - Récupération pour l'offre:", offerId);
    
    const { data, error } = await supabase
      .from('offer_history')
      .select('*')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("❌ Erreur lors de la récupération de l'historique:", error);
      return [];
    }
    
    console.log("✅ Historique récupéré:", data?.length || 0, "événements");
    return data || [];
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de l'historique:", error);
    return [];
  }
};

export const logOfferCreation = async (offerId: string, userId: string, offerData: any): Promise<void> => {
  await logOfferEvent({
    offer_id: offerId,
    event_type: 'created',
    description: `Offre créée pour ${offerData.client_name}`,
    details: {
      client_name: offerData.client_name,
      client_email: offerData.client_email,
      amount: offerData.amount,
      monthly_payment: offerData.monthly_payment,
      type: offerData.type
    },
    user_id: userId
  });
};

export const logOfferModification = async (offerId: string, userId: string, changes: Record<string, any>): Promise<void> => {
  const changeDescriptions = Object.keys(changes).map(key => {
    const oldValue = changes[key].old;
    const newValue = changes[key].new;
    return `${key}: ${oldValue} → ${newValue}`;
  }).join(', ');
  
  await logOfferEvent({
    offer_id: offerId,
    event_type: 'modified',
    description: `Offre modifiée: ${changeDescriptions}`,
    details: changes,
    user_id: userId
  });
};

export const logStatusChange = async (offerId: string, userId: string, previousStatus: string, newStatus: string, reason?: string): Promise<void> => {
  await logOfferEvent({
    offer_id: offerId,
    event_type: 'status_changed',
    description: `Statut changé de "${previousStatus || 'draft'}" vers "${newStatus}"`,
    details: {
      previous_status: previousStatus,
      new_status: newStatus,
      reason: reason
    },
    user_id: userId
  });
};

export const logClientInteraction = async (offerId: string, interactionType: string, details?: Record<string, any>): Promise<void> => {
  await logOfferEvent({
    offer_id: offerId,
    event_type: 'client_interaction',
    description: `Interaction client: ${interactionType}`,
    details: details || {}
  });
};

export const logEmailSent = async (offerId: string, userId: string, emailType: string, recipient: string): Promise<void> => {
  await logOfferEvent({
    offer_id: offerId,
    event_type: 'email_sent',
    description: `Email envoyé (${emailType}) à ${recipient}`,
    details: {
      email_type: emailType,
      recipient: recipient
    },
    user_id: userId
  });
};
