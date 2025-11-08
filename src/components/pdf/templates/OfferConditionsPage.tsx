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

  return (
    <Page size="A4" style={styles.page}>
      {/* Title with decorative line */}
      <Text style={styles.sectionTitle}>Conditions Générales</Text>
      <View style={styles.decorativeLine} />

      <View style={{ marginTop: 15 }}>
        {contentBlocks?.general_conditions 
          ? renderHTMLAsPDF(contentBlocks.general_conditions, styles)
          : <Text style={styles.text}>Aucune condition définie.</Text>
        }
      </View>

      {additionalText && (
        <View style={{ marginTop: 25 }}>
          <Text style={{ ...styles.subtitle, color: colors.primary, fontSize: 13, marginBottom: 10 }}>
            Informations Complémentaires
          </Text>
          <View style={styles.text}>
            {renderHTMLAsPDF(additionalText, styles)}
          </View>
        </View>
      )}

      {/* Contact Section with turquoise icons */}
      <View style={{ 
        ...styles.infoBox, 
        marginTop: 30,
        backgroundColor: colors.lightGray,
        borderLeftWidth: 4,
        borderLeftColor: colors.secondary,
        padding: 20,
        borderRadius: 8
      }}>
        <Text style={{ ...styles.subtitle, color: colors.primary, marginBottom: 12 }}>
          Contact
        </Text>
        
        <View style={{ marginBottom: 15 }}>
          {renderHTMLAsPDF(contactText, styles)}
        </View>
        
        {contactEmail && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ 
              color: colors.secondary, 
              fontSize: 16, 
              marginRight: 10,
              fontFamily: 'Helvetica-Bold'
            }}>
              ✉
            </Text>
            <Text style={{ ...styles.text, color: colors.dark }}>
              {contactEmail}
            </Text>
          </View>
        )}
        
        {contactPhone && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ 
              color: colors.secondary, 
              fontSize: 16, 
              marginRight: 10,
              fontFamily: 'Helvetica-Bold'
            }}>
              ☎
            </Text>
            <Text style={{ ...styles.text, color: colors.dark }}>
              {contactPhone}
            </Text>
          </View>
        )}
      </View>

      {/* Stylized Signature Box */}
      <View style={{ 
        marginTop: 50,
        padding: 25,
        backgroundColor: colors.white,
        borderWidth: 2,
        borderColor: colors.secondary,
        borderRadius: 8,
      }}>
        <Text style={{ 
          ...styles.text, 
          color: colors.dark,
          textAlign: 'center',
          marginBottom: 25 
        }}>
          Nous restons à votre disposition pour tout complément d'information.
        </Text>
        
        <View style={{ 
          width: '100%', 
          height: 2, 
          backgroundColor: colors.lightGray,
          marginVertical: 20 
        }} />
        
        <View style={{ alignItems: 'center' }}>
          <Text style={{ 
            ...styles.text, 
            fontStyle: 'italic',
            color: colors.gray,
            marginBottom: 30 
          }}>
            Signature
          </Text>
          
          <View style={{ 
            width: 200, 
            height: 1, 
            backgroundColor: colors.border,
            marginBottom: 20 
          }} />
          
          <Text style={{ 
            ...styles.textBold, 
            color: colors.primary,
            fontSize: 14 
          }}>
            L'équipe {companyName}
          </Text>
          
          <Text style={{ 
            ...styles.text, 
            color: colors.gray,
            fontSize: 9,
            marginTop: 10 
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
