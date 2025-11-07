import { Page, View, Text, Image } from '@react-pdf/renderer';
import { colors } from '../styles/pdfStyles';

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
  companyLogoUrl?: string;
  styles: any;
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
  companyLogoUrl,
  styles,
}) => {
  return (
    <Page size="A4" style={styles.page}>
      {/* Company Header */}
      <View style={styles.header}>
        {companyLogoUrl && (
          <Image 
            src={companyLogoUrl} 
            style={styles.logo}
          />
        )}
        <Text style={styles.companyName}>{companyName}</Text>
        {companyAddress && <Text style={styles.companyInfo}>{companyAddress}</Text>}
        {companyEmail && <Text style={styles.companyInfo}>Email: {companyEmail}</Text>}
        {companyPhone && <Text style={styles.companyInfo}>Tél: {companyPhone}</Text>}
      </View>

      {/* Main Title */}
      <View style={{ marginTop: 60, marginBottom: 40, alignItems: 'center' }}>
        <Text style={styles.pageTitle}>OFFRE COMMERCIALE</Text>
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
        <Text style={styles.textBold}>{clientName}</Text>
        {clientAddress && <Text style={styles.text}>{clientAddress}</Text>}
        {clientEmail && <Text style={styles.textGray}>Email: {clientEmail}</Text>}
        {clientPhone && <Text style={styles.textGray}>Tél: {clientPhone}</Text>}
      </View>

      {/* Introduction */}
      <View style={{ marginTop: 40 }}>
        <Text style={styles.text}>
          Madame, Monsieur,
        </Text>
        <Text style={{ ...styles.text, marginTop: 15 }}>
          Nous avons le plaisir de vous présenter notre proposition commerciale pour les équipements 
          et services détaillés dans les pages suivantes.
        </Text>
        <Text style={{ ...styles.text, marginTop: 15 }}>
          Cette offre est valable 30 jours à compter de la date d'émission.
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>{companyName}</Text>
        <Text>Page 1</Text>
      </View>
    </Page>
  );
};
