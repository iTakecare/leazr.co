
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProductById } from "@/services/catalogService";
import Container from "@/components/layout/Container";
import ProductEditor from "@/components/catalog/ProductEditor";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface ProductCreationPageProps {
  isEditing?: boolean;
}

const ProductCreationPage: React.FC<ProductCreationPageProps> = ({ isEditing = false }) => {
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Fetch product if in editing mode
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id || ""),
    enabled: isEditing && !!id,
  });
  
  const handleGoBack = () => {
    navigate("/catalog");
  };
  
  const handleProductSaved = () => {
    setIsEditorOpen(false);
    setTimeout(() => {
      navigate("/catalog");
    }, 500);
  };

  return (
    <Container>
      <div className="py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={handleGoBack} className="mr-2">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Retour au catalogue
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Modifier le produit" : "Créer un nouveau produit"}
          </h1>
        </div>
        
        {isEditing && isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <ProductEditor 
            isOpen={isEditorOpen}
            onClose={() => navigate("/catalog")}
            onSuccess={handleProductSaved}
            product={isEditing ? product : undefined}
            isEditing={isEditing}
          />
        )}
      </div>
    </Container>
  );
};

export default ProductCreationPage;
