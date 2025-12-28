import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getSignedContractStoragePath } from '@/services/signedContractPdfPublicData';
import { Loader2, FileDown, AlertCircle, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Public page to download a pre-generated signed contract PDF
 * Used by email button links like /:companySlug/contract/:token/signed.pdf
 * 
 * This page ONLY serves stored PDFs - it does NOT regenerate on the fly.
 */
const PublicSignedContractDownload: React.FC = () => {
  const { token } = useParams<{ token: string; companySlug?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [contractInfo, setContractInfo] = useState<{ trackingNumber: string; clientName: string } | null>(null);

  useEffect(() => {
    if (token) {
      fetchAndDownload();
    } else {
      setError('Token de contrat manquant');
      setLoading(false);
    }
  }, [token]);

  const fetchAndDownload = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[PUBLIC-PDF-DOWNLOAD] Fetching contract for token:', token);

      // Call RPC to get contract data (only for tracking_number and to check if signed)
      const { data, error: rpcError } = await supabase.rpc('get_contract_for_signature', {
        p_token: token,
      });

      if (rpcError) {
        console.error('[PUBLIC-PDF-DOWNLOAD] RPC error:', rpcError);
        throw new Error('Erreur lors de la récupération du contrat');
      }

      if (!data || data.error) {
        console.error('[PUBLIC-PDF-DOWNLOAD] Contract not found:', data);
        throw new Error('Contrat non trouvé ou lien invalide');
      }

      // Fallback: tracking_number -> contract_number -> ID prefix
      const trackingNumber = data.tracking_number || data.contract_number || `CON-${(data.id || '').slice(0, 8)}`;
      const clientName = data.client?.name || data.client_name || 'Client';
      
      setContractInfo({ trackingNumber, clientName });

      console.log('[PUBLIC-PDF-DOWNLOAD] Contract found:', { trackingNumber, hasPdfUrl: !!data.signed_contract_pdf_url });

      // Check if we have a stored PDF URL
      if (data.signed_contract_pdf_url) {
        console.log('[PUBLIC-PDF-DOWNLOAD] Using stored PDF URL:', data.signed_contract_pdf_url);
        await downloadFromUrl(data.signed_contract_pdf_url, trackingNumber, clientName);
        return;
      }

      // Fallback: try to get PDF from storage using deterministic path
      const storagePath = getSignedContractStoragePath(trackingNumber);
      console.log('[PUBLIC-PDF-DOWNLOAD] Trying storage path:', storagePath);

      const { data: urlData } = supabase.storage
        .from('signed-contracts')
        .getPublicUrl(storagePath);

      if (urlData?.publicUrl) {
        // Check if file actually exists by trying to fetch it
        const checkResponse = await fetch(urlData.publicUrl, { method: 'HEAD' });
        
        if (checkResponse.ok) {
          console.log('[PUBLIC-PDF-DOWNLOAD] Found PDF in storage');
          await downloadFromUrl(urlData.publicUrl, trackingNumber, clientName);
          return;
        }
      }

      // No PDF found
      throw new Error('Le PDF du contrat signé n\'est pas encore disponible. Veuillez réessayer dans quelques instants.');

    } catch (e: any) {
      console.error('[PUBLIC-PDF-DOWNLOAD] Error:', e);
      setError(e.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const downloadFromUrl = async (url: string, trackingNumber: string, clientName: string) => {
    // NOTE: Some browsers/blockers can prevent programmatic cross-origin downloads.
    // Since the PDF is already stored in a *public* Supabase bucket, the most reliable
    // behavior for a public link is to redirect the user straight to the file URL.
    try {
      setDownloading(true);

      // Add cache buster to force fresh download (avoid CDN/browser cache)
      const cacheBustedUrl = url.includes('?') 
        ? `${url}&v=${Date.now()}` 
        : `${url}?v=${Date.now()}`;

      // Best-effort validation: if we can fetch the first bytes and it's not a real PDF,
      // show a clear error instead of redirecting to a corrupted file.
      try {
        const res = await fetch(cacheBustedUrl, {
          method: 'GET',
          headers: {
            Range: 'bytes=0-1023',
          },
        });

        if (res.ok) {
          const buf = await res.arrayBuffer();
          const bytes = new Uint8Array(buf);
          const magic = String.fromCharCode(...Array.from(bytes.slice(0, 5)));

          if (magic !== '%PDF-') {
            throw new Error('Le PDF stocké semble corrompu. Veuillez demander la régénération du contrat.');
          }
        }
      } catch (e) {
        // If validation fails due to CORS/network, don't block the download.
        // Only block when we are confident the file is corrupted.
        if (e instanceof Error && e.message.includes('corrompu')) {
          throw e;
        }
        console.warn('[PUBLIC-PDF-DOWNLOAD] PDF validation skipped:', e);
      }

      console.log('[PUBLIC-PDF-DOWNLOAD] Redirecting to stored PDF:', {
        url: cacheBustedUrl,
        trackingNumber,
        clientName,
      });

      window.location.assign(cacheBustedUrl);
      setDownloadSuccess(true);
    } catch (e: any) {
      console.error('[PUBLIC-PDF-DOWNLOAD] Redirect error:', e);
      throw new Error(e?.message || 'Impossible d\'ouvrir le PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setDownloadSuccess(false);
    fetchAndDownload();
  };

  const handleManualDownload = async () => {
    if (!contractInfo) return;
    
    try {
      setDownloading(true);
      setError(null);

      const storagePath = getSignedContractStoragePath(contractInfo.trackingNumber);
      const { data: urlData } = supabase.storage
        .from('signed-contracts')
        .getPublicUrl(storagePath);

      if (urlData?.publicUrl) {
        await downloadFromUrl(urlData.publicUrl, contractInfo.trackingNumber, contractInfo.clientName);
      } else {
        throw new Error('PDF non disponible');
      }
    } catch (e: any) {
      setError(e.message || 'Erreur lors du téléchargement');
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
            <p className="text-sm text-muted-foreground">Récupération de votre contrat signé</p>
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
            <p className="text-lg font-medium text-destructive">PDF non disponible</p>
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <Button variant="outline" onClick={handleRetry}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (downloadSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-medium">Téléchargement terminé</p>
            <p className="text-sm text-muted-foreground text-center">
              {contractInfo?.trackingNumber || 'Contrat'}
            </p>
            <Button 
              onClick={handleManualDownload} 
              disabled={downloading}
              variant="outline"
              className="gap-2"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Téléchargement...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Télécharger à nouveau
                </>
              )}
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
            {contractInfo?.trackingNumber || 'Contrat'}
          </p>
          <Button 
            onClick={handleManualDownload} 
            disabled={downloading}
            className="gap-2"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Téléchargement...
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
