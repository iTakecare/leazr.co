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

  const colors = {
    primary: '#33638e',
    secondary: '#4ab6c4',
    lightGray: '#e8f4f8',
    white: '#ffffff',
    dark: '#2c3e50',
    gray: '#6b7280',
    border: '#c5e5ed',
  };

  // Parse HTML conditions into structured sections
  const parseConditions = (html: string) => {
    // This is a simplified parser - you can enhance based on your HTML structure
    return html;
  };

  return (
    <Page size="A4" style={styles.page}>
      {/* Title with decorative line */}
      <Text style={styles.sectionTitle}>Conditions Générales</Text>
      <View style={styles.decorativeLine} />

      {/* Section 1 : Modalités de Paiement */}
      <View style={styles.conditionSection}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={styles.sectionIconText}>💳</Text>
          <Text style={styles.sectionHeaderConditions}>MODALITÉS DE PAIEMENT</Text>
        </View>
        
        <View style={{ paddingLeft: 30 }}>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listContent}>Prélèvement automatique mensuel sur compte bancaire</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listContent}>Premier paiement à J+30 après livraison</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listContent}>Mandat SEPA requis avant activation</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listContent}>En cas de retard de paiement, des pénalités pourront être appliquées</Text>
          </View>
        </View>
      </View>

      {/* Section 2 : Assurance */}
      <View style={styles.conditionSection}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={styles.sectionIconText}>🛡️</Text>
          <Text style={styles.sectionHeaderConditions}>ASSURANCE</Text>
        </View>
        
        <View style={{ paddingLeft: 30 }}>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listContent}>
              Couverture casse et vol incluse
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listContent}>Franchise applicable selon les conditions générales</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listContent}>Déclaration de sinistre sous 48h obligatoire</Text>
          </View>
        </View>
      </View>

      {/* Section 3 : Durée du Contrat */}
      <View style={styles.conditionSection}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={styles.sectionIconText}>⏱️</Text>
          <Text style={styles.sectionHeaderConditions}>DURÉE DU CONTRAT</Text>
        </View>
        
        <View style={{ paddingLeft: 30 }}>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listContent}>Durée déterminée selon l'offre souscrite</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listContent}>Pas de tacite reconduction</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listContent}>Résiliation anticipée : indemnités applicables selon conditions générales</Text>
          </View>
        </View>
      </View>

      {/* Section 4 : Fin de Contrat avec box colorée */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={styles.sectionIconText}>✅</Text>
          <Text style={styles.sectionHeaderConditions}>FIN DE CONTRAT</Text>
        </View>
        
        <Text style={{ fontSize: 9, marginBottom: 10, paddingLeft: 30 }}>
          À l'issue du contrat, vous avez le choix entre 3 options :
        </Text>
        
        <View style={styles.exampleBox}>
          <View style={styles.listItem}>
            <Text style={{ ...styles.bullet, fontFamily: 'Helvetica-Bold' }}>1.</Text>
            <Text style={styles.listContent}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Achat définitif</Text> : rachat du matériel à valeur résiduelle (généralement 5% de la valeur initiale)
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={{ ...styles.bullet, fontFamily: 'Helvetica-Bold' }}>2.</Text>
            <Text style={styles.listContent}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Renouvellement</Text> : échange contre du matériel neuf avec nouveau contrat
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={{ ...styles.bullet, fontFamily: 'Helvetica-Bold' }}>3.</Text>
            <Text style={styles.listContent}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Restitution</Text> : retour gratuit du matériel, sans frais supplémentaires
            </Text>
          </View>
        </View>
      </View>

      {/* Additional General Conditions */}
      {contentBlocks?.general_conditions && (
        <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 2, borderTopColor: colors.border }}>
          <Text style={{ ...styles.subtitle, color: colors.primary, fontSize: 12, marginBottom: 10 }}>
            Conditions Générales Détaillées
          </Text>
          <View style={{ fontSize: 9, lineHeight: 1.6 }}>
            {renderHTMLAsPDF(contentBlocks.general_conditions, styles)}
          </View>
        </View>
      )}

      {additionalText && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ ...styles.subtitle, color: colors.primary, fontSize: 12, marginBottom: 10 }}>
            Informations Complémentaires
          </Text>
          <View style={styles.text}>
            {renderHTMLAsPDF(additionalText, styles)}
          </View>
        </View>
      )}

      {/* CTA Box - "Prêt à démarrer ?" */}
      <View style={styles.ctaBox}>
        <Text style={styles.ctaTitle}>Prêt à démarrer ?</Text>
        <Text style={styles.ctaText}>
          Contactez-nous pour finaliser votre offre et commencer votre leasing
        </Text>
      </View>

      {/* Contact Section - Modern Design */}
      <View style={styles.contactBox}>
        <Text style={styles.contactTitle}>Vos contacts iTakecare</Text>
        
        {contactEmail && (
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>✉</Text>
            <View>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>{contactEmail}</Text>
            </View>
          </View>
        )}
        
        {contactPhone && (
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>☎</Text>
            <View>
              <Text style={styles.contactLabel}>Téléphone</Text>
              <Text style={styles.contactValue}>{contactPhone}</Text>
            </View>
          </View>
        )}
        
        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>🌐</Text>
          <View>
            <Text style={styles.contactLabel}>Site web</Text>
            <Text style={{ ...styles.contactValue, color: colors.primary }}>
              www.itakecare.be
            </Text>
          </View>
        </View>
      </View>

      {/* Stylized Signature Box */}
      <View style={{ 
        marginTop: 30,
        padding: 20,
        backgroundColor: colors.white,
        borderWidth: 2,
        borderColor: colors.secondary,
        borderRadius: 8,
      }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ 
            ...styles.text, 
            fontStyle: 'italic',
            color: colors.gray,
            marginBottom: 20 
          }}>
            Signature
          </Text>
          
          <View style={{ 
            width: 200, 
            height: 1, 
            backgroundColor: colors.border,
            marginBottom: 15 
          }} />
          
          <Text style={{ 
            ...styles.textBold, 
            color: colors.primary,
            fontSize: 13 
          }}>
            L'équipe {companyName}
          </Text>
          
          <Text style={{ 
            ...styles.text, 
            color: colors.gray,
            fontSize: 8,
            marginTop: 8 
          }}>
            {new Date().toLocaleDateString('fr-FR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>{companyName}</Text>
        <Text>Page {pageNumber}</Text>
      </View>
    </Page>
  );
};
