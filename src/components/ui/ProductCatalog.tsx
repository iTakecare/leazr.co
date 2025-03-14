
import React from "react";

// This is a stub component to fix build errors
interface ProductCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: any) => void;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({ isOpen, onClose, onSelectProduct }) => {
  return <div>Product Catalog Placeholder</div>;
};

export default ProductCatalog;
