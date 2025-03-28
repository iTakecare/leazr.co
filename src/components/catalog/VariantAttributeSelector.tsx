
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductVariationAttributes } from "@/types/catalog";
import { X, Plus, Loader2, HelpCircle } from "lucide-react";
import { updateProductVariationAttributes } from "@/services/variantPriceService";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface VariantAttributeSelectorProps {
  productId: string;
  initialAttributes?: ProductVariationAttributes;
  onAttributesUpdated?: () => void;
}

const VariantAttributeSelector: React.FC<VariantAttributeSelectorProps> = ({
  productId,
  initialAttributes = {},
  onAttributesUpdated
}) => {
  const [attributes, setAttributes] = useState<Record<string, string[]>>(
    initialAttributes || {}
  );
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeValues, setNewAttributeValues] = useState("");
  
  // Mettre à jour les attributs locaux quand initialAttributes change
  useEffect(() => {
    if (initialAttributes && Object.keys(initialAttributes).length > 0) {
      setAttributes(initialAttributes);
    }
  }, [initialAttributes]);

  // Suggestions d'attributs courants pour les produits technologiques
  const commonAttributes = [
    { name: "CPU", examples: "i5, i7, M1, M2, Ryzen 5" },
    { name: "RAM", examples: "8Go, 16Go, 32Go" },
    { name: "Stockage", examples: "256Go, 512Go, 1To" },
    { name: "Couleur", examples: "Noir, Blanc, Argent" },
    { name: "Taille", examples: "13\", 14\", 15\"" },
    { name: "Disque Dur", examples: "SSD, HDD, NVMe" },
    { name: "Carte Graphique", examples: "Intégrée, RTX 3060, RTX 4070" }
  ];
  
  // Ajouter un attribut prédéfini
  const handleAddPredefinedAttribute = (name: string) => {
    if (attributes[name]) {
      toast.info(`L'attribut "${name}" existe déjà`);
      return;
    }
    
    setNewAttributeName(name);
  };
  
  // Ajouter un nouvel attribut
  const handleAddAttribute = () => {
    if (!newAttributeName.trim()) {
      toast.error("Veuillez entrer un nom d'attribut");
      return;
    }
    
    const name = newAttributeName.trim();
    let values: string[] = [];
    
    if (newAttributeValues.includes(',')) {
      // Split by comma and clean up
      values = newAttributeValues.split(',').map(val => val.trim()).filter(Boolean);
    } else {
      // Single value or empty
      const singleValue = newAttributeValues.trim();
      if (singleValue) {
        values = [singleValue];
      }
    }
    
    if (values.length === 0) {
      toast.error("Veuillez entrer au moins une valeur d'attribut");
      return;
    }
    
    setAttributes(prev => ({
      ...prev,
      [name]: values
    }));
    
    setNewAttributeName("");
    setNewAttributeValues("");
    
    toast.success(`Attribut "${name}" ajouté avec succès`);
  };
  
  // Ajouter une valeur à un attribut existant
  const handleAddValue = (attributeName: string, value: string) => {
    if (!value.trim()) return;
    
    setAttributes(prev => {
      const currentValues = prev[attributeName] || [];
      if (currentValues.includes(value.trim())) {
        toast.error(`La valeur "${value}" existe déjà pour l'attribut "${attributeName}"`);
        return prev;
      }
      
      return {
        ...prev,
        [attributeName]: [...currentValues, value.trim()]
      };
    });
  };
  
  // Supprimer une valeur d'attribut
  const handleRemoveValue = (attributeName: string, valueIndex: number) => {
    setAttributes(prev => {
      const currentValues = [...(prev[attributeName] || [])];
      currentValues.splice(valueIndex, 1);
      
      // Si plus de valeurs, supprimer l'attribut entier
      if (currentValues.length === 0) {
        const newAttributes = { ...prev };
        delete newAttributes[attributeName];
        return newAttributes;
      }
      
      return {
        ...prev,
        [attributeName]: currentValues
      };
    });
  };
  
  // Supprimer un attribut entier
  const handleRemoveAttribute = (attributeName: string) => {
    setAttributes(prev => {
      const newAttributes = { ...prev };
      delete newAttributes[attributeName];
      return newAttributes;
    });
    
    toast.success(`Attribut "${attributeName}" supprimé`);
  };
  
  // Sauvegarder les modifications
  const handleSaveAttributes = async () => {
    setIsUpdating(true);
    
    try {
      await updateProductVariationAttributes(productId, attributes);
      toast.success("Attributs mis à jour avec succès");
      
      if (onAttributesUpdated) {
        onAttributesUpdated();
      }
    } catch (error: any) {
      toast.error(`Erreur lors de la mise à jour des attributs: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Vérifier s'il y a des attributs définis
  const hasAttributes = Object.keys(attributes).length > 0;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Attributs de variation</CardTitle>
              <CardDescription>
                Définissez les attributs pour créer différentes combinaisons de produits
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>Les attributs définissent les caractéristiques qui varient entre les différentes versions du produit, comme la taille d'écran, la mémoire RAM, etc.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {hasAttributes ? (
            <div className="space-y-4">
              {Object.entries(attributes).map(([attrName, attrValues]) => (
                <div key={attrName} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{attrName}</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveAttribute(attrName)}
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attrValues.map((value, index) => (
                      <Badge key={index} variant="outline" className="px-2 py-1 flex items-center gap-1">
                        {value}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 w-5 ml-1 p-0 rounded-full" 
                          onClick={() => handleRemoveValue(attrName, index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Nouvelle valeur" 
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          handleAddValue(attrName, input.value);
                          input.value = '';
                        }
                      }}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        if (input) {
                          handleAddValue(attrName, input.value);
                          input.value = '';
                        }
                      }}
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert className="bg-amber-50">
              <AlertTitle className="flex items-center">
                <HelpCircle className="h-4 w-4 mr-2" />
                Aucun attribut défini
              </AlertTitle>
              <AlertDescription>
                Définissez des attributs pour créer des variations de ce produit avec différentes combinaisons de caractéristiques.
              </AlertDescription>
            </Alert>
          )}

          <div className="border-t mt-6 pt-6">
            <h4 className="font-medium mb-3">Ajouter un nouvel attribut</h4>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {commonAttributes.map(attr => (
                <Badge 
                  key={attr.name} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleAddPredefinedAttribute(attr.name)}
                >
                  {attr.name}
                </Badge>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="attributeName">Nom de l'attribut</Label>
                <Input
                  id="attributeName"
                  placeholder="Ex: CPU, RAM, Stockage..."
                  value={newAttributeName}
                  onChange={(e) => setNewAttributeName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="attributeValues">Valeurs (séparées par des virgules)</Label>
                <Input
                  id="attributeValues"
                  placeholder="Ex: 8Go, 16Go, 32Go"
                  value={newAttributeValues}
                  onChange={(e) => setNewAttributeValues(e.target.value)}
                />
              </div>
            </div>
            <Button 
              className="mt-3" 
              variant="outline" 
              onClick={handleAddAttribute}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter l'attribut
            </Button>
          </div>
          
          <div className="mt-6 pt-4 border-t flex justify-end">
            <Button 
              onClick={handleSaveAttributes}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer les attributs"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VariantAttributeSelector;
