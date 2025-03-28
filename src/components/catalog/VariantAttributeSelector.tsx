
import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ProductVariationAttributes } from "@/types/catalog";
import { updateProductVariationAttributes } from "@/services/variantPriceService";

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
  const [attributes, setAttributes] = useState<ProductVariationAttributes>(initialAttributes || {});
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeValue, setNewAttributeValue] = useState("");
  const [attributeToAddValueTo, setAttributeToAddValueTo] = useState<string | null>(null);
  const [valueToAdd, setValueToAdd] = useState("");
  
  useEffect(() => {
    setAttributes(initialAttributes || {});
  }, [initialAttributes]);
  
  const updateAttributes = useMutation({
    mutationFn: () => updateProductVariationAttributes(productId, attributes),
    onSuccess: () => {
      toast.success("Attributs de variation mis à jour avec succès");
      if (onAttributesUpdated) onAttributesUpdated();
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour des attributs: ${error.message}`);
    }
  });
  
  const handleAddAttribute = () => {
    if (!newAttributeName.trim()) {
      toast.error("Le nom de l'attribut est requis");
      return;
    }
    
    // Check if attribute already exists
    if (attributes[newAttributeName]) {
      toast.error("Cet attribut existe déjà");
      return;
    }
    
    // Add new attribute with initial value if provided
    const values = newAttributeValue.trim() ? [newAttributeValue.trim()] : [];
    
    setAttributes(prev => ({
      ...prev,
      [newAttributeName]: values
    }));
    
    setNewAttributeName("");
    setNewAttributeValue("");
    
    toast.success(`Attribut "${newAttributeName}" ajouté`);
  };
  
  const handleAddValueToAttribute = (attributeName: string) => {
    if (!valueToAdd.trim()) {
      toast.error("La valeur de l'attribut est requise");
      return;
    }
    
    // Check if value already exists for this attribute
    if (attributes[attributeName]?.includes(valueToAdd.trim())) {
      toast.error("Cette valeur existe déjà pour cet attribut");
      return;
    }
    
    // Add value to attribute
    setAttributes(prev => ({
      ...prev,
      [attributeName]: [...(prev[attributeName] || []), valueToAdd.trim()]
    }));
    
    setAttributeToAddValueTo(null);
    setValueToAdd("");
    
    toast.success(`Valeur "${valueToAdd}" ajoutée à l'attribut "${attributeName}"`);
  };
  
  const handleRemoveValue = (attributeName: string, valueIndex: number) => {
    setAttributes(prev => ({
      ...prev,
      [attributeName]: prev[attributeName].filter((_, index) => index !== valueIndex)
    }));
  };
  
  const handleRemoveAttribute = (attributeName: string) => {
    setAttributes(prev => {
      const newAttributes = { ...prev };
      delete newAttributes[attributeName];
      return newAttributes;
    });
    
    toast.success(`Attribut "${attributeName}" supprimé`);
  };
  
  const handleSaveAttributes = async () => {
    try {
      await updateAttributes.mutateAsync();
    } catch (error) {
      console.error("Failed to update attributes:", error);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Attributs de variation du produit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(attributes).length === 0 ? (
            <Alert variant="default" className="bg-muted/50">
              <AlertDescription>
                Ce produit n'a pas encore d'attributs de variation. 
                Ajoutez des attributs comme couleur, taille, etc., pour créer des variantes.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {Object.entries(attributes).map(([attributeName, values]) => (
                <div key={attributeName} className="rounded-lg border p-4 relative">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-base">{attributeName}</h3>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveAttribute(attributeName)}
                      className="h-8 w-8 absolute right-2 top-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Array.isArray(values) && values.map((value, index) => (
                      <Badge key={index} variant="secondary" className="group relative">
                        {value}
                        <button
                          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveValue(attributeName, index)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  
                  {attributeToAddValueTo === attributeName ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        placeholder="Nouvelle valeur"
                        value={valueToAdd}
                        onChange={(e) => setValueToAdd(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleAddValueToAttribute(attributeName)}
                      >
                        Ajouter
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setAttributeToAddValueTo(null);
                          setValueToAdd("");
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setAttributeToAddValueTo(attributeName)}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Ajouter une valeur
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="border-t pt-4 mt-6">
            <h3 className="font-medium mb-3">Ajouter un nouvel attribut</h3>
            <div className="flex items-end gap-2 flex-wrap">
              <div className="space-y-2">
                <label className="text-sm">Nom de l'attribut</label>
                <Input
                  placeholder="Ex: Couleur, Taille, etc."
                  value={newAttributeName}
                  onChange={(e) => setNewAttributeName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Première valeur (optionnelle)</label>
                <Input
                  placeholder="Ex: Rouge, XL, etc."
                  value={newAttributeValue}
                  onChange={(e) => setNewAttributeValue(e.target.value)}
                />
              </div>
              <Button onClick={handleAddAttribute} className="shrink-0 mt-2">
                <Plus className="h-4 w-4 mr-2" /> Ajouter
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Button 
            onClick={handleSaveAttributes} 
            disabled={updateAttributes.isPending}
          >
            {updateAttributes.isPending ? (
              <>Enregistrement...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Enregistrer les attributs
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VariantAttributeSelector;
