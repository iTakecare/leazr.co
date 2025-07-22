
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

interface DescriptionGeneratorProps {
  product: Product;
  onDescriptionGenerated: (description: string) => void;
}

const DescriptionGenerator: React.FC<DescriptionGeneratorProps> = ({
  product,
  onDescriptionGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerateDescription = async () => {
    setIsGenerating(true);

    try {
      console.log("🤖 Generating description for product:", product.name);

      // Prepare variants data for the AI
      const variants = product.variant_combination_prices?.map(variant => ({
        attributes: variant.attributes || {},
        price: variant.price,
        monthly_price: variant.monthly_price
      })) || [];

      const { data, error } = await supabase.functions.invoke('generate-product-description', {
        body: {
          productName: product.name,
          brand: product.brand,
          category: product.category,
          includeSpecifications: false,
          variants: variants
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
      
      setGeneratedDescription(data.description);
      
      toast.success("Description optimisée générée avec succès", {
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
      await navigator.clipboard.writeText(generatedDescription);
      setCopied(true);
      toast.success("Description copiée dans le presse-papiers");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erreur lors de la copie");
    }
  };

  const handleUseDescription = () => {
    onDescriptionGenerated(generatedDescription);
    toast.success("Description appliquée au produit");
  };

  const hasVariants = product.variant_combination_prices && product.variant_combination_prices.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Générateur de description IA optimisée
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>
            Générez une description SEO optimisée pour le leasing de matériel reconditionné, 
            sans détails techniques précis, mettant l'accent sur les bénéfices écologiques et économiques.
          </p>
          {hasVariants && (
            <p className="mt-2 text-blue-600">
              ✓ {product.variant_combination_prices?.length} variantes détectées - L'IA évitera les spécifications techniques précises
            </p>
          )}
        </div>

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
              Générer une description optimisée
            </>
          )}
        </Button>

        {generatedDescription && (
          <div className="space-y-3">
            <div className="font-medium text-sm">Description générée :</div>
            <Textarea
              value={generatedDescription}
              onChange={(e) => setGeneratedDescription(e.target.value)}
              rows={6}
              className="resize-none"
            />
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyDescription}
                className="flex-1"
              >
                {copied ? (
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
              
              <Button
                size="sm"
                onClick={handleUseDescription}
                className="flex-1"
              >
                Utiliser cette description
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="font-medium text-green-800 mb-1">🌿 Optimisé pour le leasing reconditionné :</div>
          <ul className="text-green-700 space-y-1">
            <li>• Vocabulaire SEO français spécialisé</li>
            <li>• Focus sur l'aspect écologique du reconditionné</li>
            <li>• Mentions du leasing mensuel et flexibilité</li>
            <li>• Évitement des spécifications techniques précises</li>
            <li>• Call-to-action orienté leasing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DescriptionGenerator;
