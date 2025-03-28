
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
import { X, Plus, Loader2 } from "lucide-react";
import { updateProductVariationAttributes } from "@/services/variantPriceService";
import { toast } from "sonner";

interface VariantAttributeSelector {
  productId: string;
  initialAttributes?: ProductVariationAttributes;
  onAttributesUpdated?: () => void;
}

const VariantAttributeSelector: React.FC<VariantAttributeSelector> = ({
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
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Attributs de variation</h3>
        <Button 
          variant="outline" 
          size="sm"
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
      
      <div className="space-y-4">
        {Object.keys(attributes).length > 0 ? (
          Object.entries(attributes).map(([attrName, attrValues]) => (
            <div key={attrName} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">{attrName}</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleRemoveAttribute(attrName)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {attrValues.map((value, index) => (
                  <div key={index} className="bg-gray-100 rounded-full px-3 py-1 text-sm flex items-center">
                    {value}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 w-5 ml-1 p-0" 
                      onClick={() => handleRemoveValue(attrName, index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
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
                    handleAddValue(attrName, input.value);
                    input.value = '';
                  }}
                >
                  Ajouter
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-6 border rounded-lg border-dashed">
            <p className="text-muted-foreground">Aucun attribut de variation défini</p>
          </div>
        )}
      </div>
      
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Ajouter un nouvel attribut</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="attributeName">Nom de l'attribut</Label>
            <Input
              id="attributeName"
              placeholder="Ex: Couleur, Taille, Mémoire..."
              value={newAttributeName}
              onChange={(e) => setNewAttributeName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="attributeValues">Valeurs (séparées par des virgules)</Label>
            <Input
              id="attributeValues"
              placeholder="Ex: Rouge, Bleu, Vert"
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
    </div>
  );
};

export default VariantAttributeSelector;
