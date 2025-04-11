
// This file re-exports all offer service functionality
// It provides backward compatibility while allowing for better code organization

// Import specific named exports from services
import { 
  generateAndDownloadOfferPdf as pdfGenerateAndDownload, 
  getOfferDataForPdf as pdfGetOfferData, 
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

// Explicitly re-export named exports with aliases to avoid conflicts
export {
  pdfGenerateAndDownload as generateAndDownloadOfferPdf,
  pdfGetOfferData as getOfferDataForPdf,
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
  // Export functions related to equipment
  getOfferEquipment,
  saveEquipment,
  migrateEquipmentFromJson,
  convertEquipmentToJson,
  forceMigrateEquipmentData
};

// Export functions from offerDetail directly
export * from './offers/offerDetail';

// Export utility functions
export { translateOfferType, hasCommission } from '@/utils/offerTypeTranslator';
