import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, FileText, Eye, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadFile, ensureBucket } from "@/services/fileStorage";
import { useAuth } from "@/context/AuthContext";
import { PDFDocument } from "pdf-lib";

interface PdfTemplateUploaderProps {
  onTemplateUploaded: (templateUrl: string, metadata: any) => void;
  currentTemplateUrl?: string;
}

export const PdfTemplateUploader: React.FC<PdfTemplateUploaderProps> = ({
  onTemplateUploaded,
  currentTemplateUrl
}) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedTemplate, setUploadedTemplate] = useState<string | null>(currentTemplateUrl || null);

  const validatePdfFile = (file: File): { isValid: boolean; error?: string } => {
    // Vérifier le type MIME
    if (file.type !== 'application/pdf') {
      return { isValid: false, error: 'Seuls les fichiers PDF sont acceptés' };
    }

    // Vérifier la taille (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'Le fichier PDF ne peut pas dépasser 10MB' };
    }

    return { isValid: true };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const validation = validatePdfFile(file);
    
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setIsUploading(true);

    try {
      // Assurer que le bucket existe
      await ensureBucket("pdf-templates");

      // Upload du fichier
      const fileName = `template-${Date.now()}.pdf`;
      const uploadedUrl = await uploadFile("pdf-templates", file, fileName);
      
      if (uploadedUrl) {
        // Analyser le PDF avec pdf-lib pour extraire le nombre de pages
        console.log('🔍 Analyse du PDF pour détecter les pages...');
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();
        
        console.log(`📄 PDF détecté avec ${pageCount} page(s)`);
        
        // Générer les métadonnées de pages
        const pages_data = [];
        for (let i = 0; i < pageCount; i++) {
          const page = pdfDoc.getPage(i);
          const { width, height } = page.getSize();
          
          pages_data.push({
            page_number: i + 1,
            image_url: "", // Sera généré plus tard si nécessaire
            dimensions: { width, height }
          });
        }

        const metadata = {
          file_size: file.size,
          file_type: file.type,
          upload_date: new Date().toISOString(),
          original_name: file.name,
          pages_count: pageCount,
          pages_data: pages_data
        };

        setUploadedTemplate(uploadedUrl);
        onTemplateUploaded(uploadedUrl, metadata);
        toast.success(`Template PDF téléchargé avec succès (${pageCount} page${pageCount > 1 ? 's' : ''})`);
      } else {
        throw new Error("Échec du téléchargement");
      }
    } catch (error) {
      console.error("Erreur upload template:", error);
      toast.error("Erreur lors du téléchargement du template PDF");
    } finally {
      setIsUploading(false);
    }
  }, [onTemplateUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  const removeTemplate = () => {
    setUploadedTemplate(null);
    // Optionnel : appeler onTemplateUploaded avec null pour nettoyer
  };

  const openTemplate = () => {
    if (uploadedTemplate) {
      window.open(uploadedTemplate, '_blank');
    }
  };

  // If user is not authenticated, show auth required message
  if (!user) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Vous devez être connecté pour télécharger des templates PDF. 
          Veuillez vous connecter pour continuer.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {uploadedTemplate ? (
        <Card className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Template PDF téléchargé</p>
                <p className="text-sm text-muted-foreground">
                  Prêt pour configuration des zones
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openTemplate}
              >
                <Eye className="h-4 w-4 mr-2" />
                Aperçu
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={removeTemplate}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card
          {...getRootProps()}
          className={`cursor-pointer border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            {isUploading ? (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  Téléchargement du template PDF...
                </p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-muted p-4">
                  {isDragActive ? (
                    <Upload className="h-8 w-8 text-primary" />
                  ) : (
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {isDragActive
                      ? "Déposez le template PDF ici"
                      : "Glissez & déposez votre template PDF, ou cliquez pour sélectionner"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF uniquement, max 10MB
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};