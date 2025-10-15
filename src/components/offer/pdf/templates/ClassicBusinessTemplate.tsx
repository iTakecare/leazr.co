import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

interface OfferData {
  id: string;
  client_name: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  amount: number;
  monthly_payment?: number;
  created_at: string;
}

interface Equipment {
  id: string;
  title: string;
  quantity: number;
  purchase_price: number;
  selling_price?: number;
  monthly_payment?: number;
}

interface TemplateDesign {
  sections?: {
    logo?: { enabled: boolean; position: 'left' | 'center' | 'right'; size: number };
    header?: { enabled: boolean; title: string; subtitle?: string };
    clientInfo?: { enabled: boolean; fields: string[] };
    equipmentTable?: { enabled: boolean; columns: string[] };
    summary?: { 
      enabled: boolean; 
      showMonthly: boolean; 
      showTotal: boolean;
      showInsurance?: boolean;
      insuranceLabel?: string;
      insuranceStyle?: {
        fontSize: number;
        color: string;
        fontWeight: 'normal' | 'bold';
        align: 'left' | 'center' | 'right';
      };
      showProcessingFee?: boolean;
      processingFeeLabel?: string;
      processingFeeAmount?: number;
      processingFeeStyle?: {
        fontSize: number;
        color: string;
        fontWeight: 'normal' | 'bold';
        align: 'left' | 'center' | 'right';
      };
    };
    footer?: { enabled: boolean; lines?: string[]; text?: string };
  };
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
    background?: string;
  };
  fonts?: {
    title?: { size: number; weight: 'normal' | 'bold' };
    heading?: { size: number; weight: 'normal' | 'bold' };
    body?: { size: number; weight: 'normal' | 'bold' };
  };
  layout?: {
    pageMargin?: number;
    sectionSpacing?: number;
    borderRadius?: number;
  };
}

interface ClassicBusinessTemplateProps {
  offer: OfferData;
  equipment: Equipment[];
  companyName: string;
  companyLogo?: string;
  design?: TemplateDesign;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2 solid #3b82f6',
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1 solid #e2e8f0',
  },
  clientInfo: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 4,
    marginBottom: 20,
  },
  clientRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 100,
    fontWeight: 'bold',
    color: '#64748b',
  },
  value: {
    flex: 1,
    color: '#1e293b',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    padding: 10,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e2e8f0',
    padding: 10,
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottom: '1 solid #e2e8f0',
    padding: 10,
  },
  col1: { width: '40%' },
  col2: { width: '15%', textAlign: 'center' },
  col3: { width: '22.5%', textAlign: 'right' },
  col4: { width: '22.5%', textAlign: 'right' },
  summary: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '2 solid #3b82f6',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 8,
    paddingTop: 10,
    borderTop: '1 solid #e2e8f0',
  },
  date: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 10,
  },
});

