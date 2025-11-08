import { Page, View, Text, Image } from '@react-pdf/renderer';
import { colors } from '../styles/pdfStyles';
import { renderHTMLAsPDF } from '@/utils/htmlToPdfText';

interface OfferCoverPageProps {
  offerNumber: string;
  offerDate: string;
  clientName: string;
  clientCompany?: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  companyName: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyVatNumber?: string;
  companyLogoUrl?: string;
  contentBlocks?: {
    greeting?: string;
    introduction?: string;
    validity?: string;
  };
  styles: any;
}

export const OfferCoverPage: React.FC<OfferCoverPageProps> = ({
  offerNumber,
  offerDate,
  clientName,
  clientCompany,
  clientAddress,
  clientEmail,
  clientPhone,
  companyName,
  companyAddress,
  companyEmail,
  companyPhone,
  companyVatNumber,
  companyLogoUrl,
  contentBlocks,
  styles,
}) => {
  const greeting = contentBlocks?.greeting || 'Madame, Monsieur,';
  const introduction = contentBlocks?.introduction || 
    'Nous avons le plaisir de vous présenter notre proposition commerciale pour les équipements et services détaillés dans les pages suivantes.';
  const validity = contentBlocks?.validity || 
    'Cette offre est valable 30 jours à compter de la date d\'émission.';

  return (
    <Page size="A4" style={styles.page}>
      {/* Company Header with Gradient */}
      <View style={styles.headerGradient}>
        {companyLogoUrl && (
          <Image 
            src={companyLogoUrl} 
            style={{ ...styles.logo, marginBottom: 0 }}
          />
        )}
        {!companyLogoUrl && (
          <Text style={{ ...styles.companyName, color: colors.white }}>
            {companyName}
          </Text>
        )}
      </View>

      {/* Company Info */}
      <View style={{ paddingHorizontal: 40, marginTop: 15 }}>
        {companyAddress && <Text style={styles.companyInfo}>{companyAddress}</Text>}
        {companyEmail && <Text style={styles.companyInfo}>Email: {companyEmail}</Text>}
        {companyPhone && <Text style={styles.companyInfo}>Tél: {companyPhone}</Text>}
        {companyVatNumber && <Text style={styles.companyInfo}>N° TVA: {companyVatNumber}</Text>}
      </View>

      {/* Main Title with Decorative Line */}
      <View style={{ marginTop: 60, marginBottom: 40, alignItems: 'center' }}>
        <Text style={styles.pageTitle}>OFFRE COMMERCIALE</Text>
        <View style={styles.decorativeLine} />
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: colors.gray, marginBottom: 5 }}>
            N° {offerNumber}
          </Text>
          <Text style={{ fontSize: 12, color: colors.gray }}>
            Date: {new Date(offerDate).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </View>

      {/* Client Information */}
      <View style={styles.infoBox}>
        <Text style={styles.subtitle}>Destinataire</Text>
        <Text style={styles.textBold}>
          {clientName}{clientCompany ? ` - ${clientCompany}` : ''}
        </Text>
        {clientAddress && <Text style={{ ...styles.text, marginTop: 8 }}>{clientAddress}</Text>}
        {clientEmail && <Text style={styles.textGray}>Email: {clientEmail}</Text>}
        {clientPhone && <Text style={styles.textGray}>Tél: {clientPhone}</Text>}
      </View>

      {/* Introduction */}
      <View style={{ marginTop: 40 }}>
        <View style={styles.text}>
          {renderHTMLAsPDF(greeting, styles)}
        </View>
        <View style={{ ...styles.text, marginTop: 15 }}>
          {renderHTMLAsPDF(introduction, styles)}
        </View>
        <View style={{ ...styles.text, marginTop: 15 }}>
          {renderHTMLAsPDF(validity, styles)}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>{companyName}</Text>
        <Text>Page 1</Text>
      </View>
    </Page>
  );
};
