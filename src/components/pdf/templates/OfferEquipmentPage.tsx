import { Page, View, Text, Image } from '@react-pdf/renderer';
import { renderHTMLAsPDF } from '@/utils/htmlToPdfText';
import { colors } from '../styles/pdfStyles';
import { OfferEquipment } from '@/types/offerEquipment';
import { getCategoryEmoji, getProductImage } from '@/utils/productImageMapper';
import { stripHtmlTags } from '@/utils/htmlToPdfText';

interface OfferEquipmentPageProps {
  equipment: OfferEquipment[];
  pdfType: 'client' | 'internal';
  totalMonthlyPayment: number;
  totalMargin?: number;
  companyName: string;
  pageNumber: number;
  fileFee?: number;
  annualInsurance?: number;
  contractDuration?: number;
  contractTerms?: string;
  contentBlocks?: {
    title?: string;
    footer_note?: string;
  };
  styles: any;
}

export const OfferEquipmentPage: React.FC<OfferEquipmentPageProps> = ({
  equipment,
  pdfType,
  totalMonthlyPayment,
  totalMargin,
  companyName,
  pageNumber,
  fileFee = 0,
  annualInsurance = 0,
  contractDuration = 36,
  contractTerms = 'Livraison incluse - Maintenance incluse - Garantie en échange direct incluse',
  contentBlocks,
  styles,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const isInternal = pdfType === 'internal';
  const title = contentBlocks?.title || 'Détail des Équipements';

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.sectionTitle}>
        {renderHTMLAsPDF(title, styles)}
      </View>

      {/* Equipment Cards (Modern Design) */}
      <View style={{ marginTop: 15 }}>
        {equipment.map((item, index) => {
          const productImage = getProductImage(item.title);
          const categoryEmoji = getCategoryEmoji(item.title);
          
          // Filter specifications to remove duplicates with attributes
          const attributeKeys = item.attributes?.map(attr => attr.key.toLowerCase()) || [];
          const uniqueSpecs = item.specifications?.filter(
            spec => !attributeKeys.includes(spec.key.toLowerCase())
          ) || [];

          return (
            <View key={item.id} style={styles.equipmentCard}>
              {/* Layout horizontal : image + contenu */}
              <View style={{ flexDirection: 'row', gap: 20 }}>
                
                {/* Image produit (gauche) */}
                {productImage ? (
                  <View style={{ width: 120, height: 120 }}>
                    <Image 
                      src={productImage} 
                      style={styles.productImage}
                    />
                  </View>
                ) : (
                  <View style={{
                    width: 120,
                    height: 120,
                    backgroundColor: colors.lightGray,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 48 }}>{categoryEmoji}</Text>
                  </View>
                )}
                
                {/* Contenu (droite) */}
                <View style={{ flex: 1 }}>
                  {/* Titre + badge catégorie */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, marginRight: 8 }}>{categoryEmoji}</Text>
                    <Text style={styles.productTitle}>
                      {item.title}
                    </Text>
                  </View>
                  
                  {/* Attributs (CPU, RAM, etc.) */}
                  {item.attributes && item.attributes.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {item.attributes.map((attr, i) => (
                        <View key={i} style={styles.badge}>
                          <Text>{attr.key}: {attr.value}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* Benefits avec icônes */}
                  <View style={styles.benefitRow}>
                    <View style={styles.benefitItem}>
                      <Text style={styles.benefitIcon}>✓</Text>
                      <Text style={styles.benefitText}>Livraison incluse</Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <Text style={styles.benefitIcon}>✓</Text>
                      <Text style={styles.benefitText}>Maintenance incluse</Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <Text style={styles.benefitIcon}>✓</Text>
                      <Text style={styles.benefitText}>Garantie incluse</Text>
                    </View>
                  </View>
                  
                  {/* Prix et quantité (bas) */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
                    <View>
                      <Text style={styles.priceLabel}>Quantité</Text>
                      <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold' }}>{item.quantity}</Text>
                    </View>
                    
                    {isInternal && (
                      <>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.priceLabel}>Prix achat HT</Text>
                          <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.gray }}>
                            {formatCurrency(item.purchase_price)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.priceLabel}>Marge</Text>
                          <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.success }}>
                            {item.margin}%
                          </Text>
                        </View>
                      </>
                    )}
                    
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.priceLabel}>Mensualité HT</Text>
                      <Text style={styles.priceHighlight}>
                        {item.monthly_payment ? formatCurrency(item.monthly_payment) : '-'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {/* Specifications en dessous (si présentes) */}
              {uniqueSpecs.length > 0 && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 8, color: colors.gray, marginBottom: 6 }}>Spécifications :</Text>
                  {uniqueSpecs.map((spec, i) => (
                    <View key={i} style={styles.listItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.listContent}>
                        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{spec.key}:</Text> {spec.value}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Summary - Modern Design */}
      <View style={{ marginTop: 20 }}>
        {isInternal && totalMargin !== undefined && (
          <View style={{ ...styles.row, marginBottom: 12 }}>
            <Text style={styles.textBold}>Marge totale générée:</Text>
            <Text style={{ ...styles.text, color: colors.success, fontSize: 12, fontFamily: 'Helvetica-Bold' }}>
              {formatCurrency(totalMargin)}
            </Text>
          </View>
        )}

        {/* Total Box - Modern */}
        <View style={styles.summaryBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.summaryTotal}>TOTAL MENSUEL HT</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalMonthlyPayment)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryDetail}>Contrat {contractDuration} mois</Text>
              <Text style={styles.summaryDetail}>+ Frais dossier {formatCurrency(fileFee)}</Text>
              <Text style={styles.summaryDetail}>+ Assurance {formatCurrency(annualInsurance)}/an</Text>
            </View>
          </View>
        </View>
        
        {/* Contract Terms */}
        <View style={{ ...styles.infoBox, marginTop: 15 }}>
          <Text style={{ ...styles.textBold, marginBottom: 6, color: colors.primary }}>
            Contrat de {contractDuration} mois
          </Text>
          <Text style={{ ...styles.text, fontSize: 10, lineHeight: 1.4 }}>
            {contractTerms}
          </Text>
        </View>
      </View>

      {/* Footer Note */}
      {contentBlocks?.footer_note && (
        <View style={{ marginTop: 10 }}>
          <View style={{ ...styles.text, fontSize: 9, fontStyle: 'italic' }}>
            {renderHTMLAsPDF(contentBlocks.footer_note, styles)}
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text>{companyName}</Text>
        <Text>Page {pageNumber}</Text>
      </View>
    </Page>
  );
};
