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
      {/* Modern Header with gradient simulation */}
      <View style={{
        backgroundColor: colors.primary,
        padding: 25,
        marginTop: -40,
        marginHorizontal: -40,
        marginBottom: 30,
      }}>
        {companyLogoUrl && (
          <Image 
            src={companyLogoUrl} 
            style={{ width: 120, height: 'auto', objectFit: 'contain' }}
          />
        )}
        {!companyLogoUrl && (
          <Text style={{ color: '#ffffff', fontSize: 18, fontFamily: 'Helvetica-Bold' }}>
            {companyName}
          </Text>
        )}
        <View style={{ marginTop: 10 }}>
          {companyAddress && <Text style={{ color: '#ffffff', fontSize: 9, opacity: 0.9 }}>{companyAddress}</Text>}
          {companyVatNumber && <Text style={{ color: '#ffffff', fontSize: 9, opacity: 0.9 }}>TVA : {companyVatNumber}</Text>}
        </View>
      </View>

      {/* Main Title with Decorative Line */}
      <View style={{ marginTop: 40, marginBottom: 30, alignItems: 'center' }}>
        <Text style={{ ...styles.pageTitle, fontSize: 28 }}>OFFRE COMMERCIALE</Text>
        <View style={{ ...styles.decorativeLine, width: 100, marginTop: 10 }} />
      </View>

      {/* Offer Number Box - Elegant Design */}
      <View style={styles.offerNumberBox}>
        <Text style={styles.offerNumberLabel}>NUMÉRO D'OFFRE</Text>
        <Text style={styles.offerNumber}>{offerNumber}</Text>
        <Text style={styles.offerDate}>
          Émise le {new Date(offerDate).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
      </View>

      {/* Client Information - Enhanced */}
      <View style={{ ...styles.infoBox, marginTop: 30 }}>
        <Text style={{ ...styles.subtitle, color: colors.primary, marginBottom: 10 }}>Destinataire</Text>
        <Text style={{ ...styles.textBold, fontSize: 12 }}>
          {clientName}{clientCompany ? ` - ${clientCompany}` : ''}
        </Text>
        {clientAddress && <Text style={{ ...styles.text, marginTop: 8 }}>{clientAddress}</Text>}
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 8 }}>
          {clientEmail && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: colors.secondary, marginRight: 6 }}>✉</Text>
              <Text style={styles.textGray}>{clientEmail}</Text>
            </View>
          )}
          {clientPhone && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: colors.secondary, marginRight: 6 }}>☎</Text>
              <Text style={styles.textGray}>{clientPhone}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Introduction - Enhanced */}
      <View style={{ marginTop: 40 }}>
        <View style={{ ...styles.text, lineHeight: 1.6 }}>
          {renderHTMLAsPDF(greeting, styles)}
        </View>
        <View style={{ ...styles.text, marginTop: 15, lineHeight: 1.6 }}>
          {renderHTMLAsPDF(introduction, styles)}
        </View>
        <View style={{ ...styles.exampleBox, marginTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: colors.secondary, marginRight: 10 }}>⏱️</Text>
            <Text style={{ ...styles.text, fontFamily: 'Helvetica-Bold' }}>
              {renderHTMLAsPDF(validity, styles)}
            </Text>
          </View>
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
