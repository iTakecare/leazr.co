
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

// Import and re-export from other offer service files
export * from './offers';

// Explicitly re-export named exports that might conflict with star exports
export {
  generateAndDownloadOfferPdf,
  getOfferDataForPdf,
  generateSamplePdf,
  isOfferSigned,
  saveOfferSignature,
  generateSignatureLink
};
