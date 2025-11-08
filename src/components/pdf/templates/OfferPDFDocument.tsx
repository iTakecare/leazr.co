import { Document } from '@react-pdf/renderer';
import { OfferCoverPage } from './OfferCoverPage';
import { OfferEquipmentPage } from './OfferEquipmentPage';
import { OfferConditionsPage } from './OfferConditionsPage';
import { OfferValuesPage } from './OfferValuesPage';
import { OfferEquipment } from '@/types/offerEquipment';
import { createOfferPdfStyles } from '../styles/pdfStyles';

export interface OfferPDFData {
  id: string;
  offer_number: string;
  offer_date: string;
  client_name: string;
  client_company?: string;
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
  company_vat_number?: string;
  company_logo_url?: string;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  brand_accent_color?: string;
  // Values page data
  values?: Array<{
    title: string;
    description: string;
    icon_url?: string;
  }>;
  metrics?: Array<{
    label: string;
    value: string;
    icon_name?: string;
  }>;
  partner_logos?: Array<{
    name: string;
    logo_url: string;
  }>;
  // Financial fields
  file_fee?: number;
  annual_insurance?: number;
  contract_duration?: number;
  contract_terms?: string;
  // Editable content blocks
  content_blocks?: {
    cover_greeting?: string;
    cover_introduction?: string;
    cover_validity?: string;
    equipment_title?: string;
    equipment_footer_note?: string;
    conditions_general_conditions?: string;
    conditions_additional_info?: string;
    conditions_contact_info?: string;
  };
}

interface OfferPDFDocumentProps {
  offer: OfferPDFData;
  pdfType: 'client' | 'internal';
}

export const OfferPDFDocument: React.FC<OfferPDFDocumentProps> = ({ offer, pdfType }) => {
  // Create dynamic styles with brand colors
  const styles = createOfferPdfStyles({
    primary: offer.brand_primary_color || '#2563eb',
  });

  return (
    <Document>
      {/* Page 1: Cover */}
      <OfferCoverPage
        offerNumber={offer.offer_number}
        offerDate={offer.offer_date}
        clientName={offer.client_name}
        clientCompany={offer.client_company}
        clientAddress={offer.client_address}
        clientEmail={offer.client_email}
        clientPhone={offer.client_phone}
        companyName={offer.company_name}
        companyAddress={offer.company_address}
        companyEmail={offer.company_email}
        companyPhone={offer.company_phone}
        companyVatNumber={offer.company_vat_number}
        companyLogoUrl={offer.company_logo_url}
        contentBlocks={{
          greeting: offer.content_blocks?.cover_greeting,
          introduction: offer.content_blocks?.cover_introduction,
          validity: offer.content_blocks?.cover_validity,
        }}
        styles={styles}
      />

      {/* Page 2: Equipment Details */}
      <OfferEquipmentPage
        equipment={offer.equipment}
        pdfType={pdfType}
        totalMonthlyPayment={offer.total_monthly_payment}
        totalMargin={pdfType === 'internal' ? offer.total_margin : undefined}
        companyName={offer.company_name}
        pageNumber={2}
        fileFee={offer.file_fee}
        annualInsurance={offer.annual_insurance}
        contractDuration={offer.contract_duration}
        contractTerms={offer.contract_terms}
        contentBlocks={{
          title: offer.content_blocks?.equipment_title,
          footer_note: offer.content_blocks?.equipment_footer_note,
        }}
        styles={styles}
      />

      {/* Page 3: Conditions */}
      <OfferConditionsPage
        conditions={offer.conditions}
        additionalInfo={offer.additional_info}
        contactEmail={offer.company_email}
        contactPhone={offer.company_phone}
        companyName={offer.company_name}
        pageNumber={3}
        contentBlocks={{
          general_conditions: offer.content_blocks?.conditions_general_conditions,
          additional_info: offer.content_blocks?.conditions_additional_info,
          contact_info: offer.content_blocks?.conditions_contact_info,
        }}
        styles={styles}
      />

      {/* Page 4: Values (conditional) */}
      {(offer.values?.length > 0 || offer.metrics?.length > 0 || offer.partner_logos?.length > 0) && (
        <OfferValuesPage
          values={offer.values || []}
          metrics={offer.metrics || []}
          partnerLogos={offer.partner_logos || []}
          companyName={offer.company_name}
          pageNumber={4}
          styles={styles}
        />
      )}
    </Document>
  );
};
