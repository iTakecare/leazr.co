import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

// Contract PDF data structure
export interface SignedContractPDFData {
  id: string;
  tracking_number: string;
  created_at: string;
  signed_at?: string;
  // Contract dates
  contract_start_date?: string;
  contract_end_date?: string;
  // Client info
  client_name: string;
  client_company?: string;
  client_address?: string;
  client_city?: string;
  client_postal_code?: string;
  client_country?: string;
  client_vat_number?: string;
  client_phone?: string;
  client_email?: string;
  client_iban?: string;
  client_bic?: string;
  // Leaser info
  leaser_name: string;
  is_self_leasing?: boolean;
  // Company info
  company_name: string;
  company_address?: string;
  company_email?: string;
  company_phone?: string;
  company_vat_number?: string;
  company_logo_url?: string;
  company_iban?: string;
  company_bic?: string;
  // Financial
  monthly_payment: number;
  contract_duration: number;
  file_fee?: number;
  annual_insurance?: number;
  down_payment?: number;
  coefficient?: number;
  financed_amount?: number;
  amount?: number;
  adjusted_monthly_payment?: number;
  // Equipment
  equipment: Array<{
    title: string;
    quantity: number;
    monthly_payment: number;
    purchase_price?: number;
    margin?: number;
    serial_number?: string;
  }>;
  // Signature
  signature_data?: string;
  signer_name?: string;
  signer_ip?: string;
  // Contract content from template
  contract_content?: Record<string, string>;
  // Brand colors
  primary_color?: string;
  // Special provisions (self-leasing only)
  special_provisions?: string;
}

