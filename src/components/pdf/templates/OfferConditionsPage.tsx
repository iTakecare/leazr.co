import { Page, View, Text } from '@react-pdf/renderer';
import { renderHTMLAsPDF } from '@/utils/htmlToPdfText';

interface OfferConditionsPageProps {
  conditions?: string[];
  additionalInfo?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyName: string;
  pageNumber: number;
  contentBlocks?: {
    general_conditions?: string;
    additional_info?: string;
    contact_info?: string;
  };
  styles: any;
}

export const OfferConditionsPage: React.FC<OfferConditionsPageProps> = ({
  conditions,
  additionalInfo,
  contactEmail,
  contactPhone,
  companyName,
  pageNumber,
  contentBlocks,
  styles,
}) => {
  const additionalText = contentBlocks?.additional_info
    ? contentBlocks.additional_info
    : additionalInfo;
  
  const contactText = contentBlocks?.contact_info
    ? contentBlocks.contact_info
    : 'Pour toute question concernant cette offre, n\'hésitez pas à nous contacter :';

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Conditions Générales</Text>

      <View style={{ marginTop: 15 }}>
        {contentBlocks?.general_conditions 
          ? renderHTMLAsPDF(contentBlocks.general_conditions, styles)
          : <Text style={styles.text}>Aucune condition définie.</Text>
        }
      </View>

      {additionalText && (
        <View style={{ marginTop: 25 }}>
          <Text style={styles.subtitle}>Informations Complémentaires</Text>
          <View style={styles.text}>
            {renderHTMLAsPDF(additionalText, styles)}
          </View>
        </View>
      )}

      {/* Contact Section */}
      <View style={{ ...styles.infoBox, marginTop: 30 }}>
        <Text style={styles.subtitle}>Contact</Text>
        <View style={styles.text}>
          {renderHTMLAsPDF(contactText, styles)}
        </View>
        {contactEmail && (
          <Text style={{ ...styles.text, marginTop: 5 }}>
            Email: {contactEmail}
          </Text>
        )}
        {contactPhone && (
          <Text style={{ ...styles.text, marginTop: 2 }}>
            Téléphone: {contactPhone}
          </Text>
        )}
      </View>

      {/* Signature Section */}
      <View style={{ marginTop: 40 }}>
        <Text style={styles.text}>
          Nous restons à votre disposition pour tout complément d'information.
        </Text>
        <Text style={{ ...styles.text, marginTop: 20 }}>
          Cordialement,
        </Text>
        <Text style={{ ...styles.textBold, marginTop: 10 }}>
          L'équipe {companyName}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>{companyName}</Text>
        <Text>Page {pageNumber}</Text>
      </View>
    </Page>
  );
};
