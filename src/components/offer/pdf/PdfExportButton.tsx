import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { exportOfferAsPdf } from '@/services/offerPdfExport';
import { toast } from 'sonner';

interface PdfExportButtonProps {
  offerId: string;
  templateId?: string;
  customizations?: any;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export const PdfExportButton: React.FC<PdfExportButtonProps> = ({
  offerId,
  templateId,
  customizations,
  variant = 'default',
  size = 'default',
  className,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportOfferAsPdf(offerId, {
        templateId,
        customizations,
      });
      
      toast.success(`PDF téléchargé : ${result.fileName}`);
    } catch (error: any) {
      console.error('[PDF EXPORT BUTTON] Error:', error);
      toast.error(error.message || 'Erreur lors de l\'export du PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant={variant}
      size={size}
      className={className}
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Export en cours...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Exporter en PDF
        </>
      )}
    </Button>
  );
};
