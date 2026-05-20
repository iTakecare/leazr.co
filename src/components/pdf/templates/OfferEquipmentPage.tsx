import { Page, View, Text } from '@react-pdf/renderer';
import { renderHTMLAsPDF } from '@/utils/htmlToPdfText';
import { colors } from '../styles/pdfStyles';
import { OfferEquipment } from '@/types/offerEquipment';
import { getCategoryEmoji } from '@/utils/equipmentCategoryEmojis';
import { stripHtmlTags } from '@/utils/htmlToPdfText';
import type { ExternalProviderPDFLine } from './OfferPDFDocument';

const BILLING_PERIOD_PDF_LABELS: Record<string, string> = {
  monthly: 'mensuel',
  yearly: 'annuel',
  one_time: 'paiement unique',
};

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
  downPayment?: number;
  adjustedMonthlyPayment?: number;
  financedAmountAfterDownPayment?: number;
  isPurchase?: boolean;
  totalSellingPrice?: number;
  // Discount fields
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  monthlyPaymentBeforeDiscount?: number;
  externalProviderProducts?: ExternalProviderPDFLine[];
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
  downPayment = 0,
  adjustedMonthlyPayment,
  financedAmountAfterDownPayment,
  isPurchase = false,
  totalSellingPrice = 0,
  discountType,
  discountValue,
  discountAmount,
  monthlyPaymentBeforeDiscount,
  externalProviderProducts,
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
  const title = stripHtmlTags(contentBlocks?.title || 'Votre pack tech');

  return (
    <Page size="A4" style={styles.page}>
      {/* Titre "Votre pack tech" */}
      <View style={styles.sectionTitle}>
        <Text style={{
          fontSize: 24,
          fontFamily: 'Helvetica-Bold',
          color: colors.primary,
          marginBottom: 10,
        }}>
          {title}
        </Text>
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
          {!isPurchase && (
            <Text style={{ ...styles.tableCellHeader, flex: 1.5, textAlign: 'right' }}>Mens. HTVA</Text>
          )}
          {isPurchase && (
            <Text style={{ ...styles.tableCellHeader, flex: 1.5, textAlign: 'right' }}>Total</Text>
          )}
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
                {!isPurchase && (
                  <Text style={{ ...styles.tableCell, flex: 1.5, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                    {item.monthly_payment ? formatCurrency(item.monthly_payment) : '-'}
                  </Text>
                )}
                {isPurchase && (
                  <Text style={{ ...styles.tableCell, flex: 1.5, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                    {item.selling_price ? formatCurrency(item.selling_price * item.quantity) : '-'}
                  </Text>
                )}
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

      {/* External provider products — billed directly by each provider, NOT in monthly total */}
      {externalProviderProducts && externalProviderProducts.length > 0 && (
        <View
          style={{
            marginTop: 18,
            padding: 12,
            backgroundColor: '#EFF6FF',
            borderRadius: 4,
            borderLeftWidth: 4,
            borderLeftColor: '#3B82F6',
          }}
        >
          <Text style={{ ...styles.textBold, marginBottom: 8, color: '#1E3A8A', fontSize: 12 }}>
            Services partenaires complémentaires
          </Text>

          {Object.entries(
            externalProviderProducts.reduce<Record<string, ExternalProviderPDFLine[]>>((acc, line) => {
              const key = line.provider_name || 'Prestataire';
              if (!acc[key]) acc[key] = [];
              acc[key].push(line);
              return acc;
            }, {})
          ).map(([providerName, lines]) => (
            <View key={providerName} style={{ marginBottom: 8 }}>
              <Text style={{ ...styles.textBold, fontSize: 10, color: '#1E3A8A', marginBottom: 3 }}>
                {providerName}
              </Text>
              {lines.map((line, i) => (
                <View
                  key={`${providerName}-${i}`}
                  style={{
                    ...styles.row,
                    marginBottom: 2,
                    paddingLeft: 8,
                  }}
                >
                  <Text style={{ ...styles.text, fontSize: 10, flex: 3 }}>
                    {line.product_name}
                    {line.quantity > 1 ? ` × ${line.quantity}` : ''}
                  </Text>
                  <Text style={{ ...styles.text, fontSize: 10, flex: 1.5, textAlign: 'right' }}>
                    {formatCurrency(line.price_htva)} HTVA{' '}
                    <Text style={{ color: '#64748B' }}>
                      ({BILLING_PERIOD_PDF_LABELS[line.billing_period] || line.billing_period})
                    </Text>
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <Text
            style={{
              fontSize: 9,
              fontStyle: 'italic',
              color: '#475569',
              marginTop: 6,
              lineHeight: 1.4,
            }}
          >
            Ces services sont fournis et facturés directement par chaque prestataire partenaire.
            Leurs tarifs sont gérés indépendamment et ne sont PAS inclus dans la mensualité de
            location ci-dessous.
          </Text>
        </View>
      )}

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

        {/* Purchase Mode - Show total selling price */}
        {isPurchase ? (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL HTVA</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(totalSellingPrice)}
              </Text>
            </View>
            
            {/* Purchase terms */}
            <View style={{ marginTop: 15, padding: 12, backgroundColor: colors.lightGray, borderRadius: 4, borderLeftWidth: 4, borderLeftColor: colors.secondary }}>
              <Text style={{ ...styles.textBold, marginBottom: 6, color: colors.primary }}>
                Offre d'achat
              </Text>
              <Text style={{ ...styles.text, fontSize: 10, lineHeight: 1.4 }}>
                {contractTerms}
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Down Payment Section - Only show if there's a down payment */}
            {downPayment > 0 && (
              <View style={{ marginTop: 15, padding: 12, backgroundColor: '#FEF3C7', borderRadius: 4, borderLeftWidth: 4, borderLeftColor: '#F59E0B' }}>
                <Text style={{ ...styles.textBold, marginBottom: 6, color: '#92400E' }}>
                  Acompte
                </Text>
                <View style={{ ...styles.row, marginBottom: 4 }}>
                  <Text style={styles.text}>Montant de l'acompte :</Text>
                  <Text style={{ ...styles.text, fontFamily: 'Helvetica-Bold' }}>
                    {formatCurrency(downPayment)}
                  </Text>
                </View>
                {/* Mensualité d'origine barrée */}
                <View style={styles.row}>
                  <Text style={styles.text}>Mensualité d'origine :</Text>
                  <Text style={{ 
                    ...styles.text, 
                    fontFamily: 'Helvetica',
                    textDecoration: 'line-through',
                    opacity: 0.7,
                  }}>
                    {formatCurrency(totalMonthlyPayment)}
                  </Text>
                </View>
              </View>
            )}

            {/* Discount Section */}
            {discountAmount && discountAmount > 0 && (
              <View style={{ marginTop: 10, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 4, borderLeftWidth: 4, borderLeftColor: '#EF4444' }}>
                <Text style={{ ...styles.textBold, marginBottom: 6, color: '#991B1B' }}>
                  Remise commerciale
                </Text>
                <View style={{ ...styles.row, marginBottom: 4 }}>
                  <Text style={styles.text}>Mensualité d'origine :</Text>
                  <Text style={{ 
                    ...styles.text, 
                    fontFamily: 'Helvetica',
                    textDecoration: 'line-through',
                    opacity: 0.7,
                  }}>
                    {formatCurrency(monthlyPaymentBeforeDiscount || totalMonthlyPayment)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.text}>
                    Remise {discountType === 'percentage' ? `(${discountValue}%)` : ''} :
                  </Text>
                  <Text style={{ ...styles.text, fontFamily: 'Helvetica-Bold', color: '#DC2626' }}>
                    -{formatCurrency(discountAmount)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {discountAmount && discountAmount > 0
                  ? 'MENSUALITÉ HTVA (après remise)'
                  : downPayment > 0 ? 'MENSUALITÉ HTVA (après acompte)' : 'MENSUALITÉ HTVA'}
              </Text>
              <Text style={styles.totalValue}>
                {discountAmount && discountAmount > 0
                  ? formatCurrency((monthlyPaymentBeforeDiscount || totalMonthlyPayment) - discountAmount)
                  : formatCurrency(downPayment > 0 && adjustedMonthlyPayment ? adjustedMonthlyPayment : totalMonthlyPayment)}
              </Text>
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
          </>
        )}
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
