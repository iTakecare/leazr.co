import { Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../styles/pdfStyles';

interface OfferConditionsPageProps {
  conditions?: string[];
  additionalInfo?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyName: string;
  pageNumber: number;
}

export const OfferConditionsPage: React.FC<OfferConditionsPageProps> = ({
  conditions,
  additionalInfo,
  contactEmail,
  contactPhone,
  companyName,
  pageNumber,
}) => {
  const defaultConditions = [
    "Les prix indiqués sont hors taxes et valables pour une durée de 30 jours.",
    "Le paiement s'effectue par mensualités selon les modalités convenues.",
    "La livraison est prévue dans un délai de 2 à 4 semaines après validation de la commande.",
    "Une garantie constructeur est incluse pour tous les équipements.",
    "L'installation et la mise en service sont comprises dans le tarif.",
    "Un support technique est disponible durant toute la durée du contrat.",
  ];

  const displayConditions = conditions && conditions.length > 0 ? conditions : defaultConditions;

  return (
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.sectionTitle}>Conditions Générales</Text>

      <View style={{ marginTop: 15 }}>
        {displayConditions.map((condition, index) => (
          <View key={index} style={pdfStyles.listItem}>
            <Text style={pdfStyles.bullet}>{index + 1}.</Text>
            <Text style={pdfStyles.listContent}>{condition}</Text>
          </View>
        ))}
      </View>

      {additionalInfo && (
        <View style={{ marginTop: 25 }}>
          <Text style={pdfStyles.subtitle}>Informations Complémentaires</Text>
          <Text style={pdfStyles.text}>{additionalInfo}</Text>
        </View>
      )}

      {/* Contact Section */}
      <View style={{ ...pdfStyles.infoBox, marginTop: 30 }}>
        <Text style={pdfStyles.subtitle}>Contact</Text>
        <Text style={pdfStyles.text}>
          Pour toute question concernant cette offre, n'hésitez pas à nous contacter :
        </Text>
        {contactEmail && (
          <Text style={{ ...pdfStyles.text, marginTop: 5 }}>
            Email: {contactEmail}
          </Text>
        )}
        {contactPhone && (
          <Text style={{ ...pdfStyles.text, marginTop: 2 }}>
            Téléphone: {contactPhone}
          </Text>
        )}
      </View>

      {/* Signature Section */}
      <View style={{ marginTop: 40 }}>
        <Text style={pdfStyles.text}>
          Nous restons à votre disposition pour tout complément d'information.
        </Text>
        <Text style={{ ...pdfStyles.text, marginTop: 20 }}>
          Cordialement,
        </Text>
        <Text style={{ ...pdfStyles.textBold, marginTop: 10 }}>
          L'équipe {companyName}
        </Text>
      </View>

      {/* Footer */}
      <View style={pdfStyles.footer}>
        <Text>{companyName}</Text>
        <Text>Page {pageNumber}</Text>
      </View>
    </Page>
  );
};
