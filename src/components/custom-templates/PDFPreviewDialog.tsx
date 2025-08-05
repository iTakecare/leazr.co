import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, FileText, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExtendedCustomPdfTemplate } from "@/types/customPdfTemplateField";
import { CustomPdfRenderer } from "@/services/customPdfRenderer";
import { PdfViewer } from "./PdfViewer";
import { getTemplateImageUrl } from "@/utils/templateImageUtils";

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
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const totalPages = template.template_metadata?.pages_count || template.template_metadata?.pages_data?.length || template.pages_data?.length || 1;
  const isImageTemplate = (template as any).template_type === 'image-based';
  const hasImages = template.template_metadata?.pages_data && template.template_metadata.pages_data.length > 0;

  // Générer l'aperçu selon le type de template
  const generatePreview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isImageTemplate) {
        // Pour les templates d'images, pas besoin de génération PDF
        console.log('🖼️ Template d\'images détecté, affichage direct');
        if (!hasImages) {
          throw new Error("Ce template d'images n'a pas d'images associées");
        }
        setLoading(false);
        return;
      }
      
      console.log('🎬 Génération de l\'aperçu PDF...');
      console.log('📋 Template:', template.name);
      console.log('📊 Données d\'exemple:', sampleData);
      
      // Vérifier que le template a une URL PDF valide
      if (!template.original_pdf_url) {
        throw new Error("Le template n'a pas de fichier PDF associé");
      }
      
      // Tester l'accessibilité du PDF
      try {
        const testResponse = await fetch(template.original_pdf_url, { method: 'HEAD' });
        if (!testResponse.ok) {
          throw new Error(`Le fichier PDF n'est pas accessible (${testResponse.status})`);
        }
      } catch (fetchError) {
        throw new Error("Le fichier PDF de ce template n'existe plus ou n'est pas accessible");
      }
      
      // Utiliser le service de rendu personnalisé
      const pdfBytes = await CustomPdfRenderer.renderCustomPdf(template, sampleData);
      
      // Créer un blob et une URL pour l'affichage
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      
      console.log('✅ Aperçu PDF généré avec succès');
      toast({
        title: "Succès",
        description: "Aperçu généré avec succès",
      });
    } catch (error: any) {
      console.error('💥 Erreur lors de la génération de l\'aperçu:', error);
      let errorMessage = error.message || "Erreur lors de la génération de l'aperçu";
      
      // Messages d'erreur plus spécifiques
      if (errorMessage.includes('accessible')) {
        errorMessage = "Le fichier PDF n'est plus accessible. Veuillez re-uploader un PDF.";
      } else if (errorMessage.includes('associé')) {
        errorMessage = "Ce template n'a pas de fichier PDF. Veuillez en ajouter un.";
      } else if (errorMessage.includes('images associées')) {
        errorMessage = "Ce template d'images n'a pas d'images. Veuillez en ajouter.";
      }
      
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Télécharger le PDF
  const downloadPdf = async () => {
    if (!previewUrl) return;
    
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name}_apercu.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Succès",
        description: "PDF téléchargé",
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du téléchargement",
        variant: "destructive"
      });
    }
  };

  // Réinitialiser l'aperçu quand le dialog s'ouvre
  useEffect(() => {
    if (open && !previewUrl) {
      generatePreview();
    }
  }, [open]);

  // Nettoyer l'URL quand le composant se démonte
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {isImageTemplate ? <Image className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              Aperçu - {template.name}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {isImageTemplate ? 'Images' : 'PDF'}
              </Badge>
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
            
            {(previewUrl || isImageTemplate) && (
              <Button
                variant="default"
                size="sm"
                onClick={downloadPdf}
                disabled={loading || (isImageTemplate && !hasImages)}
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
              <div className="text-center max-w-md">
                <div className="mb-4">
                  <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-destructive" />
                  </div>
                  <p className="text-lg font-medium mb-2">Impossible de générer l'aperçu</p>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                </div>
                <div className="space-y-2">
                  <Button onClick={generatePreview} variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Réessayer
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Si le problème persiste, vérifiez que le template a un fichier PDF valide
                  </p>
                </div>
              </div>
            </div>
          )}

          {isImageTemplate && hasImages && !loading && !error ? (
            <div className="flex justify-center">
              <div
                className="border border-gray-300 bg-white shadow-lg relative"
                style={{
                  width: `${595 * zoomLevel}px`,
                  height: `${842 * zoomLevel}px`,
                  minHeight: '600px'
                }}
              >
                {(() => {
                  const currentPageData = template.template_metadata?.pages_data?.find(
                    page => page.page_number === currentPage
                  );
                  const imageUrl = currentPageData ? getTemplateImageUrl(currentPageData) : null;
                  
                  return imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`Page ${currentPage}`}
                      className="w-full h-full object-contain"
                      style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
                      onError={() => {
                        console.error('Erreur chargement image template');
                        setError('Impossible de charger l\'image du template');
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>Image non disponible pour cette page</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : previewUrl && !loading && !error ? (
            <div className="flex justify-center">
              <iframe
                src={`${previewUrl}#page=${currentPage}&zoom=${zoomLevel * 100}`}
                className="border border-gray-300 bg-white shadow-lg"
                style={{
                  width: `${595 * zoomLevel}px`,
                  height: `${842 * zoomLevel}px`,
                  minHeight: '600px'
                }}
                title="Aperçu PDF généré"
                onError={() => {
                  console.error('Erreur chargement iframe PDF généré');
                  setError('Impossible d\'afficher le PDF généré');
                }}
              />
            </div>
          ) : template.original_pdf_url && !loading && !error ? (
            <div className="flex justify-center">
              <div
                className="border border-gray-300 bg-white shadow-lg"
                style={{
                  width: `${595 * zoomLevel}px`,
                  height: `${842 * zoomLevel}px`,
                  minHeight: '600px'
                }}
              >
                <PdfViewer
                  url={template.original_pdf_url}
                  currentPage={currentPage}
                  zoom={zoomLevel}
                  className="w-full h-full"
                  onPageChange={(page) => setCurrentPage(page)}
                  onLoadError={(error) => {
                    console.error('PDF Viewer error:', error);
                    setError('Impossible de charger le PDF original');
                  }}
                />
              </div>
            </div>
          ) : !loading && !error && (
            <div className="flex justify-center items-center h-full">
              <div className="text-center text-gray-500">
                <p className="text-sm">Aucun aperçu disponible</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={generatePreview}
                  className="mt-2"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Générer l'aperçu
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};