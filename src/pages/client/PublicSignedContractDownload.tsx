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

  const downloadPDF = async (data: any) => {
    try {
      setDownloading(true);

      // Fetch contract template content from pdf_content_blocks
      let contractContent: Record<string, string> = {};
      try {
        if (data.company?.id) {
          contractContent = await getPDFContentBlocksByPage(data.company.id, 'contract');
        }
      } catch (e) {
        console.warn('[PUBLIC-PDF] Failed to load contract template, using defaults');
        contractContent = DEFAULT_PDF_CONTENT_BLOCKS.contract;
      }

      if (Object.keys(contractContent).length === 0) {
        contractContent = DEFAULT_PDF_CONTENT_BLOCKS.contract;
      }

      // Transform RPC data to SignedContractPDFData format
      const pdfData: SignedContractPDFData = {
        id: data.id,
        tracking_number: data.contract_number || data.tracking_number || `CON-${data.id?.slice(0, 8) || 'UNKNOWN'}`,
        created_at: data.created_at,
        signed_at: data.contract_signed_at,
        // Client
        client_name: data.client?.name || 'Client',
        client_company: data.client?.company,
        client_address: data.client?.address,
        client_city: data.client?.city,
        client_postal_code: data.client?.postal_code,
        client_country: 'Belgique',
        client_vat_number: data.client?.vat_number,
        client_phone: data.client?.phone,
        client_email: data.client?.email,
        // Leaser
        leaser_name: data.leaser_name || 'Non spécifié',
        is_self_leasing: data.is_self_leasing || false,
        // Company
        company_name: data.company?.name || '',
        company_address: data.company?.address,
        company_email: data.company?.email,
        company_phone: data.company?.phone,
        company_logo_url: data.company?.logo_url,
        // Financial - use adjusted_monthly_payment from RPC
        monthly_payment: data.is_self_leasing && data.down_payment > 0 
          ? data.adjusted_monthly_payment 
          : data.monthly_payment,
        contract_duration: data.contract_duration || 36,
        down_payment: data.down_payment || 0,
        // Equipment
        equipment: (data.equipment || []).map((eq: any) => ({
          title: eq.title,
          quantity: eq.quantity || 1,
          monthly_payment: eq.monthly_payment || 0,
          purchase_price: eq.purchase_price || 0,
          margin: eq.margin || 0,
          serial_number: eq.serial_number,
        })),
        // Signature
        signer_name: data.contract_signer_name || data.client?.name,
        // Contract template content
        contract_content: contractContent,
        // Brand
        primary_color: '#33638e',
      };

      console.log('[PUBLIC-PDF] Generating PDF with data:', pdfData);

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
            {contractData?.contract_number || contractData?.tracking_number || 'Contrat'}
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
