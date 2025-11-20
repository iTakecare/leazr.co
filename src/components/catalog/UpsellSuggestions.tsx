import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Plus, Loader2 } from "lucide-react";
import { UpsellProduct } from "@/types/categoryTypes";
import { useAddProductUpsell } from "@/hooks/products/useProductUpsells";

interface UpsellSuggestionsProps {
  suggestions: UpsellProduct[];
  isLoading: boolean;
  productId: string;
  alreadySelected: Set<string>;
}

export const UpsellSuggestions = ({ 
  suggestions, 
  isLoading, 
  productId, 
  alreadySelected 
}: UpsellSuggestionsProps) => {
  const addUpsell = useAddProductUpsell();

  // Filtrer les suggestions déjà sélectionnées
  const availableSuggestions = suggestions.filter(s => !alreadySelected.has(s.id));

  const handleAddSuggestion = (upsellProductId: string) => {
    addUpsell.mutate({
      productId,
      upsellProductId,
      priority: 0,
    });
  };

  const handleAddAll = () => {
    availableSuggestions.forEach(suggestion => {
      addUpsell.mutate({
        productId,
        upsellProductId: suggestion.id,
        priority: 0,
      });
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Chargement des suggestions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (availableSuggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              Suggestions automatiques ({availableSuggestions.length})
            </CardTitle>
          </div>
          {availableSuggestions.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddAll}
              disabled={addUpsell.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Tout ajouter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableSuggestions.slice(0, 6).map((suggestion) => (
            <Card key={suggestion.id} className="hover:bg-background transition-colors">
              <CardContent className="p-3">
                <div className="flex flex-col gap-2">
                  {suggestion.image_url && (
                    <img
                      src={suggestion.image_url}
                      alt={suggestion.name}
                      className="h-20 w-full object-cover rounded"
                    />
                  )}
                  
                  <div className="space-y-1">
                    <p className="font-medium text-sm line-clamp-2">{suggestion.name}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {suggestion.monthly_price 
                          ? `${suggestion.monthly_price.toFixed(2)} €/mois` 
                          : 'Prix non défini'}
                      </p>
                      {suggestion.upsell_source === 'exception' && (
                        <Badge variant="secondary" className="text-xs">Prioritaire</Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleAddSuggestion(suggestion.id)}
                    disabled={addUpsell.isPending}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {availableSuggestions.length > 6 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Et {availableSuggestions.length - 6} autre(s) suggestion(s)...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
