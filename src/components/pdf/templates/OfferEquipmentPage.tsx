import { Page, View, Text } from '@react-pdf/renderer';
import { colors } from '../styles/pdfStyles';
import { OfferEquipment } from '@/types/offerEquipment';

interface OfferEquipmentPageProps {
  equipment: OfferEquipment[];
  pdfType: 'client' | 'internal';
  totalMonthlyPayment: number;
  totalMargin?: number;
  companyName: string;
  pageNumber: number;
  styles: any;
}

export const OfferEquipmentPage: React.FC<OfferEquipmentPageProps> = ({
  equipment,
  pdfType,
  totalMonthlyPayment,
  totalMargin,
  companyName,
  pageNumber,
  styles,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const isInternal = pdfType === 'internal';

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Détail des Équipements</Text>

      {/* Equipment Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
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

          return (
            <View key={item.id} style={{ marginBottom: 10 }}>
              {/* Main row */}
              <View style={rowStyle}>
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
                  {item.monthly_payment ? formatCurrency(item.monthly_payment) : '-'}
                </Text>
              </View>

              {/* Specifications row */}
              {item.specifications && item.specifications.length > 0 && (
                <View style={{ paddingLeft: 10, paddingTop: 5, paddingBottom: 5 }}>
                  {item.specifications.map((spec, i) => (
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
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>{companyName}</Text>
        <Text>Page {pageNumber}</Text>
      </View>
    </Page>
  );
};
