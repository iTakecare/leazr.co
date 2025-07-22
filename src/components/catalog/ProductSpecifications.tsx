
import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { updateProduct } from "@/services/catalogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import SpecificationGenerator from "./SpecificationGenerator";

interface ProductSpecificationsProps {
  productId: string;
  initialSpecifications: Record<string, string>;
  onSpecificationsUpdated?: () => void;
  product?: any; // Pour passer le produit complet au générateur
}

const ProductSpecifications: React.FC<ProductSpecificationsProps> = ({
  productId,
  initialSpecifications = {},
  onSpecificationsUpdated,
  product
}) => {
  const [specifications, setSpecifications] = useState<Record<string, string>>({});
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [isUpdated, setIsUpdated] = useState(false);
  
  // Update specifications mutation
  const updateSpecificationsMutation = useMutation({
    mutationFn: (specs: Record<string, string>) => 
      updateProduct(productId, { specifications: specs }),
    onSuccess: () => {
      toast.success("Spécifications mises à jour avec succès");
      setIsUpdated(false);
      if (onSpecificationsUpdated) {
        onSpecificationsUpdated();
      }
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour des spécifications: ${error.message}`);
    }
  });
  
  // Initialize specifications from props
  useEffect(() => {
    if (initialSpecifications) {
      setSpecifications(initialSpecifications);
    }
  }, [initialSpecifications]);
  
  // Handle specification change
  const handleSpecificationChange = (key: string, value: string) => {
    setSpecifications({ ...specifications, [key]: value });
    setIsUpdated(true);
  };
  
  // Add new specification
  const addSpecification = () => {
    if (newSpecKey && newSpecValue) {
      handleSpecificationChange(newSpecKey, newSpecValue);
      setNewSpecKey("");
      setNewSpecValue("");
    } else {
      toast.error("Veuillez entrer un nom et une valeur pour la spécification");
    }
  };
  
  // Remove specification
  const removeSpecification = (key: string) => {
    const newSpecs = { ...specifications };
    delete newSpecs[key];
    setSpecifications(newSpecs);
    setIsUpdated(true);
  };
  
  // Save specifications
  const saveSpecifications = () => {
    updateSpecificationsMutation.mutate(specifications);
  };

  // Handle generated specifications
  const handleSpecificationsGenerated = (generatedSpecs: Record<string, string>) => {
    // Merge with existing specifications
    const mergedSpecs = { ...specifications, ...generatedSpecs };
    setSpecifications(mergedSpecs);
    setIsUpdated(true);
  };
  
  return (
    <div className="space-y-6">
      {/* AI Generator - Show only if we have the full product */}
      {product && (
        <SpecificationGenerator 
          product={product}
          onSpecificationsGenerated={handleSpecificationsGenerated}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Spécifications techniques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(specifications).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(specifications).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Input 
                      value={key} 
                      disabled 
                      className="w-1/3" 
                    />
                    <Input 
                      value={value} 
                      onChange={(e) => handleSpecificationChange(key, e.target.value)} 
                      className="w-2/3" 
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeSpecification(key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 text-gray-500">
                Aucune spécification définie pour ce produit.
              </div>
            )}
            
            <Separator className="my-4" />
            
            <h4 className="text-sm font-medium mb-2">Ajouter une spécification</h4>
            <div className="flex items-center gap-2">
              <Input 
                value={newSpecKey}
                onChange={(e) => setNewSpecKey(e.target.value)}
                placeholder="Nom de la spécification"
                className="w-1/3"
              />
              <Input 
                value={newSpecValue}
                onChange={(e) => setNewSpecValue(e.target.value)}
                placeholder="Valeur"
                className="w-2/3"
              />
              <Button
                type="button"
                onClick={addSpecification}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {isUpdated && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={saveSpecifications}
                  disabled={updateSpecificationsMutation.isPending}
                >
                  {updateSpecificationsMutation.isPending ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                      Sauvegarde...
                    </span>
                  ) : "Enregistrer les modifications"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductSpecifications;
