
import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProductById } from "@/services/catalogService";
import Container from "@/components/layout/Container";
import ProductEditor from "@/components/catalog/ProductEditor";

interface ProductCreationPageProps {
  isEditing?: boolean;
}

const ProductCreationPage: React.FC<ProductCreationPageProps> = ({ isEditing = false }) => {
  const { id } = useParams();
  
  // Fetch product if in editing mode
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id || ""),
    enabled: isEditing && !!id,
  });
  
  return (
    <Container>
      {isEditing && isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <ProductEditor 
          product={isEditing ? product : undefined}
          isEditing={isEditing}
        />
      )}
    </Container>
  );
};

export default ProductCreationPage;
