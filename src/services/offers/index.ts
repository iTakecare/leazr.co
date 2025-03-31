
// Exporter toutes les fonctions de services des offres
export * from './createOffer';
export * from './getOffers';
export * from './offerDetail';
export * from './offerStatus';
export * from './offerWorkflow';
export * from './clientRequests';
export * from './types';

// Exportations spécifiques pour éviter l'ambiguïté
import { generateAndDownloadOfferPdf, getOfferDataForPdf, generateSamplePdf } from './offerPdf';
import { isOfferSigned, saveOfferSignature, generateSignatureLink } from './offerSignature';

// Ré-exporter explicitement pour résoudre l'ambiguïté
export {
  generateAndDownloadOfferPdf,
  getOfferDataForPdf,
  generateSamplePdf,
  isOfferSigned,
  saveOfferSignature,
  generateSignatureLink
};
