import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/integrations/supabase/client';
import { SignedContractPDFDocument, SignedContractPDFData } from '@/components/pdf/templates/SignedContractPDFDocument';
import { getPDFContentBlocksByPage, DEFAULT_PDF_CONTENT_BLOCKS } from '@/services/pdfContentService';
import { Loader2, FileDown, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Public page to generate and download a signed contract PDF on-demand
 * Used by email button links like /:companySlug/contract/:token/signed.pdf
 */
const PublicSignedContractDownload: React.FC = () => {
  const { token } = useParams<{ token: string; companySlug?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [contractData, setContractData] = useState<any>(null);

  useEffect(() => {
    if (token) {
      fetchContractAndDownload();
    } else {
      setError('Token de contrat manquant');
      setLoading(false);
    }
  }, [token]);

  const fetchContractAndDownload = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[PUBLIC-PDF] Fetching contract for token:', token);

      // Call RPC to get contract data
      const { data, error: rpcError } = await supabase.rpc('get_contract_for_signature', {
        p_token: token,
      });

      if (rpcError) {
        console.error('[PUBLIC-PDF] RPC error:', rpcError);
        throw new Error('Erreur lors de la récupération du contrat');
      }

      if (!data || data.error) {
        console.error('[PUBLIC-PDF] Contract not found:', data);
        throw new Error('Contrat non trouvé ou lien invalide');
      }

      console.log('[PUBLIC-PDF] Contract data received:', data);
      setContractData(data);

      // Auto-trigger download
      await downloadPDF(data);
    } catch (e: any) {
      console.error('[PUBLIC-PDF] Error:', e);
      setError(e.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Build SignedContractPDFData from RPC response exactly like signedContractPdfService.fetchContractDataForPDF does for admin.
   * The RPC now returns a flat JSONB object with all fields at root level.
   */
  const buildPdfData = async (rpcData: any): Promise<SignedContractPDFData> => {
    // RPC returns flat structure - client, company, company_customization, leaser, equipment are nested objects
    const client = rpcData.client || {};
    const company = rpcData.company || {};
    const customization = rpcData.company_customization || {};
    const leaser = rpcData.leaser || null;
    const equipment = rpcData.equipment || [];

    // Leaser display name logic matching admin
    let leaserDisplayName = rpcData.leaser_name || 'Non spécifié';
    if (leaser) {
      leaserDisplayName = leaser.name || rpcData.leaser_name || 'Non spécifié';
    }

    // is_self_leasing from leaser object
    const isSelfLeasing = leaser?.is_own_company === true;

    // Fetch contract template content from pdf_content_blocks
    let contractContent: Record<string, string> = {};
    try {
      if (company.id) {
        contractContent = await getPDFContentBlocksByPage(company.id, 'contract');
      }
    } catch (e) {
      console.warn('[PUBLIC-PDF] Failed to load contract template, using defaults');
      contractContent = DEFAULT_PDF_CONTENT_BLOCKS.contract;
    }
    if (Object.keys(contractContent).length === 0) {
      contractContent = DEFAULT_PDF_CONTENT_BLOCKS.contract;
    }

    // Build data matching admin exactly - use flat rpcData fields
    const pdfData: SignedContractPDFData = {
      id: rpcData.id,
      tracking_number: rpcData.tracking_number || `CON-${(rpcData.id || '').slice(0, 8)}`,
      created_at: rpcData.created_at,
      // Contract dates
      contract_start_date: rpcData.contract_start_date || undefined,
      contract_end_date: rpcData.contract_end_date || undefined,
      // Client - use data from nested client object
      client_name: client.name || 'Client',
      client_company: client.company || undefined,
      client_address: client.address || undefined,
      client_city: client.city || undefined,
      client_postal_code: client.postal_code || undefined,
      client_country: client.country || 'Belgique',
      client_vat_number: client.vat_number || undefined,
      client_phone: client.phone || undefined,
      client_email: client.email || undefined,
      client_iban: rpcData.client_iban || undefined,
      client_bic: rpcData.client_bic || undefined,
      // Leaser
      leaser_name: leaserDisplayName,
      is_self_leasing: isSelfLeasing,
      // Company from company_customizations matching admin flow
      company_name: customization.company_name || company.name || '',
      company_address: customization.company_address || undefined,
      company_email: customization.company_email || undefined,
      company_phone: customization.company_phone || undefined,
      company_vat_number: customization.company_vat_number || undefined,
      company_logo_url: customization.logo_url || company.logo_url || undefined,
      // Financial - use flat rpcData fields from RPC
      monthly_payment: rpcData.monthly_payment || 0,
      contract_duration: rpcData.contract_duration || 36,
      file_fee: rpcData.file_fee || 0,
      annual_insurance: rpcData.annual_insurance || 0,
      down_payment: rpcData.down_payment || 0,
      coefficient: rpcData.coefficient || 0,
      financed_amount: rpcData.financed_amount || 0,
      amount: rpcData.financed_amount || 0,
      // Equipment with complete details (margin now included from RPC)
      equipment: (equipment || []).map((eq: any) => ({
        title: eq.title,
        quantity: eq.quantity || 1,
        monthly_payment: eq.monthly_payment || 0,
        purchase_price: eq.purchase_price || 0,
        margin: eq.margin || 0,
        serial_number: eq.serial_number || undefined,
      })),
      // Signature - use flat rpcData fields
      signature_data: rpcData.contract_signature_data || undefined,
      signer_name: rpcData.contract_signer_name || client.name,
      signer_ip: rpcData.contract_signer_ip || undefined,
      signed_at: rpcData.contract_signed_at || undefined,
      // Contract template content
      contract_content: contractContent,
      // Brand
      primary_color: company.primary_color || '#33638e',
      // Remarks
      special_provisions: rpcData.remarks || undefined,
    };

    return pdfData;
  };

  const downloadPDF = async (data: any) => {
    try {
      setDownloading(true);

      const pdfData = await buildPdfData(data);

      console.log('[PUBLIC-PDF] Generating PDF with data:', {
        trackingNumber: pdfData.tracking_number,
        clientName: pdfData.client_name,
        equipmentCount: pdfData.equipment.length,
        hasSig: !!pdfData.signature_data,
        templateBlocks: Object.keys(pdfData.contract_content || {}).length,
        monthlyPayment: pdfData.monthly_payment,
        companyAddress: pdfData.company_address,
        leaserName: pdfData.leaser_name,
        isSelfLeasing: pdfData.is_self_leasing,
      });

      // Generate PDF blob
      const blob = await pdf(<SignedContractPDFDocument contract={pdfData} />).toBlob();

      // Create filename
      const filename = `Contrat ${pdfData.tracking_number} - ${pdfData.client_name}.pdf`.replace(/[/\\:*?"<>|]/g, '');

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('[PUBLIC-PDF] PDF downloaded:', filename);
    } catch (e: any) {
      console.error('[PUBLIC-PDF] Download error:', e);
      setError(e.message || 'Erreur lors de la génération du PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Préparation du téléchargement...</p>
            <p className="text-sm text-muted-foreground">Génération de votre contrat signé en cours</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4 border-destructive/50">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-lg font-medium text-destructive">Erreur</p>
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <Button variant="outline" onClick={() => fetchContractAndDownload()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 flex flex-col items-center gap-4">
          <FileDown className="h-12 w-12 text-primary" />
          <p className="text-lg font-medium">Contrat signé</p>
          <p className="text-sm text-muted-foreground text-center">
            {contractData?.tracking_number || 'Contrat'}
          </p>
          <Button 
            onClick={() => contractData && downloadPDF(contractData)} 
            disabled={downloading}
            className="gap-2"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Télécharger le PDF
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicSignedContractDownload;
