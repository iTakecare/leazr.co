import { Document } from '@react-pdf/renderer';
import { OfferCoverPage } from './OfferCoverPage';
import { OfferEquipmentPage } from './OfferEquipmentPage';
import { OfferConditionsPage } from './OfferConditionsPage';
import { OfferEquipment } from '@/types/offerEquipment';

export interface OfferPDFData {
  id: string;
  offer_number: string;
  offer_date: string;
  client_name: string;
  client_address?: string;
  client_email?: string;
  client_phone?: string;
  equipment: OfferEquipment[];
  total_monthly_payment: number;
  total_margin?: number;
  conditions?: string[];
  additional_info?: string;
  company_name: string;
  company_address?: string;
  company_email?: string;
  company_phone?: string;
}

interface OfferPDFDocumentProps {
  offer: OfferPDFData;
  pdfType: 'client' | 'internal';
}

export const OfferPDFDocument: React.FC<OfferPDFDocumentProps> = ({ offer, pdfType }) => {
  return (
    <Document>
      {/* Page 1: Cover */}
      <OfferCoverPage
        offerNumber={offer.offer_number}
        offerDate={offer.offer_date}
        clientName={offer.client_name}
        clientAddress={offer.client_address}
        clientEmail={offer.client_email}
        clientPhone={offer.client_phone}
        companyName={offer.company_name}
        companyAddress={offer.company_address}
        companyEmail={offer.company_email}
        companyPhone={offer.company_phone}
      />

      {/* Page 2: Equipment Details */}
      <OfferEquipmentPage
        equipment={offer.equipment}
        pdfType={pdfType}
        totalMonthlyPayment={offer.total_monthly_payment}
        totalMargin={pdfType === 'internal' ? offer.total_margin : undefined}
        companyName={offer.company_name}
        pageNumber={2}
      />

      {/* Page 3: Conditions */}
      <OfferConditionsPage
        conditions={offer.conditions}
        additionalInfo={offer.additional_info}
        contactEmail={offer.company_email}
        contactPhone={offer.company_phone}
        companyName={offer.company_name}
        pageNumber={3}
      />
    </Document>
  );
};
