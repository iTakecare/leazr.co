import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

// Contract PDF data structure
export interface SignedContractPDFData {
  id: string;
  tracking_number: string;
  created_at: string;
  signed_at?: string;
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
  // Contract content
  contract_content?: Record<string, string>;
  // Brand colors
  primary_color?: string;
}

const createStyles = (primaryColor: string = '#33638e') => StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: primaryColor,
  },
  logo: {
    width: 100,
    height: 'auto',
    objectFit: 'contain',
  },
  companyInfo: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'right',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: primaryColor,
    textAlign: 'center',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: primaryColor,
    marginTop: 15,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 4,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: primaryColor,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 9,
    color: '#64748b',
  },
  value: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  table: {
    width: '100%',
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: primaryColor,
    padding: 8,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 8,
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 8,
  },
  tableCell: {
    fontSize: 9,
    color: '#1e293b',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: primaryColor,
    padding: 10,
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  totalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textAlign: 'right',
  },
  signatureSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  signatureTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
    marginBottom: 15,
    textAlign: 'center',
  },
  signatureImage: {
    width: 200,
    height: 80,
    objectFit: 'contain',
    alignSelf: 'center',
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  signatureInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
  },
  signatureDetail: {
    fontSize: 8,
    color: '#166534',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#64748b',
  },
  conditionsText: {
    fontSize: 7,
    color: '#64748b',
    lineHeight: 1.4,
    marginBottom: 5,
  },
  articleTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
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

interface SignedContractPDFDocumentProps {
  contract: SignedContractPDFData;
}

export const SignedContractPDFDocument: React.FC<SignedContractPDFDocumentProps> = ({ contract }) => {
  const styles = createStyles(contract.primary_color);

  return (
    <Document>
      {/* Page 1: Cover & Client Info */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {contract.company_logo_url ? (
              <Image src={contract.company_logo_url} style={styles.logo} />
            ) : (
              <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: contract.primary_color || '#33638e' }}>
                {contract.company_name}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.companyInfo}>{contract.company_address}</Text>
            {contract.company_vat_number && (
              <Text style={styles.companyInfo}>TVA: {contract.company_vat_number}</Text>
            )}
            {contract.company_email && (
              <Text style={styles.companyInfo}>{contract.company_email}</Text>
            )}
            {contract.company_phone && (
              <Text style={styles.companyInfo}>{contract.company_phone}</Text>
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Contrat de Location</Text>
        <Text style={styles.subtitle}>
          Référence : {contract.tracking_number}
        </Text>

        {/* Client Section */}
        <Text style={styles.sectionTitle}>Locataire</Text>
        <View style={styles.infoBox}>
          <View style={styles.row}>
            <Text style={styles.label}>Société :</Text>
            <Text style={styles.value}>{contract.client_company || contract.client_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contact :</Text>
            <Text style={styles.value}>{contract.client_name}</Text>
          </View>
          {contract.client_address && (
            <View style={styles.row}>
              <Text style={styles.label}>Adresse :</Text>
              <Text style={styles.value}>
                {contract.client_address}{contract.client_postal_code ? `, ${contract.client_postal_code}` : ''}{contract.client_city ? ` ${contract.client_city}` : ''}
              </Text>
            </View>
          )}
          {contract.client_vat_number && (
            <View style={styles.row}>
              <Text style={styles.label}>N° TVA :</Text>
              <Text style={styles.value}>{contract.client_vat_number}</Text>
            </View>
          )}
          {contract.client_email && (
            <View style={styles.row}>
              <Text style={styles.label}>Email :</Text>
              <Text style={styles.value}>{contract.client_email}</Text>
            </View>
          )}
        </View>

        {/* Leaser Section */}
        <Text style={styles.sectionTitle}>Bailleur</Text>
        <View style={styles.infoBox}>
          <View style={styles.row}>
            <Text style={styles.label}>Organisme :</Text>
            <Text style={styles.value}>
              {contract.is_self_leasing ? `${contract.company_name} (Leasing en propre)` : contract.leaser_name}
            </Text>
          </View>
        </View>

        {/* Equipment Table */}
        <Text style={styles.sectionTitle}>Équipements</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 4 }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Qté</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>Mensualité</Text>
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
        <Text style={styles.sectionTitle}>Récapitulatif Financier</Text>
        <View style={styles.infoBox}>
          <View style={styles.row}>
            <Text style={styles.label}>Mensualité HT :</Text>
            <Text style={styles.value}>{formatCurrency(contract.monthly_payment)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Durée du contrat :</Text>
            <Text style={styles.value}>{contract.contract_duration} mois</Text>
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

        {/* SEPA Section */}
        {(contract.client_iban || contract.client_bic) && (
          <>
            <Text style={styles.sectionTitle}>Mandat de Domiciliation SEPA</Text>
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

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{contract.company_name}</Text>
          <Text style={styles.footerText}>Page 1/2</Text>
        </View>
      </Page>

      {/* Page 2: Signature */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {contract.company_logo_url ? (
              <Image src={contract.company_logo_url} style={styles.logo} />
            ) : (
              <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: contract.primary_color || '#33638e' }}>
                {contract.company_name}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.companyInfo}>Contrat : {contract.tracking_number}</Text>
          </View>
        </View>

        {/* Conditions Summary */}
        <Text style={styles.sectionTitle}>Conditions Générales</Text>
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.articleTitle}>Article 1 - Objet du contrat</Text>
          <Text style={styles.conditionsText}>
            Le présent contrat a pour objet la mise à disposition des équipements listés ci-dessus en location longue durée.
          </Text>
          
          <Text style={styles.articleTitle}>Article 2 - Durée</Text>
          <Text style={styles.conditionsText}>
            Le contrat est conclu pour une durée de {contract.contract_duration} mois à compter de la date de signature.
          </Text>
          
          <Text style={styles.articleTitle}>Article 3 - Paiement</Text>
          <Text style={styles.conditionsText}>
            Les loyers seront prélevés mensuellement par domiciliation bancaire SEPA sur le compte indiqué.
          </Text>
          
          <Text style={styles.articleTitle}>Article 4 - Propriété</Text>
          <Text style={styles.conditionsText}>
            Les équipements restent la propriété exclusive du bailleur pendant toute la durée du contrat.
          </Text>
          
          <Text style={styles.articleTitle}>Article 5 - Entretien</Text>
          <Text style={styles.conditionsText}>
            Le locataire s'engage à utiliser les équipements en bon père de famille et à les maintenir en bon état.
          </Text>
        </View>

        {/* Signature Section */}
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
          </View>
        )}

        {/* Legal Notice */}
        <View style={{ marginTop: 20, padding: 10, backgroundColor: '#fef3c7', borderRadius: 4 }}>
          <Text style={{ fontSize: 7, color: '#92400e', lineHeight: 1.4 }}>
            Ce document a valeur de contrat. La signature électronique a la même valeur juridique qu'une signature manuscrite 
            conformément au règlement eIDAS (UE) n° 910/2014. Ce contrat engage les deux parties selon les termes convenus.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{contract.company_name}</Text>
          <Text style={styles.footerText}>Page 2/2</Text>
        </View>
      </Page>
    </Document>
  );
};