const createStyles = (primaryColor: string = '#33638e') => StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: primaryColor,
  },
  logo: {
    width: 80,
    height: 'auto',
    objectFit: 'contain',
  },
  companyInfo: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'right',
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: primaryColor,
    textAlign: 'center',
    marginBottom: 15,
  },
  articleTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginTop: 10,
    marginBottom: 4,
  },
  articleContent: {
    fontSize: 8,
    color: '#374151',
    lineHeight: 1.4,
    marginBottom: 6,
    textAlign: 'justify',
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: primaryColor,
    marginTop: 12,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: primaryColor,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  label: {
    fontSize: 8,
    color: '#64748b',
  },
  value: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  table: {
    width: '100%',
    marginTop: 8,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: primaryColor,
    padding: 6,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 6,
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 6,
  },
  tableCell: {
    fontSize: 8,
    color: '#1e293b',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: primaryColor,
    padding: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  totalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textAlign: 'right',
  },
  signatureBlock: {
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  signatureColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 40,
    marginTop: 15,
  },
  signatureColumn: {
    flex: 1,
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 10,
    textAlign: 'center',
  },
  signerName: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  signatureLine: {
    width: '80%',
    height: 1,
    backgroundColor: '#64748b',
    marginTop: 50,
  },
  clientSignatureImage: {
    width: 150,
    height: 60,
    objectFit: 'contain',
  },
  signatureMetadata: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  signatureDetail: {
    fontSize: 7,
    color: '#64748b',
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#64748b',
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 20,
  },
  column: {
    flex: 1,
  },
});

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount || 0);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return new Date().toLocaleDateString('fr-FR');
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateShort = (dateString?: string) => {
  if (!dateString) return new Date().toLocaleDateString('fr-FR');
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Strip HTML tags and convert to plain text for PDF
 * Handles (i), (ii), (iii) enumerations by placing them on separate lines
 */
const stripHtml = (html: string): string => {
  if (!html) return '';
  
  let text = html
    .replace(/<h[1-6][^>]*>/gi, '')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '')
    .replace(/<strong[^>]*>/gi, '')
    .replace(/<\/strong>/gi, '')
    .replace(/<em[^>]*>/gi, '')
    .replace(/<\/em>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Handle (i), (ii), (iii) enumerations - put on separate lines
  text = text
    .replace(/\s*;\s*\(i\)/gi, '\n    (i)')
    .replace(/\s*;\s*\(ii\)/gi, '\n    (ii)')
    .replace(/\s*;\s*\(iii\)/gi, '\n    (iii)')
    .replace(/\s*;\s*\(iv\)/gi, '\n    (iv)')
    .replace(/\s*;\s*\(v\)/gi, '\n    (v)')
    // Also handle when it starts with colon or at beginning
    .replace(/:\s*\(i\)/gi, ':\n    (i)')
    .replace(/\s+\(i\)\s+/gi, '\n    (i) ')
    .replace(/\s+\(ii\)\s+/gi, '\n    (ii) ')
    .replace(/\s+\(iii\)\s+/gi, '\n    (iii) ')
    .replace(/\s+\(iv\)\s+/gi, '\n    (iv) ')
    .replace(/\s+\(v\)\s+/gi, '\n    (v) ');
  
  // Clean up multiple newlines and spaces
  text = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  
  return text;
};

/**
 * Calculate end date from start date and duration
 */
const calculateEndDate = (startDate?: string, durationMonths?: number): string => {
  if (!startDate || !durationMonths) return '';
  const start = new Date(startDate);
  start.setMonth(start.getMonth() + durationMonths);
  return formatDateShort(start.toISOString());
};

/**
 * Replace placeholders in text with contract data
 */
const replacePlaceholders = (text: string, contract: SignedContractPDFData): string => {
  if (!text) return '';
  
  const clientFullAddress = [
    contract.client_address,
    contract.client_postal_code,
    contract.client_city,
    contract.client_country
  ].filter(Boolean).join(', ');

  // Calculate end date if not provided
  const endDate = contract.contract_end_date 
    ? formatDateShort(contract.contract_end_date)
    : calculateEndDate(contract.contract_start_date, contract.contract_duration);

  const placeholders: Record<string, string> = {
    '{{company_name}}': contract.company_name || '',
    '{{company_legal_form}}': 'à responsabilité limitée', // SRL
    '{{company_address}}': contract.company_address || '',
    '{{company_bce}}': contract.company_vat_number || '',
    '{{company_representative}}': 'Gianni Sergi', // Représentant légal iTakecare
    '{{company_iban}}': `**${contract.company_iban || ''}**`,
    '{{company_bic}}': contract.company_bic || '',
    '{{client_name}}': contract.client_name || '',
    '{{client_company}}': contract.client_company || contract.client_name || '',
    '{{client_bce}}': contract.client_vat_number || '',
    '{{client_vat_number}}': contract.client_vat_number || '',
    '{{client_address}}': clientFullAddress || '',
    '{{client_street}}': contract.client_address || '',
    '{{client_city}}': contract.client_city || '',
    '{{client_postal_code}}': contract.client_postal_code || '',
    '{{client_country}}': contract.client_country || 'Belgique',
    '{{client_phone}}': contract.client_phone || '',
    '{{client_representative}}': contract.signer_name || contract.client_name || '',
    '{{client_iban}}': `**${contract.client_iban || ''}**`,
    '{{client_bic}}': contract.client_bic || '',
    '{{duration}}': String(contract.contract_duration || 36),
    '{{monthly_payment}}': formatCurrency(contract.monthly_payment).replace('€', '').trim(),
    '{{payment_day}}': '1er',
    '{{file_fee}}': formatCurrency(contract.file_fee || 0).replace('€', '').trim(),
    '{{admin_fee}}': formatCurrency(50).replace('€', '').trim(), // Default
    '{{residual_value}}': '1', // Default 1%
    '{{residual_amount}}': formatCurrency((contract.monthly_payment * contract.contract_duration) * 0.01).replace('€', '').trim(),
    '{{repair_threshold}}': '150',
    '{{penalty_percentage}}': '50',
    '{{contract_location}}': 'Belgique',
    '{{contract_date}}': formatDateShort(contract.signed_at || contract.created_at),
    // Contract dates
    '{{contract_start_date}}': contract.contract_start_date ? formatDateShort(contract.contract_start_date) : formatDateShort(contract.created_at),
    '{{start_date}}': contract.contract_start_date ? formatDateShort(contract.contract_start_date) : formatDateShort(contract.created_at),
    '{{contract_end_date}}': endDate,
    '{{end_date}}': endDate,
  };

  let result = text;
  Object.entries(placeholders).forEach(([key, value]) => {
    result = result.split(key).join(value);
  });
  
  return result;
};

interface SignedContractPDFDocumentProps {
  contract: SignedContractPDFData;
}

export const SignedContractPDFDocument: React.FC<SignedContractPDFDocumentProps> = ({ contract }) => {
  const styles = createStyles(contract.primary_color);
  const content = contract.contract_content || {};

  // Calculate down payment and adjusted monthly payment
  // Formula from SQL: adjusted = round(((financed_amount - down_payment) * coefficient) / 100, 2)
  const downPayment = contract.down_payment || 0;
  const coefficient = contract.coefficient || 0;
  const financedAmount = contract.financed_amount || contract.amount || 0;
  const isSelfLeasing = contract.is_self_leasing || false;
  
  // Only show down payment info for self-leasing contracts with actual down payment
  const hasDownPayment = downPayment > 0 && coefficient > 0 && isSelfLeasing;
  
  // Use pre-calculated adjusted_monthly_payment if provided, otherwise calculate
  const adjustedMonthlyPayment = hasDownPayment 
    ? (contract.adjusted_monthly_payment || Math.round(((financedAmount - downPayment) * coefficient) / 100 * 100) / 100)
    : contract.monthly_payment;

  // Prepare articles for rendering
  const articles = [
    { key: 'article_1', content: content.article_1 },
    { key: 'article_2', content: content.article_2 },
    { key: 'article_3', content: content.article_3 },
    { key: 'article_4', content: content.article_4 },
    { key: 'article_5', content: content.article_5 },
    { key: 'article_6', content: content.article_6 },
    { key: 'article_7', content: content.article_7 },
    { key: 'article_8', content: content.article_8 },
    { key: 'article_9', content: content.article_9 },
    { key: 'article_10', content: content.article_10 },
    { key: 'article_11', content: content.article_11 },
    { key: 'article_12', content: content.article_12 },
    { key: 'article_13', content: content.article_13 },
    { key: 'article_14', content: content.article_14 },
    { key: 'article_15', content: content.article_15 },
    { key: 'article_16', content: content.article_16 },
    { key: 'article_17', content: content.article_17 },
  ].filter(a => a.content);

  // Split articles across pages (approximately 4-5 articles per page)
  const articlesPage1 = articles.slice(0, 4);
  const articlesPage2 = articles.slice(4, 8);
  const articlesPage3 = articles.slice(8, 12);
  const articlesPage4 = articles.slice(12, 17);

  /**
   * Render text with bold markers (**text**)
   */
  const renderTextWithBold = (text: string, baseStyle: any) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <Text key={i} style={[baseStyle, { fontFamily: 'Helvetica-Bold' }]}>{boldText}</Text>;
      }
      return <Text key={i} style={baseStyle}>{part}</Text>;
    });
  };

  /**
   * Render article content with proper line breaks for (i), (ii), (iii) formatting, bold support, and article titles
   */
  const renderArticleContent = (articleHtml: string) => {
    const processed = replacePlaceholders(articleHtml, contract);
    const plainText = stripHtml(processed);
    
    // Split by newlines and render each paragraph separately
    const paragraphs = plainText.split('\n').filter(p => p.trim());
    
    return (
      <View>
        {paragraphs.map((paragraph, idx) => {
          const trimmed = paragraph.trim();
          const isListItem = trimmed.match(/^\((i|ii|iii|iv|v)\)/);
          const hasBold = trimmed.includes('**');
          
          // Détecter les titres d'articles numérotés (1. Objet, 2. Durée, etc.)
          const isArticleTitle = trimmed.match(/^(\d+\.)\s+[A-ZÀ-Ü]/);
          
          if (isArticleTitle) {
            return (
              <Text 
                key={idx} 
                style={styles.articleTitle}
              >
                {trimmed}
              </Text>
            );
          }
          
          if (hasBold) {
            return (
              <Text 
                key={idx} 
                style={[
                  styles.articleContent,
                  isListItem && { marginLeft: 15, marginBottom: 2 }
                ]}
              >
                {renderTextWithBold(trimmed, {})}
              </Text>
            );
          }
          
          return (
            <Text 
              key={idx} 
              style={[
                styles.articleContent,
                isListItem && { marginLeft: 15, marginBottom: 2 }
              ]}
            >
              {trimmed}
            </Text>
          );
        })}
      </View>
    );
  };

  /**
   * Render the parties section with proper formatting for key terms in bold
   */
  const renderPartiesSection = (partiesHtml: string) => {
    const processed = replacePlaceholders(partiesHtml, contract);
    const plainText = stripHtml(processed);
    
    // Split into paragraphs
    const paragraphs = plainText.split('\n').filter(p => p.trim());
    
    return (
      <View>
        {paragraphs.map((paragraph, idx) => {
          const trimmed = paragraph.trim();
          
          // Termes à mettre en gras
          const keyTerms = ['Entre :', 'Et :', 'le Bailleur', 'le Locataire', 'les Parties', 'Ensemble les Parties'];
          let hasKeyTerm = false;
          let termFound = '';
          
          for (const term of keyTerms) {
            if (trimmed.includes(term) || trimmed.startsWith(term.replace(' :', ''))) {
              hasKeyTerm = true;
              termFound = term;
              break;
            }
          }
          
          // Si c'est "Entre :" ou "Et :" seul sur une ligne
          if (trimmed === 'Entre :' || trimmed === 'Et :') {
            return (
              <Text 
                key={idx} 
                style={[styles.articleContent, { fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 4 }]}
              >
                {trimmed}
              </Text>
            );
          }
          
          // Si contient "ci-après le Bailleur" ou "ci-après le Locataire"
          if (trimmed.includes('ci-après le Bailleur') || trimmed.includes('ci-après le Locataire')) {
            const parts = trimmed.split(/(ci-après le (?:Bailleur|Locataire)\s*;?)/);
            return (
              <Text key={idx} style={styles.articleContent}>
                {parts.map((part, i) => {
                  if (part.includes('ci-après le Bailleur') || part.includes('ci-après le Locataire')) {
                    return <Text key={i} style={{ fontFamily: 'Helvetica-Bold' }}>{part}</Text>;
                  }
                  return <Text key={i}>{part}</Text>;
                })}
              </Text>
            );
          }
          
          // Si c'est "Ensemble les Parties"
          if (trimmed.includes('Ensemble les Parties') || trimmed === 'les Parties.') {
            return (
              <Text 
                key={idx} 
                style={[styles.articleContent, { fontFamily: 'Helvetica-Bold', marginTop: 8 }]}
              >
                {trimmed}
              </Text>
            );
          }
          
          return (
            <Text key={idx} style={styles.articleContent}>
              {trimmed}
            </Text>
          );
        })}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        {contract.company_logo_url ? (
          <Image src={contract.company_logo_url} style={styles.logo} />
        ) : (
          <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: contract.primary_color || '#33638e' }}>
            {contract.company_name}
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.companyInfo}>{contract.company_address}</Text>
        {contract.company_vat_number && (
          <Text style={styles.companyInfo}>N° BCE : {contract.company_vat_number}</Text>
        )}
        <Text style={[styles.companyInfo, { fontFamily: 'Helvetica-Bold' }]}>Réf: {contract.tracking_number}</Text>
      </View>
    </View>
  );

  const totalPages = 4 + (contract.signature_data ? 1 : 0);

  return (
    <Document>
      {/* Page 1: Cover, Parties & Equipment */}
      <Page size="A4" style={styles.page}>
        {renderHeader()}

        {/* Title */}
        <Text style={styles.title}>
          {content.title ? stripHtml(replacePlaceholders(content.title, contract)) : 'CONTRAT DE LOCATION DE MATÉRIEL INFORMATIQUE'}
        </Text>

        {/* Parties - avec mise en forme des termes clés en gras */}
        {content.parties && (
          <View style={{ marginBottom: 15 }}>
            {renderPartiesSection(content.parties)}
          </View>
        )}

        {/* Equipment Table - Simplified */}
        <Text style={styles.sectionTitle}>Description des équipements</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 5 }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Qté</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>Mensualité HT</Text>
          </View>
          {contract.equipment?.map((eq, idx) => (
            <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { flex: 5 }]}>{eq.title}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{eq.quantity}</Text>
              <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>{formatCurrency(eq.monthly_payment)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { flex: 6 }]}>{hasDownPayment ? 'Mensualité ajustée HT' : 'Total mensuel HT'}</Text>
            <Text style={[styles.totalValue, { flex: 2 }]}>{formatCurrency(hasDownPayment ? adjustedMonthlyPayment : contract.monthly_payment)}</Text>
          </View>
        </View>

        {/* Financial Summary with fees and insurance - avec titre */}
        <View style={styles.infoBox}>
          <Text style={[styles.label, { fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 6, color: '#1e293b' }]}>
            Conditions du contrat
          </Text>
          <View style={styles.row}>
            <Text style={styles.label}>Durée du contrat :</Text>
            <Text style={styles.value}>{contract.contract_duration} mois</Text>
          </View>
          {hasDownPayment ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Acompte :</Text>
                <Text style={styles.value}>{formatCurrency(downPayment)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Mensualité ajustée HT :</Text>
                <Text style={styles.value}>{formatCurrency(adjustedMonthlyPayment)}</Text>
              </View>
            </>
          ) : (
            <View style={styles.row}>
              <Text style={styles.label}>Mensualité HT :</Text>
              <Text style={styles.value}>{formatCurrency(contract.monthly_payment)}</Text>
            </View>
          )}
          {contract.file_fee && contract.file_fee > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Frais de dossier (unique) :</Text>
              <Text style={styles.value}>{formatCurrency(contract.file_fee)}</Text>
            </View>
          )}
          {contract.annual_insurance && contract.annual_insurance > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Assurance annuelle :</Text>
              <Text style={styles.value}>{formatCurrency(contract.annual_insurance)}</Text>
            </View>
          )}
        </View>

        {/* Client IBAN - carte séparée avec titre */}
        {contract.client_iban && (
          <View style={styles.infoBox}>
            <Text style={[styles.label, { fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 6, color: '#1e293b' }]}>
              Coordonnées bancaires du Locataire
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>IBAN :</Text>
              <Text style={[styles.value, { fontFamily: 'Helvetica-Bold' }]}>{contract.client_iban}</Text>
            </View>
            {contract.client_bic && (
              <View style={styles.row}>
                <Text style={styles.label}>BIC :</Text>
                <Text style={styles.value}>{contract.client_bic}</Text>
              </View>
            )}
          </View>
        )}

        {/* Dispositions particulières - affiché seulement si contenu */}
        {contract.special_provisions && (
          <View style={styles.infoBox}>
            <Text style={[styles.label, { fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 6, color: '#1e293b' }]}>
              Dispositions particulières
            </Text>
            <Text style={[styles.articleContent, { fontSize: 8 }]}>
              {stripHtml(contract.special_provisions)}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{contract.company_name}</Text>
          <Text style={styles.footerText}>Page 1/{totalPages}</Text>
        </View>
      </Page>

      {/* Page 2: Articles 1-4 */}
      <Page size="A4" style={styles.page}>
        {renderHeader()}
        <Text style={styles.sectionTitle}>Conditions Générales du Contrat</Text>
        {articlesPage1.map((article, idx) => (
          <View key={article.key} style={{ marginBottom: 8 }}>
            {renderArticleContent(article.content)}
          </View>
        ))}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{contract.company_name}</Text>
          <Text style={styles.footerText}>Page 2/{totalPages}</Text>
        </View>
      </Page>

      {/* Page 3: Articles 5-8 */}
      <Page size="A4" style={styles.page}>
        {renderHeader()}
        {articlesPage2.map((article, idx) => (
          <View key={article.key} style={{ marginBottom: 8 }}>
            {renderArticleContent(article.content)}
          </View>
        ))}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{contract.company_name}</Text>
          <Text style={styles.footerText}>Page 3/{totalPages}</Text>
        </View>
      </Page>

      {/* Page 4: Articles 9-12 */}
      <Page size="A4" style={styles.page}>
        {renderHeader()}
        {articlesPage3.map((article, idx) => (
          <View key={article.key} style={{ marginBottom: 8 }}>
            {renderArticleContent(article.content)}
          </View>
        ))}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{contract.company_name}</Text>
          <Text style={styles.footerText}>Page 4/{totalPages}</Text>
        </View>
      </Page>

      {/* Page 5: Articles 13-17, Annexes & Signature */}
      <Page size="A4" style={styles.page}>
        {renderHeader()}
        {articlesPage4.map((article, idx) => (
          <View key={article.key} style={{ marginBottom: 8 }}>
            {renderArticleContent(article.content)}
          </View>
        ))}

        {/* Annexes */}
        {content.annexes && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.articleContent}>{stripHtml(replacePlaceholders(content.annexes, contract))}</Text>
          </View>
        )}

        {/* Signature Section - 2 columns side by side */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureColumns}>
            {/* LEFT: Le Bailleur */}
            <View style={styles.signatureColumn}>
              <Text style={styles.signatureLabel}>Le Bailleur</Text>
              <Text style={styles.signerName}>{contract.company_name}</Text>
              <Text style={{ fontSize: 7, color: '#64748b', marginBottom: 5 }}>
                Nom, qualité, signature
              </Text>
              <View style={styles.signatureLine} />
            </View>
            
            {/* RIGHT: Le Locataire */}
            <View style={styles.signatureColumn}>
              <Text style={styles.signatureLabel}>Le Locataire</Text>
              <Text style={styles.signerName}>{contract.signer_name || contract.client_name}</Text>
              {contract.signature_data ? (
                <Image src={contract.signature_data} style={styles.clientSignatureImage} />
              ) : (
                <View>
                  <Text style={{ fontSize: 7, color: '#64748b', marginBottom: 5 }}>
                    Nom, qualité, signature
                  </Text>
                  <View style={styles.signatureLine} />
                </View>
              )}
            </View>
          </View>

          {/* Signature metadata */}
          {contract.signature_data && (
            <View style={styles.signatureMetadata}>
              <Text style={styles.signatureDetail}>
                Contrat signé électroniquement le {formatDate(contract.signed_at)}
                {contract.signer_ip && ` • IP: ${contract.signer_ip}`}
              </Text>
              <Text style={{ fontSize: 6, color: '#92400e', marginTop: 5 }}>
                Conformément au règlement eIDAS (UE) n° 910/2014
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{contract.company_name}</Text>
          <Text style={styles.footerText}>Page 5/{totalPages}</Text>
        </View>
      </Page>
    </Document>
  );
};
