import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Eye } from 'lucide-react';
import { previewOfferPdf } from '@/services/offerPdfExport';
import { toast } from 'sonner';

interface PdfPreviewProps {
  offerId: string;
  templateId: string;
  customizations?: any;
  onDownload?: () => void;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  offerId,
  templateId,
  customizations,
  onDownload,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generatePreview = async () => {
    setLoading(true);
    try {
      const url = await previewOfferPdf(offerId, {
        templateId,
        customizations,
      });
      
      // Nettoyer l'ancienne URL si elle existe
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      setPreviewUrl(url);
    } catch (error: any) {
      console.error('[PDF PREVIEW] Error:', error);
      toast.error(error.message || 'Erreur lors de la prévisualisation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePreview();

    // Cleanup: révoquer l'URL lors du démontage
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [offerId, templateId, customizations]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Aperçu du PDF</h3>
          <p className="text-sm text-muted-foreground">
            Prévisualisation en temps réel de votre offre
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generatePreview}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Eye className="w-4 h-4 mr-2" />
            )}
            Rafraîchir
          </Button>

          {onDownload && (
            <Button
              size="sm"
              onClick={onDownload}
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger PDF
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-[600px] bg-muted">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Génération de l'aperçu...
              </p>
            </div>
          </div>
        ) : previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-[600px] border-0"
            title="Aperçu PDF"
          />
        ) : (
          <div className="flex items-center justify-center h-[600px] bg-muted">
            <p className="text-sm text-muted-foreground">
              Aucun aperçu disponible
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
