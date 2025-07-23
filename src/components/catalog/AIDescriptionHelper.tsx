
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wand2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AIDescriptionHelperProps {
  productName: string;
  categoryId: string;
  brandId: string;
  categories: Array<{ id: string; name: string; translation?: string }>;
  brands: Array<{ id: string; name: string; translation?: string }>;
  onDescriptionGenerated: (description: string, shortDescription: string) => void;
}

const AIDescriptionHelper: React.FC<AIDescriptionHelperProps> = ({
  productName,
  categoryId,
  brandId,
  categories,
  brands,
  onDescriptionGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

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
      
      // Notifier le parent avec les descriptions générées
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

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-purple-700">
          <Sparkles className="h-5 w-5" />
          Assistant IA pour descriptions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Générez automatiquement une description professionnelle et attrayante 
            pour votre produit en utilisant l'intelligence artificielle.
          </p>
          
          <Button 
            onClick={handleGenerateDescription}
            disabled={isGenerating || !productName || !categoryId || !brandId}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Générer les descriptions avec l'IA
              </>
            )}
          </Button>

          {(!productName || !categoryId || !brandId) && (
            <p className="text-xs text-amber-600">
              💡 Remplissez le nom, la marque et la catégorie pour activer l'IA
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AIDescriptionHelper;