export const ClassicBusinessTemplate = ({ 
  offer, 
  equipment, 
  companyName, 
  companyLogo,
  design = {} 
}: ClassicBusinessTemplateProps) => {
  const totalAmount = equipment.reduce((sum, eq) => sum + (eq.selling_price || eq.purchase_price) * eq.quantity, 0);
  const totalMonthly = equipment.reduce((sum, eq) => sum + (eq.monthly_payment || 0) * eq.quantity, 0);

  // Extract design values with defaults
  const showLogo = design.sections?.logo?.enabled !== false;
  const showFooter = design.sections?.footer?.enabled !== false;
  const primaryColor = design.colors?.primary || '#3b82f6';
  
  // Support both old (text) and new (lines) footer format
  const footerLines = design.sections?.footer?.lines || 
                     (design.sections?.footer?.text ? [design.sections?.footer?.text] : []) || 
                     ['Cette offre est valable 30 jours à compter de sa date d\'émission.'];
  
  const showInsurance = design.sections?.summary?.showInsurance !== false;
  const insuranceLabel = design.sections?.summary?.insuranceLabel || 'EST. ASSURANCE ANNUELLE* :';
  const insuranceStyle = {
    fontSize: design.sections?.summary?.insuranceStyle?.fontSize || 9,
    color: design.sections?.summary?.insuranceStyle?.color || '#1e293b',
    fontWeight: design.sections?.summary?.insuranceStyle?.fontWeight || 'bold',
    align: design.sections?.summary?.insuranceStyle?.align || 'left',
  };
  
  const showProcessingFee = design.sections?.summary?.showProcessingFee !== false;
  const processingFeeLabel = design.sections?.summary?.processingFeeLabel || 'FRAIS DE DOSSIER UNIQUE* :';
  const processingFeeAmount = design.sections?.summary?.processingFeeAmount || 75;
  const processingFeeStyle = {
    fontSize: design.sections?.summary?.processingFeeStyle?.fontSize || 9,
    color: design.sections?.summary?.processingFeeStyle?.color || '#1e293b',
    fontWeight: design.sections?.summary?.processingFeeStyle?.fontWeight || 'bold',
    align: design.sections?.summary?.processingFeeStyle?.align || 'left',
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {showLogo && companyLogo ? (
            <Image src={companyLogo} style={styles.logo} />
          ) : (
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: primaryColor }}>
              {companyName}
            </Text>
          )}
          <Text style={styles.title}>Offre Commerciale</Text>
        </View>

        {/* Date */}
        <Text style={styles.date}>
          Date: {new Date(offer.created_at).toLocaleDateString('fr-FR')}
        </Text>
        <Text style={styles.date}>
          Référence: {offer.id.slice(0, 8)}
        </Text>

        {/* Client Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations Client</Text>
          <View style={styles.clientInfo}>
            <View style={styles.clientRow}>
              <Text style={styles.label}>Nom:</Text>
              <Text style={styles.value}>{offer.client_name}</Text>
            </View>
            {offer.client_company && (
              <View style={styles.clientRow}>
                <Text style={styles.label}>Entreprise:</Text>
                <Text style={styles.value}>{offer.client_company}</Text>
              </View>
            )}
            {offer.client_email && (
              <View style={styles.clientRow}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{offer.client_email}</Text>
              </View>
            )}
            {offer.client_phone && (
              <View style={styles.clientRow}>
                <Text style={styles.label}>Téléphone:</Text>
                <Text style={styles.value}>{offer.client_phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Equipment Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Équipements</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Désignation</Text>
              <Text style={styles.col2}>Qté</Text>
              <Text style={styles.col3}>Prix unitaire</Text>
              <Text style={styles.col4}>Total</Text>
            </View>
            {equipment.map((eq, index) => (
              <View key={eq.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={styles.col1}>{eq.title}</Text>
                <Text style={styles.col2}>{eq.quantity}</Text>
                <Text style={styles.col3}>{((eq.selling_price || eq.purchase_price) || 0).toFixed(2)}€</Text>
                <Text style={styles.col4}>
                  {((eq.selling_price || eq.purchase_price) * eq.quantity).toFixed(2)}€
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Mensualité totale :</Text>
            <Text style={styles.totalValue}>{totalMonthly > 0 ? totalMonthly.toFixed(2) : totalAmount.toFixed(2)}€</Text>
          </View>
          
          {showInsurance && (
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: insuranceStyle.align === 'center' ? 'center' : insuranceStyle.align === 'right' ? 'flex-end' : 'flex-start',
              marginTop: 10 
            }}>
              <Text style={{ 
                fontSize: insuranceStyle.fontSize, 
                fontWeight: insuranceStyle.fontWeight,
                color: insuranceStyle.color 
              }}>
                {insuranceLabel}
              </Text>
            </View>
          )}
          
          {showProcessingFee && (
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: processingFeeStyle.align === 'center' ? 'center' : processingFeeStyle.align === 'right' ? 'flex-end' : 'flex-start',
              marginTop: 5 
            }}>
              <Text style={{ 
                fontSize: processingFeeStyle.fontSize, 
                fontWeight: processingFeeStyle.fontWeight,
                color: processingFeeStyle.color 
              }}>
                {processingFeeLabel} {processingFeeAmount}€ HTVA
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        {showFooter && (
          <View style={styles.footer}>
            {footerLines.filter(line => line && line.trim()).map((line, index) => (
              <Text key={index} style={{ marginBottom: index < footerLines.length - 1 ? 3 : 0 }}>
                {line}
              </Text>
            ))}
            <Text style={{ marginTop: 8 }}>{companyName} - Document généré automatiquement</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};
