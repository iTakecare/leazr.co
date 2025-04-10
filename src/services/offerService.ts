
import { supabase } from '@/integrations/supabase/client';
import { OfferData } from './offers/types';
import { sendInfoRequest, processInfoResponse, getWorkflowLogs } from './offers/offerWorkflow';
import { getOfferById, updateOffer, deleteOffer, updateOfferStatus, generateAndDownloadOfferPdf, getOfferNotes } from './offers/offerDetail';
import { generateSignatureLink } from './offers/offerSignature';
import { migrateEquipmentFromJson, forceMigrateEquipmentData as forceMigrateEquipment, getOfferEquipment as getEquipment } from './offers/offerEquipment';

// Re-export functions from other modules
export {
  sendInfoRequest,
  processInfoResponse,
  getWorkflowLogs,
  getOfferById,
  updateOffer,
  deleteOffer,
  updateOfferStatus,
  generateAndDownloadOfferPdf,
  getOfferNotes,
  generateSignatureLink,
  migrateEquipmentFromJson
};

/**
 * Create a new offer
 */
export const createOffer = async (offerData: OfferData) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .insert(offerData)
      .select('*');

    if (error) {
      console.error('Error creating offer:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in createOffer:', error);
    return { data: null, error };
  }
};

/**
 * Récupère tous les équipements d'une offre avec leurs attributs et spécifications
 */
export const getOfferEquipment = async (offerId: string) => {
  return getEquipment(offerId);
};

/**
 * Force la migration des données d'équipement pour une offre spécifique
 */
export const forceMigrateEquipmentData = async (offerId: string) => {
  return forceMigrateEquipment(offerId);
};
