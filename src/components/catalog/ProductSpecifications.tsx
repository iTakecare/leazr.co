import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProduct } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Save } from "lucide-react";

interface ProductSpecificationsProps {
  product: Product;
  onSpecificationChange?: (key: string, value: string | number | boolean) => void;
  specifications: Record<string, string | number | boolean>;
  readOnly?: boolean;
}

const ProductSpecifications: React.FC<ProductSpecificationsProps> = ({
  product,
  onSpecificationChange,
  specifications,
  readOnly = false,
}) => {
  const queryClient = useQueryClient();
  
  const updateProductMutation = useMutation({
    mutationFn: (specs: Record<string, string | number | boolean>) => {
      // Ensure we're passing the product ID and the specifications separately
      return updateProduct(product.id, { specifications: specs });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      toast.success("Specifications updated successfully");
    },
    onError: (error) => {
      console.error("Error updating specifications:", error);
      toast.error("Error updating specifications");
    },
  });
  
  const handleSpecificationChange = (
    key: string,
    value: string | number | boolean
  ) => {
    onSpecificationChange?.(key, value);
  };

  const handleAddSpecification = () => {
    // Implement logic to add a new specification
  };

  const handleRemoveSpecification = (key: string) => {
    // Implement logic to remove a specification
  };

  const handleSaveSpecifications = async () => {
    try {
      await updateProductMutation.mutateAsync(specifications);
    } catch (error) {
      console.error("Error saving specifications:", error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Spécifications</h3>
      {Object.entries(specifications).map(([key, value]) => (
        <div key={key} className="flex items-center space-x-4">
          <Label htmlFor={`spec-${key}`}>{key}</Label>
          <Input
            type="text"
            id={`spec-${key}`}
            value={String(value)}
            onChange={(e) =>
              handleSpecificationChange(key, e.target.value)
            }
            disabled={readOnly}
          />
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveSpecification(key)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {!readOnly && (
        <div className="flex items-center space-x-4">
          <Button type="button" variant="ghost" onClick={handleAddSpecification}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une spécification
          </Button>
        </div>
      )}
      {!readOnly && (
        <Button onClick={handleSaveSpecifications}>
          <Save className="h-4 w-4 mr-2" />
          Enregistrer les spécifications
        </Button>
      )}
    </div>
  );
};

export default ProductSpecifications;
