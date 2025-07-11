
import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ProductVariationAttributes } from "@/types/catalog";
import { updateProductVariationAttributes } from "@/services/variantPriceService";
import { getAttributes } from "@/services/attributeService";

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
  const queryClient = useQueryClient();
  const [attributes, setAttributes] = useState<ProductVariationAttributes>(initialAttributes || {});
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeValue, setNewAttributeValue] = useState("");
  const [attributeToAddValueTo, setAttributeToAddValueTo] = useState<string | null>(null);
  const [valueToAdd, setValueToAdd] = useState("");
  const [customAttributeName, setCustomAttributeName] = useState("");
  
  // Get predefined attributes
  const { data: predefinedAttributes } = useQuery({
    queryKey: ["product-attributes"],
    queryFn: getAttributes
  });
  
  useEffect(() => {
    // Ensure we're working with a clean object
    if (initialAttributes) {
      setAttributes(initialAttributes);
    }
  }, [initialAttributes]);
  
  const updateAttributes = useMutation({
    mutationFn: async () => {
      try {
        // Clean attributes before saving
        const cleanedAttributes: ProductVariationAttributes = {};
        
        Object.entries(attributes).forEach(([key, values]) => {
          if (Array.isArray(values) && values.length > 0) {
            cleanedAttributes[key] = values;
          }
        });
        
        console.log("Cleaning attributes for saving:", cleanedAttributes);
        
        if (Object.keys(cleanedAttributes).length === 0) {
          toast.error("Aucun attribut valide à enregistrer");
          return false;
        }
        
        // Log debug info to help diagnose the issue
        console.log("Updating product variation attributes for product:", productId);
        console.log("New attributes:", cleanedAttributes);
        
        // Make sure we send the productId as a string to ensure consistent type
        const result = await updateProductVariationAttributes(productId.toString(), cleanedAttributes);
        return result;
      } catch (error) {
        console.error("Error in mutation function:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Successfully updated product attributes for ID:", productId);
      toast.success("Attributs de variation mis à jour avec succès");
      
      // Invalidate the product cache to trigger a refresh
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      
      // Make sure to call the onAttributesUpdated callback
      if (onAttributesUpdated) {
        onAttributesUpdated();
      }
    },
    onError: (error: any) => {
      console.error("Error updating attributes:", error);
      toast.error(`Erreur lors de la mise à jour des attributs: ${error.message || "Erreur inconnue"}`);
    }
  });
  
  const handleAddAttribute = () => {
    if (newAttributeName === "") {
      toast.error("Le nom de l'attribut est requis");
      return;
    }
    
    // Use selected attribute or custom attribute
    let attributeName = newAttributeName;
    
    if (attributeName === "custom") {
      if (!customAttributeName.trim()) {
        toast.error("Veuillez saisir un nom d'attribut personnalisé");
        return;
      }
      attributeName = customAttributeName.trim();
    }
    
    // Check if attribute already exists
    if (attributes[attributeName]) {
      toast.error("Cet attribut existe déjà");
      return;
    }
    
    // Add new attribute with initial value if provided, splitting by commas
    let values: string[] = [];
    if (newAttributeValue.trim()) {
      values = newAttributeValue
        .split(',')
        .map(value => value.trim())
        .filter(value => value.length > 0);
    }
    
    setAttributes(prev => ({
      ...prev,
      [attributeName]: values
    }));
    
    setNewAttributeName("");
    setNewAttributeValue("");
    setCustomAttributeName("");
    
    toast.success(`Attribut "${attributeName}" ajouté`);
  };
  
  const handleAddValueToAttribute = (attributeName: string) => {
    if (!valueToAdd.trim()) {
      toast.error("La valeur de l'attribut est requise");
      return;
    }
    
    // Séparer les valeurs par des virgules et nettoyer les espaces
    const valuesToAdd = valueToAdd
      .split(',')
      .map(value => value.trim())
      .filter(value => value.length > 0);
    
    if (valuesToAdd.length === 0) {
      toast.error("La valeur de l'attribut est requise");
      return;
    }
    
    // Vérifier les doublons
    const existingValues = attributes[attributeName] || [];
    const newValues = valuesToAdd.filter(value => !existingValues.includes(value));
    
    if (newValues.length === 0) {
      toast.error("Toutes ces valeurs existent déjà pour cet attribut");
      return;
    }
    
    // Add values to attribute
    setAttributes(prev => ({
      ...prev,
      [attributeName]: [...existingValues, ...newValues]
    }));
    
    setAttributeToAddValueTo(null);
    setValueToAdd("");
    
    if (newValues.length === 1) {
      toast.success(`Valeur "${newValues[0]}" ajoutée à l'attribut "${attributeName}"`);
    } else {
      toast.success(`${newValues.length} valeurs ajoutées à l'attribut "${attributeName}": ${newValues.join(', ')}`);
    }
  };
  
  const handleRemoveValue = (attributeName: string, valueIndex: number) => {
    setAttributes(prev => ({
      ...prev,
      [attributeName]: prev[attributeName].filter((_, index) => index !== valueIndex)
    }));
  };
  
  const handleRemoveAttribute = async (attributeName: string) => {
    try {
      // Supprimer l'attribut de l'état local
      setAttributes(prev => {
        const newAttributes = { ...prev };
        delete newAttributes[attributeName];
        return newAttributes;
      });
      
      // Sauvegarder immédiatement les changements
      const cleanedAttributes: ProductVariationAttributes = {};
      Object.entries(attributes).forEach(([key, values]) => {
        if (key !== attributeName && Array.isArray(values) && values.length > 0) {
          cleanedAttributes[key] = values;
        }
      });
      
      console.log("Saving attributes after deletion:", cleanedAttributes);
      await updateProductVariationAttributes(productId.toString(), cleanedAttributes);
      
      // Invalider le cache
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      
      if (onAttributesUpdated) {
        onAttributesUpdated();
      }
      
      toast.success(`Attribut "${attributeName}" supprimé et sauvegardé`);
    } catch (error) {
      console.error("Error removing attribute:", error);
      toast.error("Erreur lors de la suppression de l'attribut");
      
      // Restaurer l'attribut en cas d'erreur
      setAttributes(prev => ({
        ...prev,
        [attributeName]: attributes[attributeName]
      }));
    }
  };
  
  const handleSaveAttributes = async () => {
    try {
      console.log("Saving attributes:", attributes);
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
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  
                   {attributeToAddValueTo === attributeName ? (
                     <div className="space-y-2">
                       <div className="flex items-center gap-2">
                         <Input
                           placeholder="Nouvelle valeur (ex: 64Go, 128Go)"
                           value={valueToAdd}
                           onChange={(e) => setValueToAdd(e.target.value)}
                           className="flex-1"
                         />
                         <Button 
                           size="sm" 
                           onClick={() => handleAddValueToAttribute(attributeName)}
                           type="button"
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
                           type="button"
                         >
                           Annuler
                         </Button>
                       </div>
                       <p className="text-xs text-muted-foreground">
                         💡 Vous pouvez séparer plusieurs valeurs par des virgules
                       </p>
                     </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setAttributeToAddValueTo(attributeName)}
                      type="button"
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
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-sm">Nom de l'attribut</label>
                {predefinedAttributes && predefinedAttributes.length > 0 ? (
                  <select 
                    className="w-full p-2 border rounded"
                    value={newAttributeName}
                    onChange={(e) => setNewAttributeName(e.target.value)}
                  >
                    <option value="">Sélectionnez un attribut</option>
                    {predefinedAttributes.map(attr => (
                      <option 
                        key={attr.id} 
                        value={attr.name}
                        disabled={attributes[attr.name] !== undefined}
                      >
                        {attr.display_name}
                      </option>
                    ))}
                    <option value="custom">Attribut personnalisé...</option>
                  </select>
                ) : (
                  <Input
                    placeholder="Ex: Couleur, Taille, etc."
                    value={newAttributeName}
                    onChange={(e) => setNewAttributeName(e.target.value)}
                  />
                )}
              </div>
              
              {newAttributeName === "custom" && (
                <div className="space-y-2">
                  <label className="text-sm">Nom personnalisé</label>
                  <Input
                    placeholder="Nom de l'attribut personnalisé"
                    value={customAttributeName}
                    onChange={(e) => setCustomAttributeName(e.target.value)}
                    className="mt-2"
                    autoFocus
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm">Première valeur (optionnelle)</label>
                <Input
                  placeholder="Ex: Rouge, Bleu, Vert ou 16Go, 32Go (séparez par des virgules)"
                  value={newAttributeValue}
                  onChange={(e) => setNewAttributeValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  💡 Séparez plusieurs valeurs par des virgules pour les créer d'un coup
                </p>
              </div>
              
              <Button onClick={handleAddAttribute} className="self-start" type="button">
                <Plus className="h-4 w-4 mr-2" /> Ajouter
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Button 
            onClick={handleSaveAttributes} 
            disabled={updateAttributes.isPending}
            type="button"
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
