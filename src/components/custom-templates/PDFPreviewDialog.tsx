import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ExtendedCustomPdfTemplate } from "@/types/customPdfTemplateField";
import { CustomPdfRenderer } from "@/services/customPdfRenderer";
import { Document, Page, pdfjs } from 'react-pdf';

// Laisser react-pdf gérer automatiquement son worker interne
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ExtendedCustomPdfTemplate;
  sampleData: Record<string, any>;
}

export const PDFPreviewDialog: React.FC<PDFPreviewDialogProps> = ({
  open,
  onOpenChange,
  template,
  sampleData
}) => {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);

  const totalPages = template.template_metadata?.pages_count || template.template_metadata?.pages_data?.length || template.pages_data?.length || 1;

  // Générer l'aperçu PDF
  const generatePreview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🎬 Génération de l\'aperçu PDF...');
      console.log('📋 Template:', template.name);
      console.log('📊 Données d\'exemple:', sampleData);
      
      // Utiliser le service de rendu personnalisé
      const pdfBytes = await CustomPdfRenderer.renderCustomPdf(template, sampleData);
      
      // Stocker les données PDF
      setPdfData(pdfBytes);
      
      console.log('✅ Aperçu PDF généré avec succès');
      toast.success("Aperçu généré avec succès");
    } catch (error: any) {
      console.error('💥 Erreur lors de la génération de l\'aperçu:', error);
      setError(error.message || "Erreur lors de la génération de l'aperçu");
      toast.error("Impossible de générer l'aperçu");
    } finally {
      setLoading(false);
    }
  };

  // Télécharger le PDF
  const downloadPdf = async () => {
    if (!pdfData) return;
    
    try {
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name}_apercu.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("PDF téléchargé");
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  // Callbacks pour react-pdf
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Erreur lors du chargement du PDF:', error);
    setError("Erreur lors du chargement du PDF");
  };

  // Réinitialiser l'aperçu quand le dialog s'ouvre
  useEffect(() => {
    if (open && !pdfData) {
      generatePreview();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Aperçu - {template.name}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {template.fields.length} champ{template.fields.length > 1 ? 's' : ''}
              </Badge>
              {totalPages > 1 && (
                <Badge variant="outline">
                  Page {currentPage} / {totalPages}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            {/* Navigation pages */}
            {totalPages > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Contrôles de zoom */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
              disabled={loading}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2 min-w-[60px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
              disabled={loading}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            {/* Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={generatePreview}
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            {pdfData && (
              <Button
                variant="default"
                size="sm"
                onClick={downloadPdf}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            )}
          </div>
        </div>

        {/* Contenu de l'aperçu */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Génération de l'aperçu en cours...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">Erreur de génération</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Une erreur est survenue lors de la génération de l'aperçu PDF.
                </p>
                <p className="text-xs text-destructive mb-4">{error}</p>
                <Button onClick={generatePreview} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            </div>
          )}

          {pdfData && !loading && !error && (
            <div className="flex justify-center">
              <Document
                file={{ data: pdfData }}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                className="border border-gray-300 bg-white shadow-lg"
              >
                <Page
                  pageNumber={currentPage}
                  scale={zoomLevel}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="bg-white"
                />
              </Document>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};