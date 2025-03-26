
// Exporter toutes les fonctions de services des offres
export * from './createOffer';
export * from './getOffers';
export * from './offerDetail';
export * from './offerStatus';
export * from './offerWorkflow';
export * from './clientRequests';

// Exportations spécifiques pour éviter l'ambiguïté
import { generateAndDownloadOfferPdf, getOfferDataForPdf, generateSamplePdf } from './offerPdf';
import { isOfferSigned, saveOfferSignature, generateSignatureLink } from './offerSignature';
import type { OfferData, Equipment } from './types';
import { OfferStatus, WorkflowStatus } from './types';

// Ré-exporter explicitement pour résoudre l'ambiguïté
export {
  generateAndDownloadOfferPdf,
  getOfferDataForPdf,
  generateSamplePdf,
  isOfferSigned,
  saveOfferSignature,
  generateSignatureLink,
  OfferStatus,
  WorkflowStatus
};

// Ré-exporter les types avec 'export type'
export type { OfferData, Equipment };
