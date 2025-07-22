
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wand2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SpecificationGeneratorProps {
  product: Product;
  onSpecificationsGenerated: (specifications: Record<string, string>) => void;
}

const SpecificationGenerator: React.FC<SpecificationGeneratorProps> = ({
  product,
  onSpecificationsGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Record<string, string> | null>(null);

  const handleGenerateSpecifications = async () => {
    setIsGenerating(true);

    try {
      console.log("🤖 Generating specifications for product:", product.name);

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
          includeSpecifications: true,
          variants: variants,
          existingSpecifications: product.specifications || {}
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Erreur lors de la génération");
      }

      if (!data?.success || !data?.specifications) {
        throw new Error("Aucune spécification générée");
      }

      console.log("✅ Specifications generated:", data.specifications);
      
      setLastGenerated(data.specifications);
      onSpecificationsGenerated(data.specifications);
      
      toast.success("Spécifications techniques générées avec succès");

    } catch (error) {
      console.error("Error generating specifications:", error);
      toast.error(`Erreur lors de la génération: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const hasVariants = product.variant_combination_prices && product.variant_combination_prices.length > 0;
  const existingSpecs = product.specifications && Object.keys(product.specifications).length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Générateur de spécifications IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>
            Générez automatiquement des spécifications techniques adaptées au matériel reconditionné 
            et au modèle de leasing.
          </p>
        </div>

        {hasVariants && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              L'IA utilisera les variantes configurées ({product.variant_combination_prices?.length} configurations) 
              pour générer des spécifications génériques appropriées.
            </AlertDescription>
          </Alert>
        )}

        {existingSpecs && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Les spécifications existantes seront enrichies et améliorées par l'IA.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={handleGenerateSpecifications}
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                {existingSpecs ? 'Régénérer' : 'Générer'} les spécifications
              </>
            )}
          </Button>
        </div>

        {lastGenerated && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="text-sm font-medium text-green-800 mb-2">
              ✅ Dernières spécifications générées :
            </div>
            <div className="text-xs text-green-700 space-y-1">
              {Object.entries(lastGenerated).map(([key, value]) => (
                <div key={key}>
                  <strong>{key}:</strong> {value}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="font-medium text-blue-800 mb-1">💡 Conseil :</div>
          <p className="text-blue-700">
            L'IA évite automatiquement les détails techniques trop précis (CPU exact, RAM exacte) 
            pour rester cohérent avec votre modèle de variantes. Les spécifications générées 
            mettent l'accent sur le reconditionnement, la garantie et les bénéfices du leasing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpecificationGenerator;
