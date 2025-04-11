
// This file re-exports all offer service functionality
// It provides backward compatibility while allowing for better code organization

// Import specific named exports from services
import { 
  generateAndDownloadOfferPdf, 
  getOfferDataForPdf, 
  generateSamplePdf 
} from './offers/offerPdf';

import { 
  isOfferSigned, 
  saveOfferSignature, 
  generateSignatureLink 
} from './offers/offerSignature';

import {
  deleteOffer,
  updateOfferStatus,
  getWorkflowHistory,
  getCompletedStatuses
} from './offers/offerStatus';

import {
  getWorkflowLogs,
  sendInfoRequest,
  processInfoResponse
} from './offers/offerWorkflow';

// Import and re-export from offer notes
import {
  getOfferNotes,
  addOfferNote
} from './offers/offerNotes';

// Import equipment service functions
import {
  getOfferEquipment,
  saveEquipment,
  migrateEquipmentFromJson,
  convertEquipmentToJson,
  forceMigrateEquipmentData
} from './offers/offerEquipment';

// Import and re-export from other offer service files
export * from './offers';

/**
 * Transforme un produit du catalogue en équipement pour une offre
 */
export const transformProductToEquipment = (
  product: any, 
  offerId: string,
  margin: number = 20,
  quantity: number = 1,
  monthlyPayment?: number
) => {
  if (!product) return null;
  
  console.log("Transforming product to equipment:", product);
  
  // Données de base de l'équipement
  const equipment = {
    offer_id: offerId,
    title: product.name,
    purchase_price: Number(product.price) || 0,
    quantity: quantity,
    margin: margin,
    monthly_payment: monthlyPayment || product.monthly_price,
    serial_number: product.sku || null
  };
  
  // Extraire les attributs du produit
  const attributes: Record<string, string> = {};
  if (product.attributes && typeof product.attributes === 'object') {
    Object.entries(product.attributes).forEach(([key, value]) => {
      attributes[key] = String(value);
    });
  }
  
  // Extraire les spécifications du produit
  const specifications: Record<string, string> = {};
  if (product.specifications && typeof product.specifications === 'object') {
    Object.entries(product.specifications).forEach(([key, value]) => {
      specifications[key] = String(value);
    });
  }
  
  console.log("Transformed equipment:", {
    equipment,
    attributes,
    specifications
  });
  
  return {
    equipment,
    attributes,
    specifications
  };
};

// Explicitly re-export named exports that might conflict with star exports
export {
  generateAndDownloadOfferPdf,
  getOfferDataForPdf,
  generateSamplePdf,
  isOfferSigned,
  saveOfferSignature,
  generateSignatureLink,
  deleteOffer,
  updateOfferStatus,
  getWorkflowHistory,
  getCompletedStatuses,
  getWorkflowLogs,
  sendInfoRequest,
  processInfoResponse,
  getOfferNotes,
  addOfferNote,
  // Export les fonctions d'équipement
  getOfferEquipment,
  saveEquipment,
  migrateEquipmentFromJson,
  convertEquipmentToJson,
  forceMigrateEquipmentData,
  // Nouvel export
  transformProductToEquipment
};

// Export functions from offerDetail directly
export * from './offers/offerDetail';

// Export utility functions
export { translateOfferType, hasCommission } from '@/utils/offerTypeTranslator';
