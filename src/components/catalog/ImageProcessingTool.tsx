
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Search, ImageIcon, Loader2, Check, X, Download, Wand2 } from "lucide-react";
import { removeBackground } from "@/utils/imageProcessor";

interface ImageProcessingToolProps {
  productName: string;
  productBrand: string;
  onImageProcessed: (file: File) => void;
}

const ImageProcessingTool: React.FC<ImageProcessingToolProps> = ({
  productName,
  productBrand,
  onImageProcessed
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<Blob | null>(null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [isBackgroundRemoved, setIsBackgroundRemoved] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset processing state
    setIsProcessing(false);
    setProcessedImage(null);
    setProcessedPreview(null);
    setIsBackgroundRemoved(false);
    
    // Set original image
    setOriginalImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setOriginalPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Generate search query if empty
    if (!searchQuery) {
      const query = `${productBrand} ${productName}`.trim();
      setSearchQuery(query || file.name);
    }
  };

  const handleBackgroundRemoval = async () => {
    if (!originalImage || !originalPreview) {
      toast.error("Veuillez d'abord sélectionner une image");
      return;
    }

    setIsProcessing(true);
    try {
      // Load image for processing
      const img = new Image();
      img.src = originalPreview;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Process image
      const processedBlob = await removeBackground(img);
      
      // Create preview
      const url = URL.createObjectURL(processedBlob);
      setProcessedPreview(url);
      setProcessedImage(processedBlob);
      setIsBackgroundRemoved(true);
      toast.success("Arrière-plan supprimé avec succès");
    } catch (error) {
      console.error("Erreur lors de la suppression de l'arrière-plan:", error);
      toast.error("Erreur lors de la suppression de l'arrière-plan");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseProcessedImage = () => {
    if (!processedImage) {
      toast.error("Aucune image traitée disponible");
      return;
    }

    // Create SEO-friendly filename
    const cleanBrand = productBrand?.replace(/[^a-zA-Z0-9]/g, '-') || 'brand';
    const cleanModel = productName?.replace(/[^a-zA-Z0-9]/g, '-') || 'product';
    const timestamp = Date.now();
    const filename = `${cleanBrand}-${cleanModel}-iTakecare-leasing-informatique-reconditionne-${timestamp}.webp`;

    // Convert blob to file with SEO filename
    const file = new File([processedImage], filename, { type: 'image/webp' });
    
    // Pass the processed file to parent component
    onImageProcessed(file);
    
    toast.success("Image optimisée ajoutée");
  };

  return (
    <Card className="mt-4 border-dashed border-primary/40 bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center">
          <Wand2 className="h-4 w-4 mr-2 text-primary" />
          Assistant de traitement d'image
        </CardTitle>
        <CardDescription>
          Optimisez vos images de produits en quelques clics (suppression d'arrière-plan, optimisation SEO)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="product-image">Sélectionner une image</Label>
          <Input
            id="product-image"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="cursor-pointer"
          />
        </div>

        {originalPreview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Image originale</div>
              <div className="relative border rounded-md overflow-hidden bg-white aspect-square flex items-center justify-center">
                <img
                  src={originalPreview}
                  alt="Image originale"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Image traitée</div>
              <div className="relative border rounded-md overflow-hidden bg-[url('/placeholder.svg')] aspect-square flex items-center justify-center">
                {isProcessing ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : processedPreview ? (
                  <img
                    src={processedPreview}
                    alt="Image traitée"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mb-2 mx-auto" />
                    <p>Cliquez sur "Supprimer l'arrière-plan" pour traiter l'image</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button 
            type="button" 
            onClick={handleBackgroundRemoval}
            disabled={!originalImage || isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            Supprimer l'arrière-plan
          </Button>
          
          <Button
            type="button"
            onClick={handleUseProcessedImage}
            disabled={!processedImage}
            variant="default"
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            Utiliser cette image
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground pt-0">
        La suppression d'arrière-plan s'effectue localement dans le navigateur sans envoi à un service externe.
      </CardFooter>
    </Card>
  );
};

export default ImageProcessingTool;
