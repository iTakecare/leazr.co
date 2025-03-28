import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { Eye, Plus, Loader2, File, Settings, AlertCircle } from "lucide-react";
import PageImage from "./pdf-preview/PageImage";
import PDFTemplateImageUploader from "./PDFTemplateImageUploader";
import { jsPDF } from "jspdf";
import { getSiteSettings } from "@/services/settingsService";
import { createBucketIfNotExists as ensureBucket } from "@/services/fileStorage";

interface TemplateImage {
  id: string;
  name: string;
  url: string;
  page: number;
}

const NewPDFTemplateManager = () => {
  const [templateImages, setTemplateImages] = useState<TemplateImage[]>([]);
  const [selectedPage, setSelectedPage] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(595);
  const [pageHeight, setPageHeight] = useState<number>(842);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTemplateImagesChange = (images: TemplateImage[]) => {
    console.log("handleTemplateImagesChange called with:", images);
    setTemplateImages(images);
  };

  const handlePageSelect = (pageIndex: number) => {
    console.log("handlePageSelect called with:", pageIndex);
    setSelectedPage(pageIndex);
    setPageLoaded(false);
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageWidth(Number(e.target.value));
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageHeight(Number(e.target.value));
  };

  const handleGeneratePDF = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Vérifier qu'il y a au moins une image
      if (!templateImages || templateImages.length === 0) {
        setError("Veuillez uploader au moins une image.");
        toast.error("Veuillez uploader au moins une image.");
        return;
      }
      
      // Créer un nouveau document PDF
      const pdfDoc = await PDFDocument.create();
      
      // Ajouter chaque image comme une nouvelle page
      for (const image of templateImages) {
        try {
          // Télécharger l'image
          const imageResponse = await fetch(image.url);
          const imageBytes = await imageResponse.arrayBuffer();
          
          // Déterminer le type d'image
          let imageType = 'jpg';
          if (image.url.toLowerCase().endsWith('.png')) {
            imageType = 'png';
          } else if (image.url.toLowerCase().endsWith('.jpeg') || image.url.toLowerCase().endsWith('.jpg')) {
            imageType = 'jpg';
          } else if (image.url.toLowerCase().endsWith('.webp')) {
            imageType = 'webp';
          }
          
          let pdfImage;
          if (imageType === 'png') {
            pdfImage = await pdfDoc.embedPng(imageBytes);
          } else if (imageType === 'jpg') {
            pdfImage = await pdfDoc.embedJpg(imageBytes);
          } else if (imageType === 'webp') {
            pdfImage = await pdfDoc.embedPng(imageBytes); // Fallback to PNG
          } else {
            console.warn(`Type d'image non supporté, conversion en PNG: ${image.url}`);
            pdfImage = await pdfDoc.embedPng(imageBytes); // Fallback to PNG
          }
          
          // Ajouter une nouvelle page
          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          
          // Calculer les dimensions pour centrer l'image
          const imageWidth = pdfImage.width;
          const imageHeight = pdfImage.height;
          const x = (pageWidth - imageWidth) / 2;
          const y = (pageHeight - imageHeight) / 2;
          
          // Dessiner l'image sur la page
          page.drawImage(pdfImage, {
            x,
            y,
            width: imageWidth,
            height: imageHeight,
          });
        } catch (e) {
          console.error(`Erreur lors du traitement de l'image ${image.name}:`, e);
          toast.error(`Erreur lors du traitement de l'image ${image.name}`);
        }
      }
      
      // Convertir le PDF en bytes
      const pdfBytes = await pdfDoc.save();
      
      // Sauvegarder le PDF
      saveAs(new Blob([pdfBytes], { type: "application/pdf" }), "template.pdf");
      toast.success("PDF généré avec succès!");
    } catch (e) {
      console.error("Erreur lors de la génération du PDF:", e);
      setError("Erreur lors de la génération du PDF.");
      toast.error("Erreur lors de la génération du PDF.");
    } finally {
      setIsGenerating(false);
    }
  }, [templateImages, pageWidth, pageHeight]);

  const handleGeneratePDFLegacy = () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Vérifier qu'il y a au moins une image
      if (!templateImages || templateImages.length === 0) {
        setError("Veuillez uploader au moins une image.");
        toast.error("Veuillez uploader au moins une image.");
        return;
      }
      
      // Créer un nouveau document jsPDF
      const pdf = new jsPDF({
        orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [pageWidth, pageHeight]
      });
      
      // Ajouter chaque image comme une nouvelle page
      templateImages.forEach((image, index) => {
        try {
          // Ajouter la page (sauf pour la première image)
          if (index > 0) {
            pdf.addPage([pageWidth, pageHeight]);
          }
          
          // Calculer les dimensions pour centrer l'image
          const imgWidth = pageWidth;
          const imgHeight = pageHeight;
          const x = 0;
          const y = 0;
          
          // Ajouter l'image à la page
          pdf.addImage(image.url, 'JPEG', x, y, imgWidth, imgHeight);
        } catch (e) {
          console.error(`Erreur lors du traitement de l'image ${image.name}:`, e);
          toast.error(`Erreur lors du traitement de l'image ${image.name}`);
        }
      });
      
      // Sauvegarder le PDF
      pdf.save("template.pdf");
      toast.success("PDF généré avec succès!");
    } catch (e) {
      console.error("Erreur lors de la génération du PDF:", e);
      setError("Erreur lors de la génération du PDF.");
      toast.error("Erreur lors de la génération du PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const siteSettings = await getSiteSettings();
        setSettings(siteSettings);
      } catch (e) {
        console.error("Erreur lors du chargement des paramètres:", e);
        setError("Erreur lors du chargement des paramètres.");
        toast.error("Erreur lors du chargement des paramètres.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-lg font-medium">Gestion du modèle PDF</h2>
          <p className="text-sm text-muted-foreground">
            Configurez les images qui seront utilisées comme modèle pour générer les PDFs.
          </p>
          
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <strong className="font-medium">Erreur</strong>
              </div>
              <p className="leading-relaxed text-sm">{error}</p>
            </div>
          )}
          
          <Separator />
          
          <PDFTemplateImageUploader
            templateImages={templateImages}
            onChange={handleTemplateImagesChange}
            selectedPage={selectedPage}
            onPageSelect={handlePageSelect}
          />
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pageWidth">Largeur de la page (px)</Label>
              <Input
                type="number"
                id="pageWidth"
                value={pageWidth}
                onChange={handleWidthChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pageHeight">Hauteur de la page (px)</Label>
              <Input
                type="number"
                id="pageHeight"
                value={pageHeight}
                onChange={handleHeightChange}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleGeneratePDF} 
              disabled={isGenerating || templateImages.length === 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <File className="mr-2 h-4 w-4" />
                  Générer le PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {templateImages.length > 0 && (
        <Card>
          <CardContent>
            <h3 className="text-sm font-medium">Aperçu de la page {selectedPage + 1}</h3>
            <div className="w-full h-80 border rounded-md relative">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <PageImage
                  pageImage={templateImages[selectedPage]}
                  currentPage={selectedPage}
                  setPageLoaded={setPageLoaded}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NewPDFTemplateManager;
