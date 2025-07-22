
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DescriptionGeneratorProps {
  productName: string;
  categoryId: string;
  brandId: string;
  categories: Array<{ id: string; name: string; translation?: string }>;
  brands: Array<{ id: string; name: string; translation?: string }>;
  onDescriptionGenerated: (description: string, shortDescription: string) => void;
  // Props pour contrôler les valeurs des champs
  currentDescription?: string;
  currentShortDescription?: string;
  onDescriptionChange?: (description: string) => void;
  onShortDescriptionChange?: (shortDescription: string) => void;
}

const DescriptionGenerator: React.FC<DescriptionGeneratorProps> = ({
  productName,
  categoryId,
  brandId,
  categories,
  brands,
  onDescriptionGenerated,
  currentDescription = "",
  currentShortDescription = "",
  onDescriptionChange,
  onShortDescriptionChange
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);
  const [copiedShortDescription, setCopiedShortDescription] = useState(false);

  const handleGenerateDescription = async () => {
    if (!productName?.trim()) {
      toast.error("Veuillez saisir un nom de produit");
      return;
    }

    setIsGenerating(true);

    try {
      console.log("🤖 Generating description for product:", productName);

      // Get category and brand names
      const category = categories?.find(c => c.id === categoryId);
      const brand = brands?.find(b => b.id === brandId);

      const { data, error } = await supabase.functions.invoke('generate-product-description', {
        body: {
          productName: productName,
          brand: brand?.translation || brand?.name || "",
          category: category?.translation || category?.name || "",
          includeSpecifications: false,
          variants: []
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Erreur lors de la génération");
      }

      if (!data?.success || !data?.description) {
        throw new Error("Aucune description générée");
      }

      console.log("✅ Description generated successfully");
      
      // Mettre à jour les valeurs directement
      if (onDescriptionChange) {
        onDescriptionChange(data.description);
      }
      if (onShortDescriptionChange && data.shortDescription) {
        onShortDescriptionChange(data.shortDescription);
      }
      
      // Notifier le parent pour la synchronisation du formulaire
      onDescriptionGenerated(data.description, data.shortDescription || "");
      
      toast.success("Description générée avec succès", {
        description: `Modèle utilisé: ${data.model} | Perplexity: ${data.usedPerplexity ? 'Oui' : 'Non'}`
      });

    } catch (error) {
      console.error("Error generating description:", error);
      toast.error(`Erreur lors de la génération: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyDescription = async () => {
    try {
      await navigator.clipboard.writeText(currentDescription);
      setCopiedDescription(true);
      toast.success("Description copiée dans le presse-papiers");
      setTimeout(() => setCopiedDescription(false), 2000);
    } catch (error) {
      toast.error("Erreur lors de la copie");
    }
  };

  const handleCopyShortDescription = async () => {
    try {
      await navigator.clipboard.writeText(currentShortDescription);
      setCopiedShortDescription(true);
      toast.success("Description courte copiée dans le presse-papiers");
      setTimeout(() => setCopiedShortDescription(false), 2000);
    } catch (error) {
      toast.error("Erreur lors de la copie");
    }
  };

  const handleUseDescriptions = () => {
    onDescriptionGenerated(currentDescription, currentShortDescription);
    toast.success("Descriptions appliquées au produit");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Générateur de description IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleGenerateDescription}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Générer une description
            </>
          )}
        </Button>

        <div className="space-y-4">
          {/* Description courte */}
          <div className="space-y-2">
            <Label htmlFor="short-description">Description courte</Label>
            <Textarea
              id="short-description"
              value={currentShortDescription}
              onChange={(e) => onShortDescriptionChange?.(e.target.value)}
              rows={2}
              className="resize-none"
              placeholder="Saisissez une description courte ou générez-en une avec l'IA..."
            />
            
            {currentShortDescription && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyShortDescription}
                  className="flex-1"
                >
                  {copiedShortDescription ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copiée !
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Description longue */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={currentDescription}
              onChange={(e) => onDescriptionChange?.(e.target.value)}
              rows={6}
              className="resize-none"
              placeholder="Saisissez une description détaillée ou générez-en une avec l'IA..."
            />
            
            {currentDescription && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyDescription}
                  className="flex-1"
                >
                  {copiedDescription ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copiée !
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Bouton pour utiliser les descriptions */}
          {(currentDescription || currentShortDescription) && (
            <Button
              onClick={handleUseDescriptions}
              className="w-full"
              variant="default"
            >
              Utiliser ces descriptions
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DescriptionGenerator;
