import React, { useState } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { convertPdfPageToImage, getPdfPageCount, getPdfThumbnails } from '@/services/pdfConversionService';
import { toast } from 'sonner';

interface PdfUploaderProps {
  value?: {
    originalPdfUrl: string;
    pageNumber: number;
    convertedImageUrl?: string;
  };
  onChange: (value: {
    originalPdfUrl: string;
    pageNumber: number;
    convertedImageUrl?: string;
  } | undefined) => void;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ value, onChange }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [pageCount, setPageCount] = useState(0);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Veuillez sélectionner un fichier PDF');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('PDF trop volumineux (max 10MB)');
      return;
    }

    setIsProcessing(true);
    try {
      // Get page count
      const count = await getPdfPageCount(file);
      setPageCount(count);

      if (count > 20) {
        toast.warning(`Le PDF contient ${count} pages. Seules les 20 premières seront disponibles.`);
      }

      // Generate thumbnails
      const thumbs = await getPdfThumbnails(file);
      setThumbnails(thumbs);

      // Convert first page by default
      const convertedImage = await convertPdfPageToImage(file, { pageNumber: 1, quality: 'medium' });

      // Store as data URL (in production, upload to storage)
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange({
          originalPdfUrl: e.target?.result as string,
          pageNumber: 1,
          convertedImageUrl: convertedImage
        });
      };
      reader.readAsDataURL(file);

      toast.success('PDF importé avec succès');
    } catch (error: any) {
      console.error('Error processing PDF:', error);
      toast.error(error.message || 'Erreur lors du traitement du PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePageSelect = async (pageNumber: number) => {
    if (!value?.originalPdfUrl) return;

    setIsProcessing(true);
    try {
      // Convert data URL back to File
      const response = await fetch(value.originalPdfUrl);
      const blob = await response.blob();
      const file = new File([blob], 'document.pdf', { type: 'application/pdf' });

      // Convert selected page
      const convertedImage = await convertPdfPageToImage(file, { pageNumber, quality: 'medium' });

      onChange({
        ...value,
        pageNumber,
        convertedImageUrl: convertedImage
      });

      toast.success(`Page ${pageNumber} sélectionnée`);
    } catch (error: any) {
      console.error('Error converting page:', error);
      toast.error('Erreur lors de la conversion de la page');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    onChange(undefined);
    setThumbnails([]);
    setPageCount(0);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Fichier PDF</Label>
        <p className="text-sm text-muted-foreground">
          Format: PDF (max 10MB, max 20 pages)
        </p>
      </div>

      {value?.originalPdfUrl ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-accent/50">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">PDF importé</p>
                <p className="text-xs text-muted-foreground">{pageCount} page(s)</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRemove}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div>
            <Label>Sélectionner la page à utiliser</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {thumbnails.map((thumb, index) => (
                <button
                  key={index}
                  onClick={() => handlePageSelect(index + 1)}
                  disabled={isProcessing}
                  className={`relative border-2 rounded-lg overflow-hidden transition-all ${
                    value.pageNumber === index + 1
                      ? 'border-primary ring-2 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <img src={thumb} alt={`Page ${index + 1}`} className="w-full h-auto" />
                  <div className="absolute top-1 left-1 bg-background/90 px-2 py-0.5 rounded text-xs font-medium">
                    {index + 1}
                  </div>
                  {value.pageNumber === index + 1 && (
                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        ✓
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {value.convertedImageUrl && (
            <div>
              <Label>Aperçu de la page sélectionnée</Label>
              <div className="mt-2 border rounded-lg overflow-hidden max-h-96">
                <img 
                  src={value.convertedImageUrl} 
                  alt="Aperçu" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Conversion en cours...
            </div>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isProcessing ? (
              <>
                <Loader2 className="w-10 h-10 mb-3 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Traitement en cours...</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Cliquez pour importer</span> ou glissez-déposez
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF (max 10MB)
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>
      )}
    </div>
  );
};
