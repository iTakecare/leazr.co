import { Page, View, Text } from '@react-pdf/renderer';
import { renderHTMLAsPDF } from '@/utils/htmlToPdfText';
import { colors } from '../styles/pdfStyles';
import { OfferEquipment } from '@/types/offerEquipment';
import { getCategoryEmoji } from '@/utils/equipmentCategoryEmojis';
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
      {/* Badge "Vos équipements" */}
      <View style={styles.equipmentBadge}>
        <Text>💼 Vos équipements</Text>
      </View>

      <View style={styles.sectionTitle}>
        {renderHTMLAsPDF(title, styles)}
      </View>

      {/* Equipment Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableCellHeader, width: 25 }}>Cat.</Text>
          <Text style={{ ...styles.tableCellHeader, flex: 3 }}>Désignation</Text>
          <Text style={{ ...styles.tableCellHeader, flex: 1, textAlign: 'center' }}>Qté</Text>
          {isInternal && (
            <>
              <Text style={{ ...styles.tableCellHeader, flex: 1.5, textAlign: 'right' }}>Prix achat</Text>
              <Text style={{ ...styles.tableCellHeader, flex: 1, textAlign: 'right' }}>Marge</Text>
            </>
          )}
          <Text style={{ ...styles.tableCellHeader, flex: 1.5, textAlign: 'right' }}>
            {isInternal ? 'Prix vente' : 'Prix'}
          </Text>
          <Text style={{ ...styles.tableCellHeader, flex: 1.5, textAlign: 'right' }}>Mens. HT</Text>
        </View>

        {/* Table Rows */}
        {equipment.map((item, index) => {
          const isEven = index % 2 === 0;
          const rowStyle = isEven ? styles.tableRow : styles.tableRowAlt;
          const categoryEmoji = getCategoryEmoji(item.title);
          
          // Filter specifications to remove duplicates with attributes
          const attributeKeys = item.attributes?.map(attr => attr.key.toLowerCase()) || [];
          const uniqueSpecs = item.specifications?.filter(
            spec => !attributeKeys.includes(spec.key.toLowerCase())
          ) || [];

          return (
            <View key={item.id} style={{ marginBottom: 10 }}>
              {/* Main row */}
              <View style={rowStyle}>
                {/* Category emoji */}
                <Text style={{ ...styles.tableCell, width: 25, fontSize: 16 }}>
                  {categoryEmoji}
                </Text>
                
                <View style={{ ...styles.tableCell, flex: 3 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                    {item.title}
                  </Text>
                  {item.attributes && item.attributes.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 }}>
                      {item.attributes.map((attr, i) => (
                        <View key={i} style={styles.badge}>
                          <Text>{attr.key}: {attr.value}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Text style={{ ...styles.tableCell, flex: 1, textAlign: 'center' }}>
                  {item.quantity}
                </Text>
                {isInternal && (
                  <>
                    <Text style={{ ...styles.tableCell, flex: 1.5, textAlign: 'right' }}>
                      {formatCurrency(item.purchase_price)}
                    </Text>
                    <Text style={{ ...styles.tableCell, flex: 1, textAlign: 'right' }}>
                      {item.margin}%
                    </Text>
                  </>
                )}
                <Text style={{ ...styles.tableCell, flex: 1.5, textAlign: 'right' }}>
                  {item.selling_price ? formatCurrency(item.selling_price) : '-'}
                </Text>
                <Text style={{ ...styles.tableCell, flex: 1.5, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                  {item.monthly_payment ? formatCurrency(item.monthly_payment * (item.quantity || 1)) : '-'}
                </Text>
              </View>

              {/* Specifications row - only show unique specs */}
              {uniqueSpecs.length > 0 && (
                <View style={{ paddingLeft: 10, paddingTop: 5, paddingBottom: 5 }}>
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

      {/* Summary */}
      <View style={{ marginTop: 20, paddingTop: 15, borderTop: `2pt solid ${colors.border}` }}>
        <View style={styles.row}>
          <Text style={styles.textBold}>Total articles:</Text>
          <Text style={styles.text}>
            {equipment.reduce((sum, item) => sum + item.quantity, 0)}
          </Text>
        </View>

        {isInternal && totalMargin !== undefined && (
          <View style={styles.row}>
            <Text style={styles.textBold}>Marge totale générée:</Text>
            <Text style={{ ...styles.text, color: colors.success }}>
              {formatCurrency(totalMargin)}
            </Text>
          </View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL MENSUEL HT</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalMonthlyPayment)}</Text>
        </View>
        
        {/* Financial Details */}
        <View style={{ marginTop: 15, padding: 12, backgroundColor: colors.lightGray, borderRadius: 4 }}>
          <View style={{ ...styles.row, marginBottom: 6 }}>
            <Text style={styles.text}>Frais de dossier unique :</Text>
            <Text style={{ ...styles.text, fontFamily: 'Helvetica-Bold' }}>
              {formatCurrency(fileFee)}
            </Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.text}>Montant de l'assurance annuelle :</Text>
            <Text style={{ ...styles.text, fontFamily: 'Helvetica-Bold' }}>
              {formatCurrency(annualInsurance)}
            </Text>
          </View>
        </View>

        {/* Contract Terms */}
        <View style={{ marginTop: 15, padding: 12, backgroundColor: colors.lightGray, borderRadius: 4, borderLeftWidth: 4, borderLeftColor: colors.secondary }}>
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
