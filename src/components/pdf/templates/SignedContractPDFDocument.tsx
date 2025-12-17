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
  client_vat_number?: string;
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
  // Equipment
  equipment: Array<{
    title: string;
    quantity: number;
    monthly_payment: number;
  }>;
  // Signature
  signature_data?: string;
  signer_name?: string;
  signer_ip?: string;
  // Contract content from template
  contract_content?: Record<string, string>;
  // Brand colors
  primary_color?: string;
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
  signatureSection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  signatureTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
    marginBottom: 12,
    textAlign: 'center',
  },
  signatureImage: {
    width: 180,
    height: 70,
    objectFit: 'contain',
    alignSelf: 'center',
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  signatureInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
  },
  signatureDetail: {
    fontSize: 7,
    color: '#166534',
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
    contract.client_city
  ].filter(Boolean).join(', ');

  // Calculate end date if not provided
  const endDate = contract.contract_end_date 
    ? formatDateShort(contract.contract_end_date)
    : calculateEndDate(contract.contract_start_date, contract.contract_duration);

  const placeholders: Record<string, string> = {
    '{{company_name}}': contract.company_name || '',
    '{{company_legal_form}}': 'SA', // Default, should be in customization
    '{{company_capital}}': '100.000', // Default
    '{{company_address}}': contract.company_address || '',
    '{{company_bce}}': contract.company_vat_number || '',
    '{{company_representative}}': '', // Could be added
    '{{company_iban}}': contract.company_iban || '',
    '{{company_bic}}': contract.company_bic || '',
    '{{client_name}}': contract.client_name || '',
    '{{client_company}}': contract.client_company || contract.client_name || '',
    '{{client_bce}}': contract.client_vat_number || '',
    '{{client_address}}': clientFullAddress || '',
    '{{client_representative}}': contract.signer_name || contract.client_name || '',
    '{{client_iban}}': contract.client_iban || '',
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
   * Render article content with proper line breaks for (i), (ii), (iii) formatting
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
      <View>
        <Text style={styles.companyInfo}>{contract.company_address}</Text>
        {contract.company_vat_number && (
          <Text style={styles.companyInfo}>TVA: {contract.company_vat_number}</Text>
        )}
        <Text style={styles.companyInfo}>Réf: {contract.tracking_number}</Text>
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

        {/* Parties */}
        {content.parties && (
          <View style={{ marginBottom: 15 }}>
            <Text style={styles.articleContent}>
              {stripHtml(replacePlaceholders(content.parties, contract))}
            </Text>
          </View>
        )}

        {/* Equipment Table */}
        <Text style={styles.sectionTitle}>Annexe 1 - Équipements loués</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 4 }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Qté</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>Mensualité HT</Text>
          </View>
          {contract.equipment?.map((eq, idx) => (
            <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { flex: 4 }]}>{eq.title}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{eq.quantity}</Text>
              <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>{formatCurrency(eq.monthly_payment)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { flex: 5 }]}>Total mensuel HT</Text>
            <Text style={[styles.totalValue, { flex: 2 }]}>{formatCurrency(contract.monthly_payment)}</Text>
          </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.infoBox}>
          <View style={styles.row}>
            <Text style={styles.label}>Durée du contrat :</Text>
            <Text style={styles.value}>{contract.contract_duration} mois</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Mensualité HT :</Text>
            <Text style={styles.value}>{formatCurrency(contract.monthly_payment)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total engagement :</Text>
            <Text style={styles.value}>{formatCurrency(contract.monthly_payment * contract.contract_duration)}</Text>
          </View>
          {contract.file_fee && contract.file_fee > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Frais de dossier :</Text>
              <Text style={styles.value}>{formatCurrency(contract.file_fee)}</Text>
            </View>
          )}
        </View>

        {/* SEPA */}
        {(contract.client_iban || contract.client_bic) && (
          <>
            <Text style={styles.sectionTitle}>Domiciliation SEPA</Text>
            <View style={styles.infoBox}>
              {contract.client_iban && (
                <View style={styles.row}>
                  <Text style={styles.label}>IBAN :</Text>
                  <Text style={styles.value}>{contract.client_iban}</Text>
                </View>
              )}
              {contract.client_bic && (
                <View style={styles.row}>
                  <Text style={styles.label}>BIC :</Text>
                  <Text style={styles.value}>{contract.client_bic}</Text>
                </View>
              )}
            </View>
          </>
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

        {/* Template signature block */}
        {content.signature && (
          <View style={{ marginTop: 15 }}>
            <Text style={styles.articleContent}>{stripHtml(replacePlaceholders(content.signature, contract))}</Text>
          </View>
        )}

        {/* Electronic Signature Section */}
        {contract.signature_data && (
          <View style={styles.signatureSection}>
            <Text style={styles.signatureTitle}>✓ CONTRAT SIGNÉ ÉLECTRONIQUEMENT</Text>
            
            <Image src={contract.signature_data} style={styles.signatureImage} />
            
            <View style={styles.signatureInfo}>
              <View>
                <Text style={styles.signatureDetail}>Signataire : {contract.signer_name || contract.client_name}</Text>
                <Text style={styles.signatureDetail}>Date : {formatDate(contract.signed_at)}</Text>
              </View>
              <View>
                {contract.signer_ip && (
                  <Text style={styles.signatureDetail}>Adresse IP : {contract.signer_ip}</Text>
                )}
                <Text style={styles.signatureDetail}>Référence : {contract.tracking_number}</Text>
              </View>
            </View>

            {(contract.client_iban || contract.client_bic) && (
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#dcfce7' }}>
                {contract.client_iban && (
                  <Text style={styles.signatureDetail}>IBAN confirmé : {contract.client_iban}</Text>
                )}
                {contract.client_bic && (
                  <Text style={styles.signatureDetail}>BIC : {contract.client_bic}</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Legal Notice */}
        <View style={{ marginTop: 15, padding: 8, backgroundColor: '#fef3c7', borderRadius: 4 }}>
          <Text style={{ fontSize: 6, color: '#92400e', lineHeight: 1.4 }}>
            Ce document a valeur de contrat. La signature électronique a la même valeur juridique qu'une signature manuscrite 
            conformément au règlement eIDAS (UE) n° 910/2014. Ce contrat engage les deux parties selon les termes convenus.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{contract.company_name}</Text>
          <Text style={styles.footerText}>Page 5/{totalPages}</Text>
        </View>
      </Page>
    </Document>
  );
};
