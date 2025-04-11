
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
  generateSignatureLink,
  getOfferForClient
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

// Explicitly re-export the non-conflicting functions
export {
  generateAndDownloadOfferPdf,
  getOfferDataForPdf,
  generateSamplePdf,
  isOfferSigned,
  saveOfferSignature,
  generateSignatureLink,
  getOfferForClient,
  deleteOffer,
  updateOfferStatus,
  getWorkflowHistory,
  getCompletedStatuses,
  getWorkflowLogs,
  sendInfoRequest,
  processInfoResponse,
  getOfferNotes,
  addOfferNote,
  getOfferEquipment,
  saveEquipment,
  migrateEquipmentFromJson,
  convertEquipmentToJson,
  forceMigrateEquipmentData
};

// Now export the getOfferById function exclusively from offerDetail
export { getOfferById, updateOffer } from './offers/offerDetail';

// Export utility functions
export { translateOfferType, hasCommission } from '@/utils/offerTypeTranslator';

// Export from index separately but exclude the functions that might cause conflicts
export * from './offers';
