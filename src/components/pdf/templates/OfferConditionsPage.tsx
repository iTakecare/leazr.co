import { Page, View, Text } from '@react-pdf/renderer';
import { stripHtmlTags } from '@/utils/htmlToPdfText';

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
  const defaultConditions = [
    "Les prix indiqués sont hors taxes et valables pour une durée de 30 jours.",
    "Le paiement s'effectue par mensualités selon les modalités convenues.",
    "La livraison est prévue dans un délai de 2 à 4 semaines après validation de la commande.",
    "Une garantie constructeur est incluse pour tous les équipements.",
    "L'installation et la mise en service sont comprises dans le tarif.",
    "Un support technique est disponible durant toute la durée du contrat.",
  ];

  // Parse conditions list from HTML
  const parseConditionsList = (html: string): string[] => {
    const items = html
      .split(/<li>|<\/li>|<br\s*\/?>/)
      .map(item => stripHtmlTags(item).trim())
      .filter(item => item.length > 0);
    return items.length > 0 ? items : defaultConditions;
  };

  const displayConditions = contentBlocks?.general_conditions
    ? parseConditionsList(contentBlocks.general_conditions)
    : conditions && conditions.length > 0 
      ? conditions 
      : defaultConditions;
  
  const additionalText = contentBlocks?.additional_info 
    ? stripHtmlTags(contentBlocks.additional_info)
    : additionalInfo;
  
  const contactText = contentBlocks?.contact_info
    ? stripHtmlTags(contentBlocks.contact_info)
    : 'Pour toute question concernant cette offre, n\'hésitez pas à nous contacter :';

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Conditions Générales</Text>

      <View style={{ marginTop: 15 }}>
        {displayConditions.map((condition, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.bullet}>{index + 1}.</Text>
            <Text style={styles.listContent}>{condition}</Text>
          </View>
        ))}
      </View>

      {additionalText && (
        <View style={{ marginTop: 25 }}>
          <Text style={styles.subtitle}>Informations Complémentaires</Text>
          <Text style={styles.text}>{additionalText}</Text>
        </View>
      )}

      {/* Contact Section */}
      <View style={{ ...styles.infoBox, marginTop: 30 }}>
        <Text style={styles.subtitle}>Contact</Text>
        <Text style={styles.text}>
          {contactText}
        </Text>
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
