import { Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles, colors } from '../styles/pdfStyles';

interface OfferCoverPageProps {
  offerNumber: string;
  offerDate: string;
  clientName: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  companyName: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
}

export const OfferCoverPage: React.FC<OfferCoverPageProps> = ({
  offerNumber,
  offerDate,
  clientName,
  clientAddress,
  clientEmail,
  clientPhone,
  companyName,
  companyAddress,
  companyEmail,
  companyPhone,
}) => {
  return (
    <Page size="A4" style={pdfStyles.page}>
      {/* Company Header */}
      <View style={pdfStyles.header}>
        <Text style={pdfStyles.companyName}>{companyName}</Text>
        {companyAddress && <Text style={pdfStyles.companyInfo}>{companyAddress}</Text>}
        {companyEmail && <Text style={pdfStyles.companyInfo}>Email: {companyEmail}</Text>}
        {companyPhone && <Text style={pdfStyles.companyInfo}>Tél: {companyPhone}</Text>}
      </View>

      {/* Main Title */}
      <View style={{ marginTop: 60, marginBottom: 40, alignItems: 'center' }}>
        <Text style={pdfStyles.pageTitle}>OFFRE COMMERCIALE</Text>
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
      <View style={pdfStyles.infoBox}>
        <Text style={pdfStyles.subtitle}>Destinataire</Text>
        <Text style={pdfStyles.textBold}>{clientName}</Text>
        {clientAddress && <Text style={pdfStyles.text}>{clientAddress}</Text>}
        {clientEmail && <Text style={pdfStyles.textGray}>Email: {clientEmail}</Text>}
        {clientPhone && <Text style={pdfStyles.textGray}>Tél: {clientPhone}</Text>}
      </View>

      {/* Introduction */}
      <View style={{ marginTop: 40 }}>
        <Text style={pdfStyles.text}>
          Madame, Monsieur,
        </Text>
        <Text style={{ ...pdfStyles.text, marginTop: 15 }}>
          Nous avons le plaisir de vous présenter notre proposition commerciale pour les équipements 
          et services détaillés dans les pages suivantes.
        </Text>
        <Text style={{ ...pdfStyles.text, marginTop: 15 }}>
          Cette offre est valable 30 jours à compter de la date d'émission.
        </Text>
      </View>

      {/* Footer */}
      <View style={pdfStyles.footer}>
        <Text>{companyName}</Text>
        <Text>Page 1</Text>
      </View>
    </Page>
  );
};
