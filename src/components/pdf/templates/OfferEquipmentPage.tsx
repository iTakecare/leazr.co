import { Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles, colors } from '../styles/pdfStyles';
import { OfferEquipment } from '@/types/offerEquipment';

interface OfferEquipmentPageProps {
  equipment: OfferEquipment[];
  pdfType: 'client' | 'internal';
  totalMonthlyPayment: number;
  totalMargin?: number;
  companyName: string;
  pageNumber: number;
}

export const OfferEquipmentPage: React.FC<OfferEquipmentPageProps> = ({
  equipment,
  pdfType,
  totalMonthlyPayment,
  totalMargin,
  companyName,
  pageNumber,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const isInternal = pdfType === 'internal';

  return (
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.sectionTitle}>Détail des Équipements</Text>

      {/* Equipment Table */}
      <View style={pdfStyles.table}>
        {/* Table Header */}
        <View style={pdfStyles.tableHeader}>
          <Text style={{ ...pdfStyles.tableCellHeader, flex: 3 }}>Désignation</Text>
          <Text style={{ ...pdfStyles.tableCellHeader, flex: 1, textAlign: 'center' }}>Qté</Text>
          {isInternal && (
            <>
              <Text style={{ ...pdfStyles.tableCellHeader, flex: 1.5, textAlign: 'right' }}>Prix achat</Text>
              <Text style={{ ...pdfStyles.tableCellHeader, flex: 1, textAlign: 'right' }}>Marge</Text>
            </>
          )}
          <Text style={{ ...pdfStyles.tableCellHeader, flex: 1.5, textAlign: 'right' }}>
            {isInternal ? 'Prix vente' : 'Prix'}
          </Text>
          <Text style={{ ...pdfStyles.tableCellHeader, flex: 1.5, textAlign: 'right' }}>Mens. HT</Text>
        </View>

        {/* Table Rows */}
        {equipment.map((item, index) => {
          const isEven = index % 2 === 0;
          const rowStyle = isEven ? pdfStyles.tableRow : pdfStyles.tableRowAlt;

          return (
            <View key={item.id} style={{ marginBottom: 10 }}>
              {/* Main row */}
              <View style={rowStyle}>
                <View style={{ ...pdfStyles.tableCell, flex: 3 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                    {item.title}
                  </Text>
                  {item.attributes && item.attributes.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 }}>
                      {item.attributes.map((attr, i) => (
                        <View key={i} style={pdfStyles.badge}>
                          <Text>{attr.key}: {attr.value}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Text style={{ ...pdfStyles.tableCell, flex: 1, textAlign: 'center' }}>
                  {item.quantity}
                </Text>
                {isInternal && (
                  <>
                    <Text style={{ ...pdfStyles.tableCell, flex: 1.5, textAlign: 'right' }}>
                      {formatCurrency(item.purchase_price)}
                    </Text>
                    <Text style={{ ...pdfStyles.tableCell, flex: 1, textAlign: 'right' }}>
                      {item.margin}%
                    </Text>
                  </>
                )}
                <Text style={{ ...pdfStyles.tableCell, flex: 1.5, textAlign: 'right' }}>
                  {item.selling_price ? formatCurrency(item.selling_price) : '-'}
                </Text>
                <Text style={{ ...pdfStyles.tableCell, flex: 1.5, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                  {item.monthly_payment ? formatCurrency(item.monthly_payment) : '-'}
                </Text>
              </View>

              {/* Specifications row */}
              {item.specifications && item.specifications.length > 0 && (
                <View style={{ paddingLeft: 10, paddingTop: 5, paddingBottom: 5 }}>
                  {item.specifications.map((spec, i) => (
                    <View key={i} style={pdfStyles.listItem}>
                      <Text style={pdfStyles.bullet}>•</Text>
                      <Text style={pdfStyles.listContent}>
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
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.textBold}>Total articles:</Text>
          <Text style={pdfStyles.text}>
            {equipment.reduce((sum, item) => sum + item.quantity, 0)}
          </Text>
        </View>

        {isInternal && totalMargin !== undefined && (
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.textBold}>Marge totale générée:</Text>
            <Text style={{ ...pdfStyles.text, color: colors.success }}>
              {formatCurrency(totalMargin)}
            </Text>
          </View>
        )}

        <View style={pdfStyles.totalRow}>
          <Text style={pdfStyles.totalLabel}>TOTAL MENSUEL HT</Text>
          <Text style={pdfStyles.totalValue}>{formatCurrency(totalMonthlyPayment)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={pdfStyles.footer}>
        <Text>{companyName}</Text>
        <Text>Page {pageNumber}</Text>
      </View>
    </Page>
  );
};
